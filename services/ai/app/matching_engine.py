# matching_engine.py

from .vector_similarity import *
from .rule_score import calculate_rule_score
from .llm_score import get_llm_score
import math

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371 * 1000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2 +
        math.cos(math.radians(lat1)) *
        math.cos(math.radians(lat2)) *
        math.sin(dlon / 2) ** 2
    )
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def compute_similarity(user, item):

    dist_meter = calculate_distance(
        user["lat"], user["lng"], item["lat"], item["lng"]
    )
    time_hour = abs(user["lost_time_hour"] - item["lost_time_hour"])

    sims = {
        "color_sim": color_similarity(user["color"], item["color"]),
        "material_sim": material_similarity(user["material"], item["material"]),
        "pattern_sim": pattern_similarity(user["pattern"], item["pattern"]),
        "feature_sim": feature_similarity(user["features"], item["features"]),
        "accessory_sim": accessory_similarity(user["accessories"], item["accessories"]),
        "phash_sim": phash_similarity(user["phash"], item["phash"]),
        "location_sim": location_similarity(dist_meter),
        "time_sim": time_similarity(time_hour),
    }

    return sims

def match_item(user_input, candidate):
    sims = compute_similarity(user_input, candidate)
    rule_score = calculate_rule_score(sims)
    llm_score, reason = get_llm_score(user_input, candidate, sims)

    final_score = round((rule_score + llm_score) / 2, 4)

    return {
        "item_id": candidate["id"],
        "rule_score": rule_score,
        "llm_score": llm_score,
        "final_score": final_score,
        "reason": reason
    }
