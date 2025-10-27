from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from app.services.pipeline import rerank as run_pipeline

router = APIRouter(prefix="/rerank", tags=["rerank"])

# ✅ 환경 변수에서 관리자 토큰 로드
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")


# ==============================
# 📦 Request / Response Models
# ==============================
class Candidate(BaseModel):
    item_id: int
    category: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: Optional[str] = None
    features_text: Optional[str] = None


class RerankRequest(BaseModel):
    query_text: str = Field(..., min_length=1)
    candidates: List[Candidate]


class RerankResponse(BaseModel):
    item_id: int
    rule_score: float
    llm_score: float
    reason_text: List[str]


# ==============================
# 🚀 /rerank 엔드포인트
# ==============================
@router.post("", response_model=List[RerankResponse])
async def rerank(
    req: RerankRequest,
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token")
):
    """
    분실물 검색 결과를 규칙 기반 + LLM 기반으로 재순위화합니다.
    접근 시 'X-Admin-Token' 헤더에 ADMIN_TOKEN(.env)을 포함해야 합니다.
    """

    # ✅ 1. 토큰 검증
    if ADMIN_TOKEN and x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")

    # ✅ 2. 입력 검증
    if not req.query_text.strip():
        raise HTTPException(status_code=400, detail="Empty query_text")

    if req.candidates is None:
        raise HTTPException(status_code=400, detail="candidates is required")

    if len(req.candidates) == 0:
        return []

    # ✅ 3. 파이프라인 실행
    out = await run_pipeline(req.query_text, [c.model_dump() for c in req.candidates])
    return out
