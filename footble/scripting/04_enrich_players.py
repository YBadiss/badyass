#!/usr/bin/env -S uv --quiet run --script
import json
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
            "total_transfers": 0,
            "max_value_at_transfer": 0,
            "career_start_date": None,
            "transfer_list": [],
        }
    )
    for player_id in tqdm(reduced_transfers, desc="Computing transfers info"):
        transfers = reduced_transfers[player_id]
        for transfer in transfers:
            transfers_info[transfer["player_id"]]["transfer_list"].append(transfer)
            if transfer["is_existing_clubs"] is True:
                transfers_info[transfer["player_id"]]["total_transfers"] += 1
            if transfer["is_top_league_transfer"] is True:
                transfers_info[transfer["player_id"]]["top_league_transfers"] += 1
            if transfer["is_top_ranked_transfer"] is True:
                transfers_info[transfer["player_id"]]["top_ranked_transfers"] += 1
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
                "top_league_transfers": top_league_transfers,
                "top_ranked_transfers": top_ranked_transfers,
                "total_transfers": total_transfers,
                "top_league_transfer_rate": top_league_transfer_rate,
                "top_ranked_transfer_rate": top_ranked_transfer_rate,
                "max_value_at_transfer": max_value_at_transfer,
                "career_start_date": career_start_date,
                "club_ids": club_ids,
            }
        )

    with open("./data/players.json", "w") as file:
        json.dump(enriched_players, file, indent=4)


if __name__ == "__main__":
    enrich_players_with_transfers_info()
