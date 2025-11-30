import os
import json
import re
import httpx
import math
from typing import Any, Dict
from app.config import settings


def _strip_code_fences(s: str) -> str:
    s = s.strip()
    s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*```$", "", s)
    return s.strip()


def _extract_json(s: str) -> dict:
    """
    모델이 출력한 텍스트에서 첫 번째 JSON 객체만 안전하게 추출.
    """
    s = _strip_code_fences(s)

    start = s.find("{")
    if start == -1:
        return {}

    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                fragment = s[start:i+1]
                try:
                    return json.loads(fragment)
                except:
                    return {}
    return {}


def _build_messages(user_input: Dict[str, Any], candidate: Dict[str, Any], rule_score: float):
    """
    LLM이 해야 할 일:
    - 백엔드에서 계산한 rule_score를 기반으로 보정 점수를 계산
    - 최종 llm_score (0~1 범위)를 반환
    """

    system_msg = """
당신은 분실물 매칭 시스템의 평가 모델입니다.
당신의 역할은 백엔드에서 계산한 rule_score를 기반으로 최종 llm_score를 0~1 범위로 산정하는 것입니다.
"user_input"과 "candidate"는 물품의 속성을 포함합니다.
설명은 최소화하고, 반드시 JSON으로만 출력해야 합니다.
""".strip()

    user_msg = f"""
아래는 비교 대상입니다.

[사용자 입력]
{json.dumps(user_input, ensure_ascii=False)}

[DB 물품 정보]
{json.dumps(candidate, ensure_ascii=False)}

[백엔드 계산 rule_score]
{rule_score}

당신의 작업:
1. rule_score를 기반으로 추가적인 보정 점수를 계산하세요.
2. llm_score는 0~1 사이의 값이어야 합니다.
3. 반드시 다음 JSON 형식 EXACT 그대로 출력하세요:

{{
  "llm_score": <0~1 숫자>,
  "reason": "<간단한 이유>"
}}

JSON 외 문장 금지.
""".strip()

    return [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]


def _call_llm(messages):
    """
    LM Studio(또는 OpenAI 호환 API) 호출
    """
    url = f"{settings.llm_base_url}/chat/completions"
    headers = {"Content-Type": "application/json"}
    if settings.llm_api_key:
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"

    body = {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 256
    }

    with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
        r = client.post(url, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()

    content = data["choices"][0]["message"]["content"]

    print("[LLM RAW]", content)

    obj = _extract_json(content)

    return obj


def score(user_input: Dict[str, Any], candidate: Dict[str, Any], rule_score: float) -> Dict[str, Any]:
    """
    LLM 기반 보정 점수 계산
    - user_input, candidate, rule_score를 기반으로 llm_score를 계산
    """

    try:
        msgs = _build_messages(user_input, candidate, rule_score)
        obj = _call_llm(msgs)

        # JSON 파싱 실패 → fallback
        if "llm_score" not in obj:
            return {
                "llm_score": 0.0,
                "reason": "Parsing failed (fallback applied)"
            }

        # 점수 정규화
        try:
            s = float(obj["llm_score"])
        except:
            s = 0.0

        s = max(0.0, min(1.0, s))

        return {
            "llm_score": s,
            "reason": obj.get("reason", "no-reason")
        }

    except Exception as e:
        print("[LLM ERROR]", e)
        return {
            "llm_score": 0.0,
            "reason": f"error: {str(e)}"
        }
