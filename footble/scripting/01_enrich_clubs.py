#!/usr/bin/env -S uv --quiet run --script
import json
from collections import defaultdict
from tqdm import tqdm


TOP_LEAGUES = {
    "Ligue 1": 3,
    "Premier League": 5,
    "Bundesliga": 3,
    "Serie A": 4,
    "LaLiga": 3,
}


def enrich_clubs_with_performance():
    # read all seasons from all clubs and count the number of times they finished in the top 4 of a top league
    with open("./data/team_seasons.json", "r") as file:
        team_seasons = json.load(file)
    clubs_performance = defaultdict(
        lambda: {"top_league_count": 0, "top_ranked_count": 0}
    )
    for team_season in tqdm(team_seasons, desc="Retrieving club performance"):
        # Skip seasons before 1990
        if int(team_season["season_id"]) < 1990:
            continue
        # Count top league appearances
        elif team_season["competition_name"] in TOP_LEAGUES:
            clubs_performance[team_season["club_id"]]["top_league_count"] += 1
            # Count top ranked appearances
            if (
                int(team_season["season_rank"])
                <= TOP_LEAGUES[team_season["competition_name"]]
            ):
                clubs_performance[team_season["club_id"]]["top_ranked_count"] += 1

    with open("./data/clubs.json", "r") as file:
        original_clubs = json.load(file)
    enriched_clubs = []
    for club in tqdm(original_clubs, desc="Enriching clubs with performance"):
        top_league_count = clubs_performance[club["club_id"]]["top_league_count"]
        top_ranked_count = clubs_performance[club["club_id"]]["top_ranked_count"]
        top_ranked_rate = (
            f"{top_ranked_count / top_league_count * 100:.2f}"
            if top_league_count > 0
            else "0.00"
        )
        enriched_clubs.append(
            {
                **club,
                "top_league_count": top_league_count,
                "top_ranked_count": top_ranked_count,
                "top_ranked_rate": top_ranked_rate,
            }
        )

    with open("./data/clubs.json", "w") as file:
        json.dump(enriched_clubs, file, indent=4)


def enrich_clubs_with_parent_club():
    with open("./data/parent_club_map.json", "r") as file:
        parent_club_map = json.load(file)

    with open("./data/clubs.json", "r") as file:
        original_clubs = json.load(file)

    enriched_clubs = []
    for club in tqdm(original_clubs, desc="Enriching clubs with parent club"):
        enriched_club = {**club, "parent_club_id": parent_club_map[club["club_id"]]}
        enriched_clubs.append(enriched_club)

    with open("./data/clubs.json", "w") as file:
        json.dump(enriched_clubs, file, indent=4)


if __name__ == "__main__":
    enrich_clubs_with_performance()
    enrich_clubs_with_parent_club()
