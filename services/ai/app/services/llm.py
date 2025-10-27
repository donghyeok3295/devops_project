from __future__ import annotations
import json, time, hashlib, logging
from typing import Any, Dict, List, Tuple
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

# 단순 TTL 캐시 (메모리)
_CACHE: dict[str, tuple[float, Any]] = {}

def _cache_get(k: str):
    v = _CACHE.get(k)
    if not v:
        return None
    expire, val = v
    if expire < time.time():
        _CACHE.pop(k, None)
        return None
    return val

def _cache_set(k: str, val: Any, ttl: int = 900):
    _CACHE[k] = (time.time() + ttl, val)

def _hash(obj: Any) -> str:
    try:
        return hashlib.sha256(
            json.dumps(obj, ensure_ascii=False, sort_keys=True).encode()
        ).hexdigest()
    except Exception:
        # fallback 해시 (절대 충돌 안전하진 않지만 문제 회피용)
        return str(hash(str(obj)))


PROMPT = (
    "당신은 분실물 매칭 평가자입니다.\n"
    "사용자 질의와 아이템 속성(카테고리, 브랜드, 색상, 특징, 좌표, 시간)을 비교해 "
    "유사도를 0~1 사이 실수(score)로 평가하고, 이유(reason)를 1~2문장으로 설명하세요. "
    "이유에는 실제 단어(예: '빨간색', '나이키', '현장 위치') 중 최소 1개를 포함해야 합니다.\n"
    "반드시 JSON 객체 하나만 반환하세요. 아래 형식 외 다른 텍스트, 설명, 마크다운, 코드블록을 추가하지 마세요.\n"
    "응답 형식 예:\n"
    "{{\"items\": [{{\"item_id\": 123, \"score\": 0.83, \"reason\": \"빨간색 나이키 가방과 거의 일치합니다.\"}}]}}\n\n"
    "질의: {query}\n"
    "아이템들(JSON): {items}\n"
)


class LLMClient:
    async def score(
        self,
        query_text: str,
        items: List[Dict[str, Any]]
    ) -> Tuple[List[float], List[str], str]:
        """
        LLM으로 유사도 점수(score)와 설명(reason)을 요청한다.
        return (scores[], reasons[], status)
          status ∈ {"ok", "timeout", "error", "cache"}
        """

        # 캐시 키 생성
        key = _hash({"q": query_text, "items": items, "m": settings.llm_model})
        cached = _cache_get(key)
        if cached:
            logger.info(f"[LLMClient] cache hit for query='{query_text[:30]}'")
            return cached["scores"], cached["reasons"], "cache"

        # LLM에 보낼 메시지
        payload = {
            "model": settings.llm_model,
            "temperature": 0.0,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "당신은 분실물 매칭 평가자입니다. "
                        "각 후보 아이템에 대해 0~1 유사도 점수와 짧은 이유만 JSON으로 답하세요."
                    )
                },
                {
                    "role": "user",
                    "content": PROMPT.format(
                        query=query_text,
                        items=json.dumps(items, ensure_ascii=False)
                    )
                }
            ],
        }

        headers = {}
        if settings.llm_api_key:
            headers["Authorization"] = f"Bearer {settings.llm_api_key}"

        try:
            async with httpx.AsyncClient(timeout=float(settings.llm_timeout_seconds)) as client:
                r = await client.post(
                    f"{settings.llm_base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )

            r.raise_for_status()
            data = r.json()

            # LLM 응답 본문 (우리가 파싱할 실제 JSON 문자열)
            content = (
                data
                .get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )
            if not content:
                logger.warning("[LLMClient] empty content from LLM")
                return [], [], "error"

            # LLM이 준 content(JSON 문자열)을 dict로 변환
            try:
                js = json.loads(content)
            except json.JSONDecodeError:
                logger.error(f"[LLMClient] JSON parse error. content={content[:200]}")
                return [], [], "error"

            arr = js.get("items", [])
            score_map: Dict[int, float] = {}
            reason_map: Dict[int, str] = {}

            for x in arr:
                try:
                    item_id = int(x["item_id"])
                    score_val = float(x.get("score", 0.0))
                    # 점수는 0~1 클램프
                    if score_val < 0.0:
                        score_val = 0.0
                    elif score_val > 1.0:
                        score_val = 1.0
                    score_map[item_id] = score_val

                    reason_text = str(x.get("reason", "")).strip() or "no-reason"
                    reason_map[item_id] = reason_text
                except Exception:
                    # item_id가 없거나 score가 숫자가 아닐 때 그 항목은 스킵
                    continue

            # pipeline.rerank()에서 items 순서 기준으로 맞춰줘야 하므로
            scores: List[float] = [
                score_map.get(int(it["item_id"]), 0.0)
                for it in items
            ]
            reasons: List[str] = [
                reason_map.get(int(it["item_id"]), "no-reason")
                for it in items
            ]

            _cache_set(key, {"scores": scores, "reasons": reasons})
            logger.info(f"[LLMClient] success: {len(items)} items scored.")
            return scores, reasons, "ok"

        except (httpx.TimeoutException, httpx.ReadTimeout):
            logger.warning("[LLMClient] timeout")
            return [], [], "timeout"

        except httpx.RequestError as e:
            logger.error(f"[LLMClient] HTTP error: {e}")
            return [], [], "error"

        except Exception as e:
            logger.exception(f"[LLMClient] unexpected error: {e}")
            return [], [], "error"
