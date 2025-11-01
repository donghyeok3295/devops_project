import os
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.services.pipeline import rerank as run_pipeline

router = APIRouter(prefix="/rerank", tags=["rerank"])

class Candidate(BaseModel):
    item_id: int = Field(...)
    name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    stored_place: Optional[str] = None
    distance_km: Optional[float] = None
    minutes_since_found: Optional[float] = None
    features_text: Optional[str] = None

class RerankRequest(BaseModel):
    query_text: str = Field(...)
    candidates: List[Candidate] = Field(..., min_items=0)

def _require_token_or_bypass(token_from_env: Optional[str], provided: Optional[str]) -> None:
    configured = (token_from_env or "").strip()
    if not configured:
        return  # 토큰 미설정 → 개발 모드로 우회
    if (provided or "").strip() != configured:
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.post("")
async def rerank_endpoint(
    req: RerankRequest,
    x_internal_token: Optional[str] = Header(default=None, alias="X-Internal-Token"),
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    # 우선순위: ADMIN_TOKEN > AI_INTERNAL_TOKEN
    configured = (os.getenv("ADMIN_TOKEN") or settings.ai_internal_token or "").strip()
    provided = (x_internal_token or x_admin_token or "").strip()
    _require_token_or_bypass(configured, provided)

    if not (req.query_text or "").strip():
        raise HTTPException(status_code=400, detail="Empty query_text")

    if not req.candidates:
        return []

    if len(req.candidates) > 50:
        raise HTTPException(status_code=400, detail="Too many candidates (>50)")

    out = await run_pipeline(req.query_text, [c.model_dump() for c in req.candidates])
    return out
