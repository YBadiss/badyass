#!/usr/bin/env -S uv --quiet run --script
import json
from tqdm import tqdm


def enrich_transfers_with_club_performance():
    with open('./data/clubs.json', 'r') as file:
        clubs = json.load(file)
    all_clubs = {club['club_id'] for club in clubs}
    top_league_clubs = {club['club_id'] for club in clubs if club['top_league_count'] > 0}
    top_ranked_clubs = {club['club_id'] for club in clubs if float(club['top_ranked_rate']) >= 10.0 and int(club['top_league_count']) >= 10}

    # read all transfers and mark the ones that are to or from a top league club, and to or from a top ranked club
    with open('./data/transfers.json', 'r') as file:
        original_transfers = json.load(file)

    enriched_transfers = []
    for transfer in tqdm(original_transfers, desc='Enriching transfers with club performance'):
        is_existing_clubs = transfer['to_team_id'] in all_clubs
        is_top_league_transfer = transfer['to_team_id'] in top_league_clubs
        is_top_ranked_transfer = transfer['to_team_id'] in top_ranked_clubs
        enriched_transfers.append({
            **transfer,
            'is_existing_clubs': is_existing_clubs,
            'is_top_league_transfer': is_top_league_transfer,
            'is_top_ranked_transfer': is_top_ranked_transfer
        })

    with open('./data/transfers.json', 'w') as file:
        json.dump(enriched_transfers, file, indent=4)


if __name__ == "__main__":
    enrich_transfers_with_club_performance()
