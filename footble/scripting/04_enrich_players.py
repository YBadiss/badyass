#!/usr/bin/env -S uv --quiet run --script
import json
import csv
from tqdm import tqdm
from datetime import datetime
from collections import defaultdict


def enrich_players_with_transfers_info():
    # read all transfers and count the number of top league transfers for each player
    with open("./data/reduced_transfers.json", "r") as file:
        reduced_transfers = json.load(file)

    transfers_info = defaultdict(
        lambda: {
            "top_league_transfers": 0,
            "top_ranked_transfers": 0,
            "number_of_different_top_clubs": 0,
            "total_transfers": 0,
            "max_value_at_transfer": 0,
            "career_start_date": None,
            "transfer_list": [],
        }
    )
    for player_id in tqdm(reduced_transfers, desc="Computing transfers info"):
        transfers = reduced_transfers[player_id]
        different_top_clubs = set()
        for transfer in transfers:
            transfers_info[transfer["player_id"]]["transfer_list"].append(transfer)
            if transfer["is_existing_clubs"] is True:
                transfers_info[transfer["player_id"]]["total_transfers"] += 1
            if transfer["is_top_league_transfer"] is True:
                transfers_info[transfer["player_id"]]["top_league_transfers"] += 1
            if transfer["is_top_ranked_transfer"] is True:
                transfers_info[transfer["player_id"]]["top_ranked_transfers"] += 1
                if transfer["to_team_id"] not in different_top_clubs:
                    transfers_info[transfer["player_id"]]["number_of_different_top_clubs"] += 1
            transfers_info[transfer["player_id"]]["max_value_at_transfer"] = max(
                transfers_info[transfer["player_id"]]["max_value_at_transfer"],
                float(transfer["value_at_transfer"]),
            )
            transfer_date = (
                datetime.strptime(transfer["transfer_date"], "%Y-%m-%d")
                if transfer["transfer_date"]
                else None
            )
            if transfer_date and (
                transfers_info[transfer["player_id"]]["career_start_date"] is None
                or transfer_date
                < transfers_info[transfer["player_id"]]["career_start_date"]
            ):
                transfers_info[transfer["player_id"]]["career_start_date"] = (
                    transfer_date
                )
            different_top_clubs.add(transfer["to_team_id"])


    # read the players csv and add the transfers info to the players. need to read manually because the file is too big to fit in memory
    with open("./data/players.json", "r") as file:
        original_players = json.load(file)

    enriched_players = []
    for player in tqdm(original_players, desc="Enriching players with transfers info"):
        top_league_transfers = transfers_info[player["player_id"]][
            "top_league_transfers"
        ]
        top_ranked_transfers = transfers_info[player["player_id"]][
            "top_ranked_transfers"
        ]
        number_of_different_top_clubs = transfers_info[player["player_id"]][
            "number_of_different_top_clubs"
        ]
        total_transfers = transfers_info[player["player_id"]]["total_transfers"]
        top_league_transfer_rate = (
            f"{top_league_transfers / total_transfers * 100:.2f}"
            if total_transfers > 0
            else "0.00"
        )
        top_ranked_transfer_rate = (
            f"{top_ranked_transfers / total_transfers * 100:.2f}"
            if total_transfers > 0
            else "0.00"
        )
        max_value_at_transfer = (
            f'{transfers_info[player['player_id']]["max_value_at_transfer"]:.2f}'
        )
        career_start_date = (
            datetime.strftime(
                transfers_info[player["player_id"]]["career_start_date"], "%Y-%m-%d"
            )
            if transfers_info[player["player_id"]]["career_start_date"]
            else ""
        )
        # compute list of clubs the player has played for
        if transfers_info[player["player_id"]]["transfer_list"]:
            club_ids = [
                transfer["from_team_id"]
                for transfer in transfers_info[player["player_id"]]["transfer_list"]
            ]
            club_ids.append(
                transfers_info[player["player_id"]]["transfer_list"][-1]["to_team_id"]
            )
        else:
            club_ids = []
        enriched_players.append(
            {
                **player,
                "player_name": player["player_name"].split("(")[0].strip(),
                "top_league_transfers": top_league_transfers,
                "top_ranked_transfers": top_ranked_transfers,
                "total_transfers": total_transfers,
                "top_league_transfer_rate": top_league_transfer_rate,
                "top_ranked_transfer_rate": top_ranked_transfer_rate,
                "number_of_different_top_clubs": number_of_different_top_clubs,
                "max_value_at_transfer": max_value_at_transfer,
                "career_start_date": career_start_date,
                "club_ids": club_ids
            }
        )

    with open("./data/players.json", "w") as file:
        json.dump(enriched_players, file, indent=4)


def enrich_players_citizenships():
    REGION_MAP = {
        "Bonaire": "Netherlands",
        "Puerto Rico": "United States",
        "Guam": "United States",
        "Saint-Martin": "France",
        "Cookinseln": "New Zealand",
        "French Guiana": "France",
        "American Virgin Islands": "United States",
        "England": "United Kingdom",
        "Scotland": "United Kingdom",
        "Wales": "United Kingdom",
        "Northern Ireland": "United Kingdom",
        "Greenland": "Denmark",
        "Faroe Islands": "Denmark",
        "Tahiti": "France",
        "Chinese Taipei": "Taiwan",
        "Aruba": "Netherlands",
        "Hongkong": "China",
        "Guernsey": "United Kingdom",
        "Jersey": "United Kingdom",
        "Isle of Man": "United Kingdom",
        "Sint Maarten": "Netherlands",
        "Réunion": "France",
        "British Virgin Islands": "United Kingdom",
        "Martinique": "France",
        "Macao": "China",
        "Guadeloupe": "France",
        "Mayotte": "France",
        "Falkland Islands": "United Kingdom",
        "Montserrat": "United Kingdom",
        "Turks- and Caicosinseln": "United Kingdom",
        "Neukaledonien": "France",
        "Curacao": "Netherlands",
        "Bermuda": "United Kingdom",
        "Gibraltar": "United Kingdom",
        "Bosnia-Herzegovina": "Bosnia and Herzegovina"
    }
    def clean_country(country: str) -> str:
        if country in REGION_MAP:
            return REGION_MAP[country]
        return country.replace("St.", "Saint").replace("&", "and")

    country_codes = {}
    with open("./data/country_codes.csv", "r") as file:
        reader = csv.DictReader(file)
        for row in reader:
            country_codes[row["country"]] = row["alpha2"]

    with open("./data/players.json", "r") as file:
        original_players = json.load(file)

    for player in original_players:
        clean_countries = {
            clean_country(citizenship["country"])
            for citizenship in player["citizenship"]
            if citizenship["country"] and citizenship["country"] != "N/A"
        }
        player["citizenship"] = [
            {"country": country, "alpha2": country_codes.get(country)}
            for country in clean_countries
        ]

    with open("./data/players.json", "w") as file:
        json.dump(original_players, file, indent=4)


if __name__ == "__main__":
    enrich_players_with_transfers_info()
    enrich_players_citizenships()
