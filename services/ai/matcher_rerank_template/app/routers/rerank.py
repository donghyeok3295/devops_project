import os
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from app.config import settings
from app.services.pipeline import rerank as run_pipeline

router = APIRouter(prefix="/rerank", tags=["rerank"])

INTERNAL = settings.ai_internal_token or settings.admin_token

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
    candidates: List[Candidate] = Field(...)

@router.post("")
async def rerank_endpoint(
    req: RerankRequest,
    x_internal_token: Optional[str] = Header(default=None, alias="X-Internal-Token"),
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    expected = INTERNAL
    provided = x_internal_token or x_admin_token
    if expected and provided != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not req.query_text.strip():
        raise HTTPException(status_code=400, detail="Empty query_text")

    if not req.candidates:
        return []

    out = await run_pipeline(req.query_text, [c.model_dump() for c in req.candidates])
    return out
