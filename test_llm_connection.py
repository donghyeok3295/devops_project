#!/usr/bin/env python3
"""
LLM 서버 연결 테스트
"""

import httpx
import json

LLM_BASE_URL = "http://127.0.0.1:1234/v1"
LLM_MODEL = "exaone-3.5-7.8b-instruct"

print("=" * 60)
print("LLM 서버 연결 테스트")
print("=" * 60)

# 1. LLM 서버 응답 확인
print("\n1. LLM 서버 핑 테스트...")
try:
    response = httpx.get(f"{LLM_BASE_URL}/models", timeout=5.0)
    print(f"✅ 상태 코드: {response.status_code}")
    if response.status_code == 200:
        models = response.json()
        print(f"✅ 사용 가능한 모델: {models}")
    else:
        print(f"⚠️ 응답: {response.text}")
except Exception as e:
    print(f"❌ LLM 서버 연결 실패: {e}")
    print("\n해결 방법:")
    print("1. LM Studio를 실행하세요")
    print("2. 모델을 로드하세요 (exaone-3.5-7.8b-instruct)")
    print("3. 서버 시작: Local Server → Start Server")
    print("4. 포트 확인: http://127.0.0.1:1234")
    exit(1)

# 2. 간단한 테스트 요청
print("\n2. LLM 응답 테스트...")
try:
    test_messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Return JSON: {\"score\": 0.9, \"reason\": \"test\"}"}
    ]
    
    body = {
        "model": LLM_MODEL,
        "messages": test_messages,
        "temperature": 0.3,
        "max_tokens": 100,
    }
    
    response = httpx.post(
        f"{LLM_BASE_URL}/chat/completions",
        json=body,
        timeout=30.0
    )
    
    print(f"✅ 상태 코드: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        print(f"✅ LLM 응답: {content[:200]}")
        print("\n✅ LLM 서버 정상 작동!")
    else:
        print(f"⚠️ 응답 오류: {response.text}")
        
except Exception as e:
    print(f"❌ LLM 요청 실패: {e}")
    print("\n가능한 원인:")
    print("1. 모델이 로드되지 않음")
    print("2. 메모리 부족")
    print("3. 타임아웃 (모델이 너무 느림)")

print("\n" + "=" * 60)
print("테스트 완료")
print("=" * 60)
