# services/ai/app/services/llm.py (수정본)

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
    LLM 프롬프트 생성
    """

    system_msg = """
당신은 분실물 매칭 시스템의 평가 모델입니다.
사용자가 찾는 물건과 데이터베이스의 물건이 얼마나 일치하는지 0~1 사이의 점수로 평가하세요.

평가 기준:
- 이름(name)이 검색어와 유사한가? (+0.4)
- 브랜드(brand)가 일치하는가? (+0.2)
- 색상(color)이 일치하는가? (+0.2)
- 카테고리(category)가 일치하는가? (+0.1)
- 특징(features_text)이 유사한가? (+0.1)

반드시 JSON 형식으로만 응답하세요.
""".strip()

    # user_input에서 검색어 추출
    query = user_input.get("query", "")

    user_msg = f"""
[검색어]
{query}

[데이터베이스 물품]
- 이름: {candidate.get('name', 'N/A')}
- 브랜드: {candidate.get('brand', 'N/A')}
- 색상: {candidate.get('color', 'N/A')}
- 카테고리: {candidate.get('category', 'N/A')}
- 특징: {candidate.get('features_text', 'N/A')}

[규칙 기반 점수]
{rule_score:.3f}

위 정보를 바탕으로 이 물품이 검색어와 얼마나 일치하는지 평가하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{{
  "llm_score": 0.85,
  "reason": "브랜드와 색상 일치"
}}

JSON만 출력하고 다른 설명은 하지 마세요.
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
        "temperature": settings.llm_temperature,
        "max_tokens": 256
    }

    print(f"[LLM] Calling {url} with model={settings.llm_model}")

    try:
        with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
            r = client.post(url, headers=headers, json=body)
            r.raise_for_status()
            data = r.json()

        content = data["choices"][0]["message"]["content"]

        print(f"[LLM RAW] {content}")

        obj = _extract_json(content)
        
        print(f"[LLM PARSED] {obj}")

        return obj
        
    except httpx.TimeoutException:
        print("[LLM ERROR] Timeout")
        return {}
    except httpx.HTTPStatusError as e:
        print(f"[LLM ERROR] HTTP {e.response.status_code}: {e.response.text}")
        return {}
    except Exception as e:
        print(f"[LLM ERROR] {type(e).__name__}: {str(e)}")
        return {}


def score(user_input: Dict[str, Any], candidate: Dict[str, Any], rule_score: float) -> Dict[str, Any]:
    """
    LLM 기반 점수 계산
    
    Args:
        user_input: 사용자 검색 정보 (query 포함)
        candidate: 개별 아이템 정보
        rule_score: 규칙 기반 점수 (0~1 또는 0~100)
    
    Returns:
        {
            "llm_score": float (0~1),
            "reason": str
        }
    """

    # 규칙 점수 정규화 (0~100 범위를 0~1로 변환)
    normalized_rule = rule_score / 100.0 if rule_score > 1.0 else rule_score

    try:
        msgs = _build_messages(user_input, candidate, normalized_rule)
        obj = _call_llm(msgs)

        # JSON 파싱 실패 → fallback
        if "llm_score" not in obj:
            print(f"[LLM] llm_score 키 없음. 파싱된 객체: {obj}")
            return {
                "llm_score": 0.0,
                "reason": "Parsing failed (fallback applied)"
            }

        # 점수 정규화
        try:
            s = float(obj["llm_score"])
        except (ValueError, TypeError):
            print(f"[LLM] llm_score 값 변환 실패: {obj.get('llm_score')}")
            s = 0.0

        # 0~1 범위로 클램핑
        s = max(0.0, min(1.0, s))

        reason = obj.get("reason", "no-reason")

        return {
            "llm_score": s,
            "reason": reason
        }

    except Exception as e:
        print(f"[LLM ERROR] score() 함수 실패: {e}")
        import traceback
        traceback.print_exc()
        return {
            "llm_score": 0.0,
            "reason": f"error: {str(e)}"
        }
