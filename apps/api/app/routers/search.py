from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..db import get_db
from ..models import Item
from ..security import get_current_user

router = APIRouter(prefix="/search", tags=["search"])

# 🔍 검색 요청 모델
class SearchQuery(BaseModel):
    query: str
    category: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None

# 🔍 간단한 규칙 기반 검색 (이름 / 브랜드 / 색상에 LIKE)
@router.post("")
def search_items(payload: SearchQuery, db: Session = Depends(get_db)):
    q = db.query(Item)

    if payload.category:
        q = q.filter(Item.category.ilike(f"%{payload.category}%"))
    if payload.color:
        q = q.filter(Item.color.ilike(f"%{payload.color}%"))
    if payload.brand:
        q = q.filter(Item.brand.ilike(f"%{payload.brand}%"))
    if payload.query:
        q = q.filter(Item.name.ilike(f"%{payload.query}%"))

    results = q.order_by(Item.created_at.desc()).limit(10).all()
    return [
        {
            "id": i.id,
            "name": i.name,
            "category": i.category,
            "color": i.color,
            "status": i.status,
            "created_at": i.created_at,
        }
        for i in results
    ]
