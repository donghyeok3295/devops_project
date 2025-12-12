#!/usr/bin/env python3
"""
독립형 AI 검색 테스트 스크립트
Oracle DB 없이 JSON 파일로 테스트

사용법:
    python test_standalone.py "빨간색 아이폰"
"""

import json
import sys
import os

# 현재 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services', 'ai'))

from app.services.pipeline import rerank
from app.services import llm


async def main():
    # 검색어
    if len(sys.argv) < 2:
        query = "아이폰"
        print(f"검색어가 제공되지 않았습니다. 기본값 '{query}' 사용")
    else:
        query = sys.argv[1]

    print("=" * 60)
    print(f"🔍 AI 검색 테스트")
    print("=" * 60)
    print(f"검색어: {query}")
    print()

    # JSON 파일에서 후보 데이터 로드
    print("📂 테스트 데이터 로드 중...")
    with open('test_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    candidates = data.get('candidates', [])
    print(f"✅ {len(candidates)}개 아이템 로드 완료")
    print()

    # 후보 데이터 준비 (AI 서비스 형식으로 변환)
    prepared_candidates = []
    for item in candidates:
        prepared_candidates.append({
            "item_id": item.get("id"),
            "name": item.get("name"),
            "category": item.get("category"),
            "brand": item.get("brand"),
            "color": item.get("color"),
            "stored_place": item.get("stored_place"),
            "features_text": item.get("features"),
        })

    print("🤖 AI 매칭 엔진 실행 중...")
    print("-" * 60)

    # Rerank 실행
    results = await rerank(query, prepared_candidates)

    print()
    print("=" * 60)
    print("🎯 검색 결과 (Top 5)")
    print("=" * 60)
    print()

    # 결과 출력
    for i, result in enumerate(results[:5], 1):
        item_id = result.get("item_id")

        # 원본 아이템 찾기
        original = next((item for item in candidates if item.get("id") == item_id), None)

        if original:
            print(f"[{i}위] {original.get('name')}")
            print(f"   📍 보관 장소: {original.get('stored_place')}")
            print(f"   🏷️  브랜드: {original.get('brand')} | 색상: {original.get('color')}")
            print(f"   📊 점수:")
            print(f"       - 규칙 점수: {result.get('rule_score', 0):.3f}")
            print(f"       - LLM 점수: {result.get('llm_score', 0):.3f}")
            print(f"   💬 매칭 근거: {result.get('reason_text', 'N/A')}")
            print()

    print("=" * 60)
    print("✅ 테스트 완료")
    print("=" * 60)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
