# vector_similarity.py
import math
from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def normalize_distance(dist, max_dist=50):
    """0~max_dist 범위를 0~1 유사도로 변환"""
    dist = min(dist, max_dist)
    return 1 - (dist / max_dist)

def color_similarity(a, b):
    if not a or not b:
        return 0.0
    return 1.0 if a.lower() == b.lower() else 0.0

def material_similarity(a, b):
    if not a or not b:
        return 0.0
    return 1.0 if a.lower() == b.lower() else 0.0

def pattern_similarity(a, b):
    if not a or not b:
        return 0.0
    emb1 = model.encode(a)
    emb2 = model.encode(b)
    return float(util.cos_sim(emb1, emb2))

def feature_similarity(a, b):
    if not a or not b:
        return 0.0
    emb1 = model.encode(a)
    emb2 = model.encode(b)
    return float(util.cos_sim(emb1, emb2))

def accessory_similarity(a, b):
    if not a or not b:
        return 0.0
    emb1 = model.encode(a)
    emb2 = model.encode(b)
    return float(util.cos_sim(emb1, emb2))

def phash_similarity(a, b):
    if not a or not b:
        return 0.0
    dist = sum(c1 != c2 for c1, c2 in zip(a, b))
    max_len = len(a)
    return 1 - (dist / max_len)

def location_similarity(dist_meter):
    return normalize_distance(dist_meter, max_dist=500)

def time_similarity(hours):
    return normalize_distance(hours, max_dist=72)
