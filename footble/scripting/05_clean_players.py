#!/usr/bin/env -S uv --quiet run --script
import json
from tqdm import tqdm


def clean_player_name(player_name: str) -> str:
    return player_name.split("(")[0].strip()


def clean_players():
    with open("./data/players.json", "r") as file:
        players = json.load(file)

    players = [
        {
            **player,
            "player_name": clean_player_name(player["player_name"]),
        }
        for player in tqdm(players, desc="Cleaning players")
    ]

    with open("./data/players.json", "w") as file:
        json.dump(players, file, indent=4)


if __name__ == "__main__":
    clean_players()
