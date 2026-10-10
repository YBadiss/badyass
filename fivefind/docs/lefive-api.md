# lefive-slots

A command-line tool that lists **free 5-a-side pitches** at [LE FIVE](https://www.lefive.fr) centres for chosen centres, dates, start times and durations. It uses the same public API as the website's booking page (`/reservations/slots`), so **no login is needed**.

Requires Python 3.9+ and only the standard library (no `pip install`).

## Usage

```bash
# List all active centres and their IDs
python3 lefive_slots.py --list-centers

# Several centres (ID or part of the name), several dates and start times (Paris time)
python3 lefive_slots.py -c 69 63 "paris 13" -d 2026-10-09 2026-10-10 -t 19:00 20:00 21:00

# Only 1h and 1h30 slots, also written to a CSV
python3 lefive_slots.py -c 69 -d 2026-10-09 -t 19:00 -u 60 90 --csv slots.csv

# Every start time that day, as JSON
python3 lefive_slots.py -c 69 -d 2026-10-09 --json
```

| Option | Meaning | Default |
|---|---|---|
| `-c / --centers` | Centre IDs or case-insensitive name substrings (`"paris"` matches all Paris centres) | required |
| `-d / --dates` | One or more dates, `YYYY-MM-DD` | today |
| `-t / --times` | Start times in local (Europe/Paris) time, `HH:MM`, on the :00 / :30 grid | all start times |
| `-u / --durations` | Durations in minutes | `60 90 120` |
| `--capacity` | Number of players | `10` (5v5) |
| `--sport` | `sportType_id` | `1` (football) |
| `--csv FILE` | Also write the results to a CSV file | – |
| `--json` | Print JSON instead of a table | – |
| `--list-centers` | Print centre IDs and names, then exit | – |

Example output:

```
center            date        time   duration  field              field_type  price
----------------  ----------  -----  --------  -----------------  ----------  -----
LE FIVE Paris 18  2026-10-09  19:00  60        Terrain Betclic    Intérieur   150.0
LE FIVE Paris 18  2026-10-09  19:00  60        Terrain ZFC        Intérieur   150.0
LE FIVE Paris 18  2026-10-09  21:00  60        Terrain NIVEA MEN  Intérieur   150.0
```

The CSV and JSON outputs also include `center_id` and `price_per_player`.

### How the script works

1. It downloads the list of centres and matches your `-c` values against it by ID or by name.
2. For each (centre, date) pair it sends **one** API request. The time window runs from the earliest to the latest requested start time, or covers the whole day if you didn't pass `-t`. Up to 8 requests run in parallel.
3. It converts each slot's UTC start time to Europe/Paris time and keeps only the start times you asked for.
4. It turns every free pitch in every slot into one row of output.

---

## How the LE FIVE API works

These notes come from reading the website's JavaScript (a Nuxt 2 / Vue app, bundles under `https://www.lefive.fr/_nuxt/*.js`). The API is **undocumented and unofficial**, so it may change without notice.

- **API base URL:** `https://api2-front.lefive.fr` (the site's `API_V2` config value)
- **Static content:** `https://www.lefive.fr/content/*.json`

The site sends an `Origin: https://www.lefive.fr` header and a browser User-Agent; the script does the same.

### 1. List of centres: `GET https://www.lefive.fr/content/centers.json`

No authentication. The response looks like `{"centers": [ ... ]}`. Useful fields on each centre:

| Field | Notes |
|---|---|
| `id` | The centre ID used everywhere else (e.g. `69` = Paris 18; the website URL `?center=69` uses it too) |
| `centerName` | e.g. `"LE FIVE Paris 18"` |
| `isActive`, `bookingWebAvailable` | Whether the centre is active and can be booked online |
| `address.city`, `latitude`, `longitude`, `timeZone` | Location (`timeZone` is `Europe/Paris`, except the La Réunion centre) |
| `openingHours[]` | `dayweek`, `openingTime`, `closingTime` |
| `center_sportTypes[]` | Sports offered; `sportType.id = 1` is football, and `calendarSlot: 30` means start times every 30 min |
| `center_fields[]` | The centre's pitches |

There were 31 active centres as of October 2026.

### 2. Availability: `POST https://api2-front.lefive.fr/bookingrules/allFields?appId=1&isChannelWeb=true`

**No authentication needed.** This is the call behind the website's slot grid (helper function in chunk `defd5c4.js`, called from the `reservations-slots` page).

Request body (JSON):

```json
{
  "startingDateZuluTime": "2026-10-09T16:00:00.000Z",
  "endingDateZuluTime":   "2026-10-09T21:00:00.000Z",
  "durations": "60,90,120",
  "capacity": 10,
  "center_id": 69,
  "bookingType_id": "1",
  "sportType_id": "1",
  "isChannelWeb": true,
  "computePriceWithDefaultCapaIfNoCapa": true
}
```

| Field | Notes |
|---|---|
| `startingDateZuluTime` / `endingDateZuluTime` | The search window in **UTC**. The response includes every start time in the window, on the centre's 30-minute grid. |
| `durations` | Comma-separated list of durations in minutes |
| `capacity` | Number of players. The website sends `10`, or `6` when `sportType_id` is `17`. |
| `center_id` | ID from `centers.json` |
| `sportType_id` | `"1"` = football |
| `bookingType_id` | `"1"` = a standard pitch booking |

The response is an array with **one entry per (start time × duration)**:

```json
{
  "startingDate":         "2026-10-09T18:00:00.000+00:00",
  "startingDateZuluTime": "2026-10-09T16:00:00.000+00:00",
  "endingDateZuluTime":   "2026-10-09T17:00:00.000+00:00",
  "duration": 60,
  "fields": [ { ...a free pitch... }, ... ]
}
```

- An empty `fields` array means **nothing is free** for that start time and duration.
- ⚠️ `startingDate` / `endingDate` hold the **local** time but are wrongly labelled `+00:00`. Use the `*ZuluTime` fields, which are real UTC, and convert them to the centre's `timeZone`.

Useful fields on each entry in `fields`:

| Field | Notes |
|---|---|
| `id`, `name` | Pitch ID and name (e.g. `481`, `"Terrain ZFC"`). The pitch ID is needed to book. |
| `fieldType.name` | `"Intérieur"` (indoor) or `"Extérieur"` (outdoor) |
| `webPrice` | Price of the whole booking when booked online, in EUR |
| `participationWebPrice` | Price per player |
| `centerPrice`, `participationCenterPrice` | The same prices when paying at the centre |
| `discountedPrices[]` | Discounted prices, e.g. under-26s or FFF licence holders |
| `canBookOnline`, `isFilmed`, `capacities[]` | Whether the pitch can be booked online, whether it is filmed, and its capacities |

A full example entry is in `examples/allFields_response_item.json`.

### 3. Other endpoints seen in the website code (not used by the script)

| Endpoint | Purpose | Login? |
|---|---|---|
| `GET /genericHourTimeslots` | Generic hour bands per weekday | – |
| `POST /bookings/public` | Open public matches you can join (`center_id`, `startingDate`, `endingDate`, levels, distance…) | no |
| `PUT /bookings?appId=1&isChannelWeb=true` | **Creates a booking.** Body includes `startingDate`, `endingDate`, `duration`, `capacity`, `price`, `center.id`, `field.id` (pitch ID), `owner.id`, `paymentMethod.id`, etc. | yes |
| `POST /bookings/{id}` | Cancel or update a booking | yes |
| `POST /users/me/bookings` | Your own bookings | yes |
| `GET /users/me?appId=1` | Your account | yes |
| `GET /competitions?center={id}&type=1` | Leagues and tournaments at a centre | – |

Calls marked "yes" need the logged-in user's token. Automating bookings would mean capturing that token from a logged-in browser session (DevTools → Network → the `Authorization` header on any `api2-front` call). We haven't done that or tested it.

## Limitations

- Lists availability only; it does not book.
- Tested with football (`sportType_id=1`) and 10 players only.
- Uses an unofficial API, so field names and endpoints can change at any time. If the script breaks, open the booking page with DevTools → Network and look for the `allFields` request.
- Be polite: the script sends one request per (centre, date). Don't run it in a tight loop.
