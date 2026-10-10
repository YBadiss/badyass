#!/usr/bin/env python3
"""List free LE FIVE pitches for given centers, dates and start times.

Uses the same public API as https://www.lefive.fr/reservations/slots (no login needed).

Examples:
  python3 lefive_slots.py --list-centers
  python3 lefive_slots.py -c 69 63 "paris 13" -d 2026-10-09 -t 19:00 20:00 21:00
  python3 lefive_slots.py -c 69 -d 2026-10-09 2026-10-10 -t 19:00 -u 60 90 --csv out.csv
"""
import argparse
import csv
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

API = "https://api2-front.lefive.fr"
CENTERS_URL = "https://www.lefive.fr/content/centers.json"
TZ = ZoneInfo("Europe/Paris")
HEADERS = {"User-Agent": "Mozilla/5.0", "Origin": "https://www.lefive.fr", "Content-Type": "application/json"}


def http(url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def load_centers():
    return [c for c in http(CENTERS_URL)["centers"] if c.get("isActive")]


def resolve_centers(all_centers, wanted):
    out = []
    for w in wanted:
        if w.isdigit():
            match = [c for c in all_centers if c["id"] == int(w)]
        else:
            match = [c for c in all_centers if w.lower() in c["centerName"].lower()]
        if not match:
            sys.exit(f"No center matches {w!r} (use --list-centers)")
        out += [c for c in match if c not in out]
    return out


def fetch_slots(center_id, start_utc, end_utc, durations, capacity, sport_type):
    body = {
        "startingDateZuluTime": start_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "endingDateZuluTime": end_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "durations": ",".join(map(str, durations)),
        "capacity": capacity,
        "center_id": center_id,
        "bookingType_id": "1",
        "sportType_id": str(sport_type),
        "isChannelWeb": True,
        "computePriceWithDefaultCapaIfNoCapa": True,
    }
    return http(f"{API}/bookingrules/allFields?appId=1&isChannelWeb=true", body)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("-c", "--centers", nargs="+", help="center ids or name substrings")
    p.add_argument("-d", "--dates", nargs="+", help="YYYY-MM-DD (default: today)")
    p.add_argument("-t", "--times", nargs="+", help="local start times HH:MM (default: all)")
    p.add_argument("-u", "--durations", nargs="+", type=int, default=[60, 90, 120], help="minutes")
    p.add_argument("--capacity", type=int, default=10, help="players: 10 (5v5) or 8 etc.")
    p.add_argument("--sport", type=int, default=1, help="sportType id (1 = football)")
    p.add_argument("--csv", help="also write results to this CSV file")
    p.add_argument("--json", action="store_true", help="print JSON instead of a table")
    p.add_argument("--list-centers", action="store_true")
    a = p.parse_args()

    all_centers = load_centers()
    if a.list_centers:
        for c in sorted(all_centers, key=lambda c: c["centerName"]):
            print(f'{c["id"]:>4}  {c["centerName"]:<35} {c["address"]["city"]}')
        return
    if not a.centers:
        p.error("--centers is required (or use --list-centers)")

    centers = resolve_centers(all_centers, a.centers)
    dates = a.dates or [datetime.now(TZ).strftime("%Y-%m-%d")]
    wanted_times = set(a.times) if a.times else None

    jobs = []
    for c in centers:
        for d in dates:
            day = datetime.strptime(d, "%Y-%m-%d").replace(tzinfo=TZ)
            if wanted_times:
                ts = sorted(datetime.strptime(t, "%H:%M").time() for t in wanted_times)
                start = datetime.combine(day.date(), ts[0], TZ)
                end = datetime.combine(day.date(), ts[-1], TZ) + timedelta(minutes=1)
            else:
                start, end = day, day + timedelta(days=1)
            jobs.append((c, start.astimezone(timezone.utc), end.astimezone(timezone.utc)))

    with ThreadPoolExecutor(8) as ex:
        responses = list(ex.map(lambda j: fetch_slots(j[0]["id"], j[1], j[2], a.durations, a.capacity, a.sport), jobs))

    rows = []
    for (c, _, _), slots in zip(jobs, responses):
        for s in slots:
            local = datetime.fromisoformat(s["startingDateZuluTime"]).astimezone(TZ)
            hhmm = local.strftime("%H:%M")
            if wanted_times and hhmm not in wanted_times:
                continue
            for f in s["fields"]:
                rows.append({
                    "center_id": c["id"],
                    "center": c["centerName"],
                    "date": local.strftime("%Y-%m-%d"),
                    "time": hhmm,
                    "duration": s["duration"],
                    "field": f["name"],
                    "field_type": (f.get("fieldType") or {}).get("name", ""),
                    "price": f.get("webPrice"),
                    "price_per_player": f.get("participationWebPrice"),
                })
    rows.sort(key=lambda r: (r["center"], r["date"], r["time"], r["duration"], r["field"]))

    if a.csv:
        with open(a.csv, "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0]) if rows else ["center"])
            w.writeheader()
            w.writerows(rows)
    if a.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return
    if not rows:
        print("No free slots found.")
        return
    cols = ["center", "date", "time", "duration", "field", "field_type", "price"]
    widths = {k: max(len(k), *(len(str(r[k])) for r in rows)) for k in cols}
    print("  ".join(k.ljust(widths[k]) for k in cols))
    print("  ".join("-" * widths[k] for k in cols))
    for r in rows:
        print("  ".join(str(r[k]).ljust(widths[k]) for k in cols))
    print(f"\n{len(rows)} free pitch/slot combinations")


if __name__ == "__main__":
    main()
