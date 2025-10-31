import math
from typing import Any, Dict, List
from app.config import settings
from app.services import llm

def _gaussian_distance_penalty(distance_km: float | None) -> float:
    if distance_km is None:
        return 1.0
    sigma = max(settings.sigma_km, 1e-6)
    return math.exp(-(distance_km ** 2) / (2 * sigma ** 2))

def _time_decay(minutes_since_found: float | None) -> float:
    if minutes_since_found is None:
        return 1.0
    half_life_mins = settings.half_life_hours * 60.0
    if half_life_mins <= 0:
        return 1.0
    return 0.5 ** (minutes_since_found / half_life_mins)

def _rule_score(query: str, item: Dict[str, Any]) -> float:
    q = (query or "").lower()
    score = 0.0

    def boost(token: str | None, w: float):
        nonlocal score
        t = (token or "").lower()
        if t and t in q:
            score += w

    boost(item.get("brand"), 20.0)
    boost(item.get("color"), 15.0)
    boost(item.get("stored_place"), 15.0)

    name = (item.get("name") or "").lower()
    features = (item.get("features_text") or "").lower()
    for t in (name, features):
        if t and t in q:
            score += 10.0

    score *= _gaussian_distance_penalty(item.get("distance_km"))
    score *= _time_decay(item.get("minutes_since_found"))
    return float(score)

def _clamp01(x: float) -> float:
    return 0.0 if x < 0 else 1.0 if x > 1 else x

def _softmax(xs: List[float], tau: float = 0.7) -> List[float]:
    if not xs:
        return []
    m = max(xs)
    exps = [math.exp((x - m) / max(tau, 1e-6)) for x in xs]
    s = sum(exps)
    return [e / s for e in exps] if s > 0 else [0.0 for _ in xs]

async def rerank(user_query: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    라우터가 import 하는 공개 함수 이름이 반드시 'rerank' 여야 합니다.
    """
    if not candidates:
        return []

    enriched: List[Dict[str, Any]] = []
    for c in candidates:
        rs = _rule_score(user_query, c)
        enriched.append({
            "item_id": c.get("item_id") or c.get("id") or c.get("ID"),
            "brand": c.get("brand"),
            "color": c.get("color"),
            "stored_place": c.get("stored_place"),
            "distance_km": c.get("distance_km"),
            "minutes_since_found": c.get("minutes_since_found"),
            "features_text": c.get("features_text"),
            "rule_score": rs,
        })

    # LLM 입력 축약
    llm_items = [{
        "item_id": e["item_id"],
        "brand": e.get("brand"),
        "color": e.get("color"),
        "stored_place": e.get("stored_place"),
        "distance_km": e.get("distance_km"),
        "minutes_since_found": e.get("minutes_since_found"),
        "features_text": e.get("features_text"),
    } for e in enriched]

    r = llm.score(user_query, llm_items)
    raw_scores = r.get("scores", [])
    raw_reasons = r.get("reasons", [])

    sm = _softmax([_clamp01(float(s)) for s in raw_scores], tau=0.7)

    for i, e in enumerate(enriched):
        e["llm_score"] = float(sm[i]) if i < len(sm) else 0.0
        e["reason_text"] = str(raw_reasons[i]) if i < len(raw_reasons) and raw_reasons[i] is not None else "no-reason"

    for e in enriched:
        e["_final"] = 0.3 * float(e["rule_score"]) + 0.7 * float(e["llm_score"])

    enriched.sort(key=lambda x: (-x["_final"], x["item_id"]))
    for e in enriched:
        e.pop("_final", None)

    return [{
        "item_id": e["item_id"],
        "rule_score": e["rule_score"],
        "llm_score": e["llm_score"],
        "reason_text": e["reason_text"],
    } for e in enriched]
