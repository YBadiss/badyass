#!/usr/bin/env -S uv --quiet run --script
# from PIL import Image, ImageChops
# import requests
# from tqdm import tqdm

# from io import BytesIO
# import json
# from collections import defaultdict


# def get_image(club_id: str) -> Image:
#     try:
#         response = requests.get(
#             f"https://tmssl.akamaized.net//images/wappen/head/{club_id}.png"
#         )
#         return Image.open(BytesIO(response.content)).convert("RGB")
#     except Exception as e:
#         print(f"Error getting image for club {club_id}: {e}")
#         return None


# def get_difference(logo1: Image, logo2: Image) -> float:
#     return len(set(ImageChops.difference(logo1, logo2).getdata()))


# # def hash_club_logos():
# #     print('Computing hash of club logos')
# #     # read all clubs and put them in the map by hash
# #     # read with csv because the file fits in memory
# #     with open('./data/clubs.json', 'r') as file:
# #         clubs = json.load(file)

# #     clubs_hash_map = defaultdict(list)
# #     for row in tqdm(clubs, desc='Hashing club logos'):
# #         club_id = row['club_id']
# #         try:
# #             image_hash = get_image_hash(club_id)
# #         except Exception as e:
# #             print(f'Error getting image hash for club {club_id}: {e}')
# #             continue
# #         else:
# #             clubs_hash_map[image_hash].append(club_id)

# #     # write the hash map to a json file
# #     with open('./data/club_logo_hashes.json', 'w') as file:
# #         json.dump(clubs_hash_map, file)


# def log_difference(club_id1: str, club_id2: str):
#     image_1 = get_image(club_id1)
#     image_2 = get_image(club_id2)
#     difference = get_difference(image_1, image_2)
#     print(f"Difference between {club_id1} and {club_id2}: {difference}")


# def build_parent_club_map():
#     with open("./data/clubs.json", "r") as file:
#         clubs = json.load(file)

#     club_logos = {
#         club["club_id"]: get_image(club["club_id"])
#         for club in tqdm(clubs, desc="Loading club logos")
#     }

#     # for each club, find all similar logos and put them in a list
#     similar_logos_map = defaultdict(list)
#     for i, club_id in tqdm(enumerate(club_logos), desc="Finding similar logos"):
#         logo = club_logos[club_id]
#         if logo is None:
#             similar_logos_map[club_id] = [club_id]
#             continue
#         if club_id in similar_logos_map:
#             # Already done for this logo
#             continue
#         for j, other_club_id in enumerate(club_logos):
#             if j < i:
#                 continue
#             other_logo = club_logos[other_club_id]
#             if other_logo is None:
#                 continue
#             difference = get_difference(logo, other_logo)
#             if difference <= 8:
#                 similar_logos_map[club_id].append(other_club_id)
#         # copy list of similar logos to the other clubs
#         for similar_club_id in similar_logos_map[club_id]:
#             similar_logos_map[similar_club_id] = [c for c in similar_logos_map[club_id]]

#     with open("./data/similar_logos_map.json", "w") as file:
#         json.dump(similar_logos_map, file)

#     # build the map of club to parent club
#     parent_club_map = {}
#     for club_id in tqdm(similar_logos_map, desc="Building parent club map"):
#         # take the smallest club id as the parent club
#         parent_club_map[club_id] = min(similar_logos_map[club_id], key=lambda x: int(x))

#     # write manually
#     with open("./data/parent_club_map.json", "w") as file:
#         json.dump(parent_club_map, file)


import csv
import json
from collections import defaultdict
from datetime import datetime


def build_parent_club_map_from_csv():
    parent_club_map = defaultdict(list)
    with open("./data/parent_club_map.csv", "r") as file:
        reader = csv.DictReader(file)
        for row in reader:
            parent_club_map[row["child_team_id"]].append((datetime.strptime(row["_last_modified_at"], "%Y-%m-%d %H:%M:%S"), row["parent_team_id"]))
    
    for child_club_id in parent_club_map:
        parent_club_map[child_club_id] = min(parent_club_map[child_club_id], key=lambda x: x[0])[1]
    
    with open("./data/parent_club_map.json", "w") as file:
        json.dump(dict(parent_club_map), file)


if __name__ == "__main__":
    # d = {
    #     "131": [
    #         "2464", "131"
    #     ]
    # }
    # for c in d:
    #     for other_c in d[c]:
    #         log_difference(c, other_c)
    # build_parent_club_map()
    build_parent_club_map_from_csv()
