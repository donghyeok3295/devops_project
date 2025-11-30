from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import or_
from ..db import get_db
from ..models import Item, ItemStatus, ItemPhoto

router = APIRouter(prefix="/search", tags=["search"])

# 🔍 검색 요청 모델 (간단한 규칙 기반 검색용)
class SearchQuery(BaseModel):
    query: str
    category: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None

# 🔍 간단한 규칙 기반 검색 (백업용)
# 프론트엔드는 AI 서버를 직접 호출하므로 이 엔드포인트는 선택적
@router.post("")
def search_items(payload: SearchQuery, db: Session = Depends(get_db)):
    """
    간단한 키워드 기반 검색
    프론트엔드는 AI 서버를 직접 호출합니다 (POST /search)
    이 엔드포인트는 AI 서버 없이 사용할 때의 백업용입니다.
    """
    q = db.query(Item).filter(Item.status == ItemStatus.STORED)

    # 키워드 기반 필터링
    keywords = payload.query.strip().split() if payload.query else []
    if keywords:
        or_conditions = []
        for kw in keywords:
            or_conditions.extend([
                Item.name.ilike(f"%{kw}%"),
                Item.features.ilike(f"%{kw}%"),
                Item.category.ilike(f"%{kw}%"),
                Item.brand.ilike(f"%{kw}%"),
                Item.color.ilike(f"%{kw}%"),
            ])
        q = q.filter(or_(*or_conditions))

    if payload.category:
        q = q.filter(Item.category.ilike(f"%{payload.category}%"))
    if payload.color:
        q = q.filter(Item.color.ilike(f"%{payload.color}%"))
    if payload.brand:
        q = q.filter(Item.brand.ilike(f"%{payload.brand}%"))

    results = q.order_by(Item.created_at.desc()).limit(20).all()
    
    # 결과 포맷팅
    items = []
    for item in results:
        photos = db.query(ItemPhoto).filter(ItemPhoto.item_id == item.id).limit(2).all()
        items.append({
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "brand": item.brand,
            "color": item.color,
            "status": item.status,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "photos": [{"url": p.url} for p in photos],
            "thumb_url": photos[0].url if photos else None,
            "stored_place": item.stored_place,
        })
    
    return items