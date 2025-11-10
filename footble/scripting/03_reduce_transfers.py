#!/usr/bin/env -S uv --quiet run --script
import json
from tqdm import tqdm
from collections import defaultdict
from datetime import datetime


def reduce_transfers():
    with open('./data/clubs.json', 'r') as file:
        clubs = json.load(file)
    all_clubs = {club['club_id'] for club in clubs}
    club_parent_map = {club['club_id']: club['parent_club_id'] for club in clubs}

    # read all transfers and mark the ones that are to or from a top league club, and to or from a top ranked club
    with open('./data/transfers.json', 'r') as file:
        original_transfers = json.load(file)

    transfers_by_player = defaultdict(list)
    for transfer in tqdm(original_transfers, desc='Grouping transfers by player'):
        transfers_by_player[transfer['player_id']].append(transfer)
    
    cleaned_transfers = {}
    for player_id in tqdm(transfers_by_player, desc='Cleaning transfers for each player'):
        player_transfers = transfers_by_player[player_id]
        if any(not t['transfer_date'] for t in player_transfers):
            print(f'Player {player_id} has a transfer with no date')
            continue
        # sort the transfers by transfer date
        sorted_transfers = sorted(player_transfers, key=lambda x: datetime.strptime(x['transfer_date'], '%Y-%m-%d'))

        # replace club ids with parent club ids
        for transfer in sorted_transfers:
            transfer['to_team_id'] = club_parent_map.get(transfer['to_team_id'])
            transfer['from_team_id'] = club_parent_map.get(transfer['from_team_id'])

        # remove transfers to unknown clubs and between two of the same club
        valid_transfers = []
        last_valid_team_id = None
        for transfer in sorted_transfers:
            # only consider transfers between two different clubs
            if transfer['from_team_id'] != transfer['to_team_id']:
                # transfer from a valid club to a valid club, add it to the list
                if transfer['from_team_id'] in all_clubs and transfer['to_team_id'] in all_clubs:
                    valid_transfers.append(transfer)
                # transfer to a valid club, add it to the list with the last valid team id as the from team id
                elif last_valid_team_id and transfer['to_team_id'] in all_clubs:
                    valid_transfers.append({
                        **transfer,
                        'from_team_id': last_valid_team_id
                    })
            # update the last valid team id to the latest valid team id, if any in the transfer
            if transfer['to_team_id'] in all_clubs:
                last_valid_team_id = transfer['to_team_id']
            elif transfer['from_team_id'] in all_clubs:
                last_valid_team_id = transfer['from_team_id']
        
        cleaned_transfers[player_id] = valid_transfers

    with open('./data/reduced_transfers.json', 'w') as file:
        json.dump(cleaned_transfers, file, indent=4)


if __name__ == "__main__":
    reduce_transfers()
