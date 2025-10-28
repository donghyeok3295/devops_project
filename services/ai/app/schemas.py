# services/ai/app/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional

class SearchRequest(BaseModel):
    """검색 요청 모델"""
    query: str = Field(..., description="자연어 검색 쿼리")
    items: List['SearchItem'] = Field(..., description="비교할 분실물 목록")

class SearchItem(BaseModel):
    """비교 대상 분실물 정보"""
    id: int
    name: str
    category: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    features: Optional[str] = None
    stored_place: Optional[str] = None

class SearchScore(BaseModel):
    """검색 결과 점수"""
    item_id: int
    score: float = Field(..., ge=0, le=100, description="유사도 점수 (0-100)")
    reason: str = Field(..., description="매칭 이유 설명")

class SearchResponse(BaseModel):
    """검색 응답 모델"""
    query: str
    results: List[SearchScore]