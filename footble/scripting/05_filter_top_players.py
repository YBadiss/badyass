#!/usr/bin/env -S uv --quiet run --script
import json
from datetime import datetime
from tqdm import tqdm


def filter_top_players():
    with open("./data/players.json", "r") as file:
        players = json.load(file)

    top_players = []
    for player in tqdm(players, desc="Filtering top players"):
        if (
            # - a top league transfer rate above 80%
            float(player["top_league_transfer_rate"]) > 80
            # - a max value at transfer above 10 million
            and float(player["max_value_at_transfer"]) >= 15000000
            # - a total transfers above 4
            and int(player["total_transfers"]) >= 4
            # - a first season name after 1998
            and datetime.strptime(player["career_start_date"], "%Y-%m-%d")
            >= datetime(1998, 1, 1)
            # - a top ranked transfers of at least 2
            and int(player["top_ranked_transfers"]) >= 2
            # - a top ranked transfers rate of at least 25%
            and float(player["top_ranked_transfer_rate"]) >= 25
        ):
            top_players.append(player)

    with open("./data/top_players.json", "w") as file:
        json.dump(top_players, file, indent=4)


if __name__ == "__main__":
    filter_top_players()
