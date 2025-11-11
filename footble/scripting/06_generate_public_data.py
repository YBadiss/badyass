#!/usr/bin/env -S uv --quiet run --script
import json


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
                    and float(player["max_value_at_transfer"]) >= 10_000_000
                )
            ],
            file,
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

    # used_player_ids = set()
    # top_players_easy = [
    #     make_player_dict(player)
    #     for player in players
    #     if (
    #         player["top_league_transfers"] >= 1
    #         and player["top_ranked_transfers"] >= 1
    #         and float(player["max_value_at_transfer"]) >= 50_000_000
    #     )
    # ]
    # used_player_ids.update(player["id"] for player in top_players_easy)
    # with open("../public/top_players_easy.json", "w") as file:
    #     json.dump(top_players_easy, file)

    # top_players_medium = [
    #     make_player_dict(player)
    #     for player in players
    #     if (
    #         player["player_id"] not in used_player_ids
    #         and player["top_league_transfers"] >= 1
    #         and player["top_ranked_transfers"] >= 1
    #         and float(player["max_value_at_transfer"]) >= 20_000_000
    #     )
    # ]
    # used_player_ids.update(player["id"] for player in top_players_medium)
    # with open("../public/top_players_medium.json", "w") as file:
    #     json.dump(top_players_medium, file)

    # top_players_hard = [
    #     make_player_dict(player)
    #     for player in players
    #     if (
    #         player["player_id"] not in used_player_ids
    #         and player["top_league_transfers"] >= 1
    #         and player["top_ranked_transfers"] >= 1
    #         and float(player["max_value_at_transfer"]) >= 20_000_000
    #     )
    # ]
    # used_player_ids.update(player["id"] for player in top_players_hard)
    # with open("../public/top_players_hard.json", "w") as file:
    #     json.dump(top_players_hard, file)


if __name__ == "__main__":
    write_players_json()
    write_top_players_json()
