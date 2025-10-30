# app/services/rules.py
import math, re
from typing import Any

def _get(c: Any, key: str):
    if isinstance(c, dict):
        return c.get(key)
    return getattr(c, key, None)

def compute_rule_score(query_text: str, c: Any) -> float:
    """
    간단 규칙 점수: category(3) / brand(2) / color(1)
    - dict 또는 pydantic 객체 모두 지원
    - 누락 시 0점 (보수 처리)
    """
    q = (query_text or "").lower()

    category = _get(c, "category")
    brand    = _get(c, "brand")
    color    = _get(c, "color")

    score = 0
    total_w = 3 + 2 + 1

    if category and str(category).lower() in q:
        score += 3
    if brand and str(brand).lower() in q:
        score += 2
    if color and str(color).lower() in q:
        score += 1

    return round(score / total_w, 3)
