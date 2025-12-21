# services/ai/app/services/pipeline.py (수정본)

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
    수정된 rerank 함수: LLM을 각 아이템마다 개별 호출
    """
    if not candidates:
        return []

    enriched: List[Dict[str, Any]] = []
    
    # 1단계: 규칙 기반 점수 계산
    for c in candidates:
        rs = _rule_score(user_query, c)
        enriched.append({
            "item_id": c.get("item_id") or c.get("id") or c.get("ID"),
            "name": c.get("name"),
            "category": c.get("category"),
            "brand": c.get("brand"),
            "color": c.get("color"),
            "stored_place": c.get("stored_place"),
            "distance_km": c.get("distance_km"),
            "minutes_since_found": c.get("minutes_since_found"),
            "features_text": c.get("features_text"),
            "rule_score": rs,
        })

    print(f"[DEBUG] 규칙 점수 계산 완료: {len(enriched)}개 아이템")

    # 2단계: LLM 점수 계산 (각 아이템마다 개별 호출)
    for e in enriched:
        # LLM에게 전달할 user_input (검색어를 포함한 context)
        user_input = {
            "query": user_query,
            "search_context": "분실물 검색"
        }
        
        # LLM에게 전달할 candidate (개별 아이템)
        candidate = {
            "item_id": e["item_id"],
            "name": e.get("name"),
            "category": e.get("category"),
            "brand": e.get("brand"),
            "color": e.get("color"),
            "stored_place": e.get("stored_place"),
            "features_text": e.get("features_text"),
        }
        
        # ✅ 수정: llm.score()를 올바른 파라미터로 호출
        try:
            result = llm.score(user_input, candidate, e["rule_score"])
            
            # ✅ 수정: 올바른 키 이름 사용
            e["llm_score"] = float(result.get("llm_score", 0.0))
            e["reason_text"] = str(result.get("reason", "no-reason"))
            
            print(f"[DEBUG] {e['name']}: rule={e['rule_score']:.3f}, llm={e['llm_score']:.3f}")
            
        except Exception as ex:
            print(f"[ERROR] LLM 점수 계산 실패 (item_id={e['item_id']}): {ex}")
            e["llm_score"] = 0.0
            e["reason_text"] = f"error: {str(ex)}"

    # 3단계: Softmax 적용 (선택적)
    llm_scores = [e["llm_score"] for e in enriched]
    sm = _softmax([_clamp01(s) for s in llm_scores], tau=0.7)
    
    for i, e in enumerate(enriched):
        if i < len(sm):
            e["llm_score"] = float(sm[i])

    # 4단계: 최종 점수 계산
    for e in enriched:
        # rule_score는 이미 정규화된 값이라고 가정
        # rule_score가 큰 값(예: 0~100)이면 정규화 필요
        normalized_rule = e["rule_score"] / 100.0 if e["rule_score"] > 1.0 else e["rule_score"]
        
        e["_final"] = 0.3 * normalized_rule + 0.7 * float(e["llm_score"])
        
        print(f"[FINAL] {e['name']}: rule={normalized_rule:.3f}, llm={e['llm_score']:.3f}, final={e['_final']:.3f}")

    # 5단계: 정렬
    enriched.sort(key=lambda x: (-x["_final"], x["item_id"]))
    
    # 디버그 출력
    print("\n[RANKING RESULT]")
    for rank, e in enumerate(enriched[:5], 1):
        print(f"{rank}위: {e['name']} (final={e['_final']:.3f})")
    
    # 6단계: 최종 결과 반환
    for e in enriched:
        e.pop("_final", None)

    return [{
        "item_id": e["item_id"],
        "rule_score": e["rule_score"],
        "llm_score": e["llm_score"],
        "reason_text": e["reason_text"],
    } for e in enriched]
