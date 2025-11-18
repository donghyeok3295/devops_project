# app/services/llm.py
import json, re, httpx, math, os
from typing import Any, Dict, List
from app.config import settings

# 부팅 확인
print("[BOOT] llm module loaded from:", __file__)

# 디버그 플래그 (.env: LLM_DEBUG=true)
LLM_DEBUG = (os.getenv("LLM_DEBUG") or "").lower() in ("1", "true", "yes")

def _build_messages(query_text: str, items: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    n = len(items)
    system_msg = (
        "You are a lost-and-found matching assistant.\n"
        "Return ONLY a single JSON object {\"scores\":[...],\"reasons\":[...]} with exactly "
        f"{n} elements each. No code fences, no prose, no comments.\n"
        "scores must be floats in [0,1] (if you prefer 0~100, still return 0~1 scaled floats).\n"
        "reasons must be short Korean phrases.\n"
    )
    user_msg = (
        "User lost item description:\n"
        f"{query_text}\n\n"
        "Candidate items (ordered JSON array):\n"
        f"{json.dumps(items, ensure_ascii=False)}\n\n"
        "Return ONLY:\n"
        "{\"scores\":[...],\"reasons\":[...]}\n"
    )
    return [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]

def _strip_code_fences(s: str) -> str:
    s = s.strip()
    s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*```$", "", s)
    return s.strip()

def _extract_first_json_object(s: str) -> Dict[str, Any]:
    """모델이 군더더기 텍스트/코드펜스를 섞어 보내도 첫 JSON 객체만 안전하게 추출."""
    s = _strip_code_fences(s)
    # 흔한 라인 코멘트 제거
    s = re.sub(r"//.*?$", "", s, flags=re.MULTILINE)
    # 가장 바깥 중괄호 블럭만 추출
    m = re.search(r"\{.*\}", s, flags=re.DOTALL)
    if not m:
        return {"scores": [], "reasons": []}
    frag = m.group(0)
    try:
        obj = json.loads(frag)
    except json.JSONDecodeError:
        return {"scores": [], "reasons": []}
    if not isinstance(obj, dict):
        return {"scores": [], "reasons": []}
    return {"scores": obj.get("scores", []), "reasons": obj.get("reasons", [])}

def _normalize(scores: List[Any], reasons: List[Any], n: int) -> Dict[str, List[Any]]:
    """점수/사유 정제: 0~1 클램프, 0~100 → 0~1 스케일 다운, 길이 보정."""
    clean_scores: List[float] = []
    for x in (scores if isinstance(scores, list) else []):
        try:
            v = float(x)
        except Exception:
            v = 0.0
        # 0~100 같은 값이면 스케일 다운
        if v > 1.0 and v <= 100.0:
            v = v / 100.0
        # NaN/범위 보정
        try:
            v = 0.0 if math.isnan(v) else v
        except Exception:
            pass
        v = 0.0 if v < 0 else 1.0 if v > 1 else v
        clean_scores.append(v)

    clean_reasons = [str(r) if r is not None else "" for r in (reasons if isinstance(reasons, list) else [])]

    # 길이 맞추기 (부족분은 0 / "no-reason" 패딩, 초과분 컷)
    if len(clean_scores) < n:
        clean_scores += [0.0] * (n - len(clean_scores))
    if len(clean_reasons) < n:
        clean_reasons += [""] * (n - len(clean_reasons))
    clean_scores = clean_scores[:n]
    clean_reasons = clean_reasons[:n]

    # 빈 사유 보정
    clean_reasons = [r if r.strip() else "no-reason" for r in clean_reasons]
    return {"scores": clean_scores, "reasons": clean_reasons}

def _call_llm(messages: List[Dict[str, str]], n: int) -> Dict[str, Any]:
    url = f"{settings.llm_base_url}/chat/completions"
    headers = {"Content-Type": "application/json"}
    if getattr(settings, "llm_api_key", None):
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"

    body: Dict[str, Any] = {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": settings.llm_temperature,
        "max_tokens": 256,
    }

    # LM Studio는 response_format: json_schema/text만 허용 → 옵션화
    if getattr(settings, "llm_use_json_schema", False):
        body["response_format"] = {
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

    timeout = float(getattr(settings, "llm_timeout_seconds", 8.0) or 8.0)

    # 반드시 찍히는 콜/리스폰스 로그
    print("[LLM] CALL ->", url, getattr(settings, "llm_model", ""), "n=", n)

    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, headers=headers, json=body)
        # 상태코드 & 앞부분 미리보기
        print("[LLM] RESP <-", r.status_code, r.text[:300])
        r.raise_for_status()
        data = r.json()

    content = data["choices"][0]["message"]["content"]
    obj = _extract_first_json_object(content)
    return _normalize(obj.get("scores"), obj.get("reasons"), n)

def score(query_text: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
    try:
        msgs = _build_messages(query_text, items)
        obj = _call_llm(msgs, n=len(items))
        out = {"status": "ok", "scores": obj["scores"], "reasons": obj["reasons"]}
    except httpx.TimeoutException:
        out = {"status": "timeout", "scores": [], "reasons": []}
    except Exception as e:
        if LLM_DEBUG:
            print("[LLM][ERROR]", repr(e))
        out = {"status": "error", "detail": str(e), "scores": [], "reasons": []}
    return out
