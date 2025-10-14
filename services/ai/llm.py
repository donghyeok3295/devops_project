from __future__ import annotations
import json, time, hashlib
from typing import Any, Dict, List, Tuple
import httpx
from app.config import settings

# 매우 단순 TTL 캐시(선택)
_CACHE: dict[str, tuple[float, Any]] = {}

def _cache_get(k: str):
    v = _CACHE.get(k)
    if not v: return None
    expire, val = v
    if expire < time.time():
        _CACHE.pop(k, None)
        return None
    return val

def _cache_set(k: str, val: Any, ttl: int = 900):
    _CACHE[k] = (time.time() + ttl, val)

def _hash(obj: Any) -> str:
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


PROMPT = (
    "사용자 질의와 아이템 속성(카테/브랜드/색/특징/좌표/시간)을 비교하여 유사도를 0~1로 평가하고, "
    "이유를 1~2문장으로 설명하세요. 이유에는 질의/속성의 실제 단어 최소 1개를 포함하세요.\n"
    "반드시 JSON으로만 답하고, 포맷은 다음과 같습니다:\n"
    "{{\"items\": [{{\"item_id\": 123, \"score\": 0.83, \"reason\": \"...\"}}]}}\n\n"
    "질의: {query}\n"
    "아이템들(JSON): {items}\n"
)


class LLMClient:
    async def score(self, query_text: str, items: List[Dict[str, Any]]) -> tuple[list[float], list[str], str]:
        """
        return (scores[0..n-1], reasons[0..n-1], status: ok|timeout|error|cache)
        """
        key = _hash({"q": query_text, "items": items, "m": settings.llm_model}) 
        cached = _cache_get(key)
        if cached: 
            return cached["scores"], cached["reasons"], "cache"

        payload = {
            "model": settings.llm_model,
            "temperature": 0.0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "당신은 분실물 매칭 평가자입니다. 숫자와 짧은 이유만 JSON으로 답하세요."},
                {"role": "user", "content": PROMPT.format(query=query_text, items=json.dumps(items, ensure_ascii=False))}
            ],
        }
        headers = {}
        if settings.llm_api_key:
            headers["Authorization"] = f"Bearer {settings.llm_api_key}"

        try:
            async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
                r = await client.post(f"{settings.llm_base_url}/chat/completions", json=payload, headers=headers)
                r.raise_for_status()
                data = r.json()
                text = data["choices"][0]["message"]["content"]
                js = json.loads(text)
                arr = js.get("items", [])
                # item_id 기준으로 맵핑
                score_map = {int(x["item_id"]): float(max(0.0, min(1.0, x.get("score", 0.0)))) for x in arr if "item_id" in x}
                reason_map = {int(x["item_id"]): str(x.get("reason", "")).strip() or "no-reason" for x in arr if "item_id" in x}
                scores = [score_map.get(int(it["item_id"]), 0.0) for it in items]
                reasons = [reason_map.get(int(it["item_id"]), "no-reason") for it in items]
                _cache_set(key, {"scores": scores, "reasons": reasons})
                return scores, reasons, "ok"
        except (httpx.TimeoutException, httpx.ReadTimeout):
            return [], [], "timeout"
        except Exception:
            return [], [], "error"

# 
# 