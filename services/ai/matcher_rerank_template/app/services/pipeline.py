import math
from typing import Any, Dict, List
from app.config import settings
from app.services import llm

# ----------------------
# Helpers (rule scoring)
# ----------------------
def _gaussian_distance_penalty(distance_km: float | None) -> float:
    if distance_km is None:
        return 1.0
    sigma = max(getattr(settings, "sigma_km", 1.0), 1e-6)
    return math.exp(-(distance_km ** 2) / (2 * sigma ** 2))

def _time_decay(minutes_since_found: float | None) -> float:
    if minutes_since_found is None:
        return 1.0
    half_life_mins = float(getattr(settings, "half_life_hours", 72.0)) * 60.0
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

    # 간단 키워드 매칭 가중치
    boost(item.get("brand"), 20.0)          # 예: Samsung
    boost(item.get("color"), 15.0)          # 예: black/검정
    boost(item.get("stored_place"), 15.0)   # 예: 공학관 304

    # 이름/특징 텍스트도 있으면 가산
    name = (item.get("name") or "").lower()
    features = (item.get("features_text") or "").lower()
    for t in (name, features):
        if t and t in q:
            score += 10.0

    # 거리/시간 패널티
    score *= _gaussian_distance_penalty(item.get("distance_km"))
    score *= _time_decay(item.get("minutes_since_found"))
    return float(score)

def _clamp01(x: float) -> float:
    if x < 0: return 0.0
    if x > 1: return 1.0
    return x

def _softmax(xs: List[float], tau: float = 0.7) -> List[float]:
    if not xs:
        return []
    m = max(xs)
    exp = [math.exp((x - m) / max(tau, 1e-6)) for x in xs]
    s = sum(exp)
    return [v / s for v in exp] if s > 0 else [0.0 for _ in xs]

# ----------------------
# Public API (used by router)
# ----------------------
async def rerank(user_query: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    라우터가 import 하는 공개 함수 이름은 반드시 'rerank' 여야 합니다.
    """
    if not candidates:
        return []

    # 1) 규칙 기반 스코어
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

    # 2) LLM 입력 축약
    llm_items = [{
        "item_id": e["item_id"],
        "brand": e.get("brand"),
        "color": e.get("color"),
        "stored_place": e.get("stored_place"),
        "distance_km": e.get("distance_km"),
        "minutes_since_found": e.get("minutes_since_found"),
        "features_text": e.get("features_text"),
    } for e in enriched]

    # 디버그 로그
    print("[PIPE] calling llm.score with", len(llm_items), "items")

    # 3) LLM 점수 요청
    r = llm.score(user_query, llm_items)

    # 디버그 로그
    print("[PIPE] llm.score returned", r.get("status"), r.get("scores"))

    raw_scores = r.get("scores", [])
    raw_reasons = r.get("reasons", [])

    # LLM 출력 → [0,1] 클램프 → softmax
    sm = _softmax([_clamp01(float(s)) for s in raw_scores], tau=0.7)

    # 4) 결과 병합
    for i, e in enumerate(enriched):
        e["llm_score"] = float(sm[i]) if i < len(sm) else 0.0
        e["reason_text"] = str(raw_reasons[i]) if i < len(raw_reasons) and raw_reasons[i] is not None else "no-reason"

    # 5) 최종 점수 (rule 30% + llm 70%)
    for e in enriched:
        e["_final"] = 0.3 * float(e["rule_score"]) + 0.7 * float(e["llm_score"])

    # 정렬 후 반환 필드 축소
    enriched.sort(key=lambda x: (-x["_final"], x["item_id"]))
    for e in enriched:
        e.pop("_final", None)

    return [{
        "item_id": e["item_id"],
        "rule_score": e["rule_score"],
        "llm_score": e["llm_score"],
        "reason_text": e["reason_text"],
    } for e in enriched]
