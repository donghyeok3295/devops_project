# services/ai/app/routers/rerank.py

from fastapi import APIRouter
from app.matching_engine import match_item



router = APIRouter(
    prefix="/rerank",
    tags=["rerank"]
)

# ------------------------
# 🔥 인증 제거 버전
# 기존 dependencies=[...] 모두 삭제
# ------------------------

@router.post("/")
async def rerank_items(payload: dict):
    """
    Rerank API (Authorization-free)
    - user_input: 사용자 입력 정보
    - candidates: DB에서 가져온 후보 아이템들
    """
    
    # JSON 파싱
    try:
        user_input = payload["user_input"]
        candidates = payload["candidates"]
    except Exception:
        return {"error": "Invalid JSON structure. Require 'user_input' and 'candidates'."}

    results = []
    for c in candidates:
        result = match_item(user_input, c)
        results.append(result)

    # final_score 기준 내림차순 정렬
    results = sorted(results, key=lambda x: x["final_score"], reverse=True)

    return {
        "count": len(results),
        "results": results
    }
