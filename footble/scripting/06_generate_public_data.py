#!/usr/bin/env -S uv --quiet run --script
import json


def write_players_json(file_name: str):
    with open(f'./data/{file_name}.json', 'r') as file:
        players = json.load(file)
    
    with open(f'../public/{file_name}.json', 'w') as file:
        json.dump(
            [{
                'id': player['player_id'],
                'slug': player['player_slug'],
                'name': player['player_name'],
                'image': player['player_image_url'].split('/')[-1] if player['player_image_url'].split('/')[-1] != 'default.jpg' else None,
                'club_ids': player['club_ids']
            } for player in players
            if (
                player['top_league_transfers'] >= 1
                and player['top_ranked_transfers'] >= 1
                and float(player['max_value_at_transfer']) >= 10000000
            )],
            file
        )


if __name__ == "__main__":
    write_players_json('players')
    write_players_json('top_players')