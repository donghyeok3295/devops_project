from __future__ import annotations
import math
from typing import Any, Dict, List
from datetime import datetime
from app.services.rules import compute_rule_score  # 기존 간단 버전 사용
from app.services.llm import LLMClient

def _clamp01(x: float) -> float:
    return 0.0 if x < 0 else 1.0 if x > 1 else x

def _softmax(xs: List[float], tau: float = 0.7) -> List[float]:
    if not xs: return []
    m = max(xs)
    exps = [math.exp((x - m) / max(1e-6, tau)) for x in xs]
    s = sum(exps) or 1.0
    return [e / s for e in exps]

async def rerank(query_text: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # 1) 규칙 점수
    enriched = []
    for c in candidates:
        rule = compute_rule_score(query_text, c)  # 0~1
        enriched.append({
            "item_id": c["item_id"],
            "rule_score": float(_clamp01(rule)),
            "category": c.get("category"), "brand": c.get("brand"),
            "color": c.get("color"), "lat": c.get("lat"), "lng": c.get("lng"),
            "created_at": c.get("created_at"), "features_text": c.get("features_text"),
        })

    # 2) 규칙점수 정렬 후 Top-50 컷
    enriched.sort(key=lambda x: (-x["rule_score"], x["item_id"]))
    enriched = enriched[:50] if len(enriched) > 50 else enriched

    # 3) LLM 호출
    llm_items = [{
        "item_id": e["item_id"],
        "category": e["category"], "brand": e["brand"], "color": e["color"],
        "lat": e["lat"], "lng": e["lng"],
        "created_at": e["created_at"],
        "features_text": e["features_text"],
    } for e in enriched]

    client = LLMClient()
    scores, reasons, status = await client.score(query_text, llm_items)

    # 4) 폴백 또는 안정화
    if not scores or len(scores) != len(enriched):
        for e in enriched:
            e["llm_score"] = e["rule_score"]
            e["reason_text"] = ["LLM timeout; rule-only" if status == "timeout" else "LLM error; rule-only"]
    else:
        sm = _softmax([_clamp01(s) for s in scores], tau=0.7)
        for i, e in enumerate(enriched):
            e["llm_score"] = float(_clamp01(sm[i]))
            e["reason_text"] = [reasons[i] or "no-reason"]

    # 5) 최종 정렬(내부): 0.3*rule + 0.7*llm
    for e in enriched:
        e["_final"] = 0.3*e["rule_score"] + 0.7*e["llm_score"]
    enriched.sort(key=lambda x: (-x["_final"], x["item_id"]))
    for e in enriched:
        e.pop("_final", None)

    # 6) 축소 응답
    return [{"item_id": e["item_id"], "rule_score": e["rule_score"], "llm_score": e["llm_score"], "reason_text": e["reason_text"]} for e in enriched]
