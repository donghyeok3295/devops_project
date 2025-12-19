# rule_score.py

def calculate_rule_score(sims):
    """
    sims = {
        "color_sim": float,
        "material_sim": float,
        "pattern_sim": float,
        "feature_sim": float,
        "accessory_sim": float,
        "phash_sim": float,
        "location_sim": float,
        "time_sim": float
    }
    """

    score = (
        0.15 * sims["color_sim"] +
        0.15 * sims["feature_sim"] +
        0.10 * sims["accessory_sim"] +
        0.10 * sims["material_sim"] +
        0.20 * sims["location_sim"] +
        0.20 * sims["time_sim"] +
        0.10 * sims["phash_sim"]
    )
    return round(score, 4)
