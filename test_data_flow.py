#!/usr/bin/env python3
"""
데이터 흐름 테스트 스크립트

3개 시나리오를 테스트:
1. 백엔드 → AI 간 JSON 통신
2. AI → 백엔드 → 프론트 데이터 형태
3. 전체 플로우 (프론트 → 백엔드 → AI → 백엔드 → 프론트)
"""

import requests
import json
from typing import Dict, Any

# 설정
BACKEND_URL = "http://localhost:8000"
AI_SERVICE_URL = "http://203.234.62.47:9000"  # LLM PC IP
AI_TOKEN = "dev-internal-secret"

def print_section(title: str):
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}\n")

def print_result(success: bool, message: str, data: Any = None):
    status = "✅ 성공" if success else "❌ 실패"
    print(f"{status}: {message}")
    if data:
        print(f"응답 데이터:\n{json.dumps(data, indent=2, ensure_ascii=False)}\n")

# ============================================================
# 테스트 1: 백엔드 → AI 간 JSON 통신
# ============================================================
def test_backend_to_ai():
    print_section("테스트 1: 백엔드 → AI 간 JSON 통신")
    
    try:
        payload = {
            "query_text": "검은색 지갑을 잃어버렸어요",
            "candidates": [
                {
                    "item_id": 1,
                    "name": "검은색 지갑",
                    "brand": "루이비통",
                    "color": "검은색",
                    "stored_place": "강남역",
                    "distance_km": 0.5,
                    "minutes_since_found": 120.0,
                    "features_text": "카드 여러 장"
                }
            ]
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-Internal-Token": AI_TOKEN
        }
        
        response = requests.post(
            f"{AI_SERVICE_URL}/rerank",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                required_fields = ["item_id", "rule_score", "llm_score", "reason_text"]
                has_all_fields = all(field in first_item for field in required_fields)
                
                if has_all_fields:
                    print_result(True, "AI 서비스 응답 형태 정상", data)
                else:
                    print_result(False, f"필수 필드 누락: {required_fields}", data)
            else:
                print_result(False, "응답이 배열이 아니거나 비어있음", data)
        else:
            print_result(False, f"HTTP {response.status_code}: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print_result(False, f"AI 서비스에 연결할 수 없음: {AI_SERVICE_URL}")
    except Exception as e:
        print_result(False, f"예외 발생: {str(e)}")

# ============================================================
# 테스트 2: 백엔드 API /search 엔드포인트
# ============================================================
def test_backend_search_api():
    print_section("테스트 2: 백엔드 /search 엔드포인트 (OpenAPI 계약)")
    
    try:
        payload = {
            "text": "검은색 지갑 잃어버렸습니다",
            "radius_km": 20.0
        }
        
        response = requests.post(
            f"{BACKEND_URL}/search",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            
            checks = {
                "data 키 존재": "data" in data,
                "error 키 존재": "error" in data,
                "top_n 존재": "data" in data and "top_n" in data["data"],
                "top_5 존재": "data" in data and "top_5" in data["data"],
                "reasons 존재": "data" in data and "reasons" in data["data"],
            }
            
            all_passed = all(checks.values())
            
            if all_passed and len(data["data"]["top_n"]) > 0:
                first_top_n = data["data"]["top_n"][0]
                has_item = "item" in first_top_n
                has_rule_score = "rule_score" in first_top_n
                
                if has_item and has_rule_score:
                    item = first_top_n["item"]
                    item_fields = ["id", "title", "brand", "color", "status"]
                    has_item_fields = all(field in item for field in item_fields)
                    
                    if has_item_fields:
                        print_result(True, "OpenAPI SearchResponse 형태 정상", {
                            "top_n_count": len(data["data"]["top_n"]),
                            "top_5_count": len(data["data"]["top_5"]),
                            "reasons_count": len(data["data"]["reasons"])
                        })
                    else:
                        print_result(False, f"ItemRead 필수 필드 누락", data)
                else:
                    print_result(False, "SearchCandidate 필드 누락", data)
            else:
                failed_checks = [k for k, v in checks.items() if not v]
                print_result(False, f"OpenAPI 계약 위반: {failed_checks}", data)
        else:
            print_result(False, f"HTTP {response.status_code}: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print_result(False, f"백엔드에 연결할 수 없음: {BACKEND_URL}")
    except Exception as e:
        print_result(False, f"예외 발생: {str(e)}")

# ============================================================
# 테스트 3: 전체 플로우
# ============================================================
def test_full_flow():
    print_section("테스트 3: 전체 데이터 플로우")
    
    print("📋 플로우: 프론트 → 백엔드 → AI → 백엔드 → 프론트\n")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/search",
            json={"text": "검은색 루이비통 지갑", "radius_km": 20.0},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if "data" in data and data["data"]:
                result = data["data"]
                
                print(f"📊 검색 결과:")
                print(f"   - 전체 후보: {len(result.get('top_n', []))}개")
                print(f"   - 상위 5개: {len(result.get('top_5', []))}개")
                print(f"   - AI 평가 이유: {len(result.get('reasons', []))}개\n")
                
                print_result(True, "전체 플로우 정상 동작")
            else:
                print_result(False, "응답 데이터 누락", data)
        else:
            print_result(False, f"HTTP {response.status_code}")
            
    except Exception as e:
        print_result(False, f"예외 발생: {str(e)}")

# ============================================================
# 메인 실행
# ============================================================
if __name__ == "__main__":
    print("\n" + "="*60)
    print(" 데이터 흐름 테스트 시작")
    print("="*60)
    
    test_backend_to_ai()
    test_backend_search_api()
    test_full_flow()
    
    print("\n" + "="*60)
    print(" 테스트 완료")
    print("="*60 + "\n")
