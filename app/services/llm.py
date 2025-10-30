import os
import json
import re
import httpx
import math
from typing import Any, Dict, List
from app.config import settings

# 간단한 메모리 캐시
_CACHE: Dict[str, Dict[str, Any]] = {}

def _build_messages(query_text: str, items: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    n = len(items)
    system_msg = (
        "You are a lost-and-found matching assistant.\n"
        "Rules:\n"
        f"- Output ONLY a single minified JSON object: {{\"scores\":[...],\"reasons\":[...]}} with exactly {n} elements in each array.\n"
        "- No code fences, no prose, no comments, no trailing text.\n"
        "- scores must be floats in [0,1].\n"
        "- reasons must be short Korean phrases explaining the score.\n"
    )
    user_msg = f"""
User lost item description:
{query_text}

Candidate items (ordered JSON array):
{json.dumps(items, ensure_ascii=False)}

Return ONLY:
{{"scores":[...],"reasons":[...]}}
"""
    return [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg.strip()},
    ]

def _strip_code_fences(s: str) -> str:
    s = s.strip()
    s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*```$", "", s)
    return s.strip()

def _first_balanced_json(s: str) -> dict:
    """
    응답 텍스트에서 첫 번째 '완전한' JSON 오브젝트를 브레이스 매칭으로 안전하게 추출.
    """
    s = _strip_code_fences(s)
    # 라인 주석 제거(모델이 // ... 붙이는 경우)
    s = re.sub(r"//.*?$", "", s, flags=re.MULTILINE)
    start = s.find("{")
    if start == -1:
        return {}
    depth = 0
    for i in range(start, len(s)):
        ch = s[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                frag = s[start:i+1]
                try:
                    return json.loads(frag)
                except json.JSONDecodeError:
                    break
    return {}

def _extract_first_json_object(s: str) -> Dict[str, Any]:
    obj = _first_balanced_json(s)
    if not isinstance(obj, dict) or not obj:
        return {"scores": [], "reasons": []}
    return {
        "scores": obj.get("scores", []),
        "reasons": obj.get("reasons", []),
    }

def _normalize(scores: List[Any], reasons: List[Any], n: int) -> Dict[str, List[Any]]:
    """
    - 점수: 숫자화 → NaN 방지 → [0,1]로 클램프
    - 길이: 후보 수(n)에 맞게 패딩/절단
    - 이유: str 변환, 공백이면 'no-reason'
    """
    clean_scores: List[float] = []
    for x in (scores if isinstance(scores, list) else []):
        try:
            v = float(x)
        except Exception:
            v = 0.0
        v = 0.0 if math.isnan(v) else max(0.0, min(1.0, v))
        clean_scores.append(v)

    clean_reasons = [str(r) if r is not None else "" for r in (reasons if isinstance(reasons, list) else [])]

    if len(clean_scores) < n:
        clean_scores += [0.0] * (n - len(clean_scores))
    if len(clean_reasons) < n:
        clean_reasons += [""] * (n - len(clean_reasons))

    clean_scores = clean_scores[:n]
    clean_reasons = clean_reasons[:n]
    clean_reasons = [r if r.strip() else "no-reason" for r in clean_reasons]

    return {"scores": clean_scores, "reasons": clean_reasons}

def _call_llm(messages: List[Dict[str, str]], n: int) -> Dict[str, Any]:
    url = f"{settings.llm_base_url}/chat/completions"
    headers = {"Content-Type": "application/json"}
    if settings.llm_api_key:
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"

    # ⚠ LM Studio가 response_format을 어기는 경우가 있어도, 아래 블록은 유지/제거 둘 다 가능.
    #   문제가 되면 주석 처리해도 파서/클램프가 수습함.
    body = {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": settings.llm_temperature,
        "max_tokens": 256,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "ScoresReasons",
                "schema": {
                    "type": "object",
                    "properties": {
                        "scores":  {"type": "array", "minItems": n, "maxItems": n, "items": {"type": "number", "minimum": 0, "maximum": 1}},
                        "reasons": {"type": "array", "minItems": n, "maxItems": n, "items": {"type": "string"}}
                    },
                    "required": ["scores","reasons"],
                    "additionalProperties": False
                },
                "strict": True
            }
        }
    }

    with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
        r = client.post(url, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()

    content = data["choices"][0]["message"]["content"]

    if os.getenv("LLM_DEBUG") == "1":
        print("[LLM RAW]", content[:400].replace("\n", " "))

    obj = _extract_first_json_object(content)
    return _normalize(obj.get("scores"), obj.get("reasons"), n)

def score(query_text: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
    key = json.dumps({"q": query_text, "items": items}, ensure_ascii=False, sort_keys=True)
    if key in _CACHE:
        return _CACHE[key]
    try:
        msgs = _build_messages(query_text, items)
        obj = _call_llm(msgs, n=len(items))
        out = {"status": "ok", "scores": obj["scores"], "reasons": obj["reasons"]}
    except httpx.TimeoutException:
        out = {"status": "timeout", "scores": [], "reasons": []}
    except Exception as e:
        out = {"status": "error", "detail": str(e), "scores": [], "reasons": []}
    _CACHE[key] = out
    return out
