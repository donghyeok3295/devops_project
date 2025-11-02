#!/usr/bin/env python3
"""
검색 기능 통합 테스트 스크립트

이 스크립트는 다음을 테스트합니다:
1. 백엔드 API의 /items/candidates 엔드포인트
2. AI 서비스의 /search 엔드포인트
3. 전체 검색 흐름
"""

import requests
import json
from typing import Dict, Any

# 설정
BACKEND_URL = "http://203.234.62.84:8000"
AI_SERVICE_URL = "http://localhost:9000"  # 또는 "http://203.234.62.47:9000"
ADMIN_TOKEN = "dev-internal-secret"

def print_separator(title: str):
    """구분선 출력"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60 + "\n")

def test_backend_candidates():
    """백엔드 /items/candidates 테스트"""
    print_separator("1. 백엔드 Candidates 엔드포인트 테스트")
    
    url = f"{BACKEND_URL}/items/candidates"
    headers = {"X-Admin-Token": ADMIN_TOKEN}
    
    try:
        print(f"📡 요청: GET {url}")
        print(f"🔑 헤더: X-Admin-Token: {ADMIN_TOKEN}")
        
        response = requests.get(url, headers=headers, timeout=10)
        
        print(f"✅ 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            candidates = data.get("candidates", [])
            
            print(f"📦 후보 아이템 개수: {len(candidates)}")
            
            if candidates:
                print("\n첫 번째 아이템 정보:")
                first_item = candidates[0]
                print(f"  - ID: {first_item.get('id')}")
                print(f"  - Item ID: {first_item.get('item_id')}")
                print(f"  - 이름: {first_item.get('name')}")
                print(f"  - 카테고리: {first_item.get('category')}")
                print(f"  - 브랜드: {first_item.get('brand')}")
                print(f"  - 색상: {first_item.get('color')}")
                print(f"  - 보관 위치: {first_item.get('stored_place')}")
                
                # id와 item_id가 둘 다 있는지 확인
                has_id = 'id' in first_item
                has_item_id = 'item_id' in first_item
                
                if has_id and has_item_id:
                    print("\n✅ 필드 검증: id와 item_id 모두 존재")
                else:
                    print("\n⚠️ 필드 검증 실패:")
                    if not has_id:
                        print("  - 'id' 필드가 없습니다")
                    if not has_item_id:
                        print("  - 'item_id' 필드가 없습니다")
                
                return True, candidates
            else:
                print("⚠️ 등록된 아이템이 없습니다")
                return True, []
        else:
            print(f"❌ 오류: {response.status_code}")
            print(f"응답: {response.text}")
            return False, []
            
    except Exception as e:
        print(f"❌ 예외 발생: {e}")
        return False, []

def test_ai_search(query: str = "빨간색 상의"):
    """AI 서비스 /search 테스트"""
    print_separator(f"2. AI 서비스 검색 테스트 (쿼리: '{query}')")
    
    url = f"{AI_SERVICE_URL}/search"
    headers = {
        "Content-Type": "application/json",
        "X-Admin-Token": ADMIN_TOKEN
    }
    payload = {"query_text": query}
    
    try:
        print(f"📡 요청: POST {url}")
        print(f"🔑 헤더: X-Admin-Token: {ADMIN_TOKEN}")
        print(f"📝 페이로드: {json.dumps(payload, ensure_ascii=False)}")
        
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        print(f"✅ 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            
            print(f"🎯 검색 결과 개수: {len(results)}")
            
            if results:
                print("\n검색 결과 (상위 3개):")
                for i, item in enumerate(results[:3], 1):
                    print(f"\n  [{i}] {item.get('name')}")
                    print(f"      - ID: {item.get('id')} / Item ID: {item.get('item_id')}")
                    print(f"      - 점수: {item.get('score', 0):.1f}")
                    print(f"      - 이유: {item.get('reason', 'N/A')}")
                    print(f"      - 카테고리: {item.get('category')}")
                    print(f"      - 브랜드: {item.get('brand')}")
                    print(f"      - 색상: {item.get('color')}")
                
                return True, results
            else:
                print("⚠️ 검색 결과가 없습니다")
                return True, []
        else:
            print(f"❌ 오류: {response.status_code}")
            print(f"응답: {response.text}")
            return False, []
            
    except Exception as e:
        print(f"❌ 예외 발생: {e}")
        import traceback
        traceback.print_exc()
        return False, []

def run_all_tests():
    """모든 테스트 실행"""
    print("\n" + "🚀 검색 기능 통합 테스트 시작 " + "🚀\n")
    
    all_passed = True
    
    # 1. 백엔드 candidates 테스트
    backend_ok, candidates = test_backend_candidates()
    if not backend_ok:
        print("\n❌ 백엔드 테스트 실패")
        all_passed = False
    
    # 2. AI 검색 테스트
    ai_ok, results = test_ai_search("빨간색 상의")
    if not ai_ok:
        print("\n❌ AI 검색 테스트 실패")
        all_passed = False
    
    # 최종 결과
    print_separator("테스트 결과 요약")
    
    if all_passed:
        print("✅ 모든 테스트 통과!")
        print("\n다음 단계:")
        print("1. 백엔드 API 서버가 실행 중인지 확인")
        print("2. AI 서비스가 실행 중인지 확인")
        print("3. 프론트엔드에서 검색 기능 테스트")
        print(f"   - 프론트엔드 URL: http://localhost:3000/search")
    else:
        print("❌ 일부 테스트 실패")
        print("\n해결 방법:")
        print("1. 백엔드 API 서버 실행 확인:")
        print(f"   curl -H 'X-Admin-Token: {ADMIN_TOKEN}' {BACKEND_URL}/items/candidates")
        print("\n2. AI 서비스 실행 확인:")
        print(f"   curl -X POST {AI_SERVICE_URL}/search \\")
        print(f"        -H 'Content-Type: application/json' \\")
        print(f"        -H 'X-Admin-Token: {ADMIN_TOKEN}' \\")
        print(f"        -d '{{\"query_text\": \"빨간색 상의\"}}'")
    
    print("\n")

if __name__ == "__main__":
    run_all_tests()
