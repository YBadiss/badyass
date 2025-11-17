#!/usr/bin/env -S uv --quiet run --script
import json
from collections import defaultdict


def make_player_dict(player: dict) -> dict:
    return {
        "id": player["player_id"],
        "slug": player["player_slug"],
        "name": player["player_name"],
        "image": player["player_image_url"].split("/")[-1]
        if player["player_image_url"].split("/")[-1] != "default.jpg"
        else None,
        "citizenship": player["citizenship"],
        "position": player["position"],
        "date_of_birth": player["date_of_birth"],
        "club_ids": player["club_ids"]
    }


def write_players_json():
    with open("./data/players.json", "r") as file:
        players = json.load(file)

    with open("../public/players.json", "w") as file:
        json.dump(
            [
                make_player_dict(player)
                for player in players
                if (
                    player["top_league_transfers"] >= 1
                    and player["top_ranked_transfers"] >= 1
                    and float(player["max_value_at_transfer"]) >= 1_000_000
                )
            ],
            file
        )


def write_top_players_json():
    with open("./data/top_players.json", "r") as file:
        top_players = json.load(file)

    top_players = [
        make_player_dict(player)
        for player in top_players
    ]
    with open("../public/top_players.json", "w") as file:
        json.dump(top_players, file)


def make_club_dict(club: dict, players: list[int]) -> dict:
    return {
        "id": club["club_id"],
        "name": club["club_name"],
        "players": players
    }


def write_clubs_json():
    with open("./data/players.json", "r") as file:
        players = json.load(file)

    club_to_players = defaultdict(list)
    for player in players:
        for club_id in player["club_ids"]:
            if (
                player["top_league_transfers"] >= 1
                and player["top_ranked_transfers"] >= 1
                and float(player["max_value_at_transfer"]) >= 1_000_000
            ):
                club_to_players[club_id].append(player["player_id"])

    with open("./data/clubs.json", "r") as file:
        clubs = json.load(file)
    with open("../public/clubs.json", "w") as file:
        json.dump(
            [
                make_club_dict(club, club_to_players[club["club_id"]])
                for club in clubs
                if club["parent_club_id"] == club["club_id"] and club["top_league_count"] >= 1
            ],
            file,
        )


if __name__ == "__main__":
    write_players_json()
    write_top_players_json()
    write_clubs_json()