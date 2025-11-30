# llm_score.py
import requests
import json
import re

LLM_URL = "http://localhost:1234/v1/chat/completions"  # LM Studio endpoint
MODEL_NAME = "exaone-3.5-7.8b-instruct"                 # 실제 돌아가는 모델로 수정


# ------------------------------
# 유틸: 코드블록 제거
# ------------------------------
def strip_code_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```[a-zA-Z0-9]*\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


# ------------------------------
# 유틸: JSON만 추출하는 안정형 파서
# EXAONE은 뒤에 자연어 설명을 붙여도 JSON 앞부분만 추출
# ------------------------------
def extract_first_json(text: str) -> dict:
    text = strip_code_fences(text)

    start = text.find("{")
    if start == -1:
        return {}

    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                fragment = text[start:i+1]
                try:
                    return json.loads(fragment)
                except Exception:
                    return {}
    return {}


# ------------------------------
# 메인 함수
# user_input: dict
# candidate: dict
# sims: dict (vector_sim 등)
# ------------------------------
def get_llm_score(user_input, candidate, sims):
    # 프롬프트: EXAONE 전용 "JSON ONLY" 강제 프롬프트
    prompt = f"""
당신은 분실물 매칭 점수 평가 모델입니다.
JSON 객체 하나만 출력하세요.
절대 ``` 와 같은 코드블록을 사용하지 마세요.
절대 JSON 뒤에 다른 설명을 출력하지 마세요.

출력 형식(EXACT):
{{
  "llm_score": 0.0,
  "reason": "string"
}}

reason은 20자 이하로 작성하세요.

입력 데이터:
user_input = {json.dumps(user_input, ensure_ascii=False)}
candidate = {json.dumps(candidate, ensure_ascii=False)}
vector_sim = {json.dumps(sims, ensure_ascii=False)}
"""

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "당신은 JSON ONLY 출력하는 평가 모델입니다."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 600
    }

    try:
        response = requests.post(LLM_URL, json=payload)
        result = response.json()

        content = result["choices"][0]["message"]["content"]

        print("\n[LLM RAW RESPONSE]\n", content, "\n")

        # JSON만 추출
        obj = extract_first_json(content)

        if not obj or "llm_score" not in obj:
            return 0.0, "Parsing failed"

        score = obj["llm_score"]
        reason = obj.get("reason", "ok")

        # 점수 보정
        try:
            score = float(score)
        except:
            score = 0.0

        if score < 0: score = 0.0
        if score > 1: score = 1.0

        return score, reason

    except Exception as e:
        print("[LLM ERROR]", e)
        return 0.0, "LLM error"
