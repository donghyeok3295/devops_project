from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..db import get_db
from ..models import Item, ItemStatus, ItemPhoto
from ..security import get_current_user_optional

router = APIRouter(prefix="/search", tags=["search"])

# 🔍 검색 요청 모델
class SearchQuery(BaseModel):
    query: str
    category: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None

# 🔍 자연어 기반 검색 (LLM 통합 대비)
@router.post("")
def search_items(payload: SearchQuery, db: Session = Depends(get_db)):
    """
    자연어 검색 엔드포인트
    현재는 규칙 기반 필터링만 제공, 추후 LLM 서비스와 통합 예정
    """
    q = db.query(Item).filter(Item.status == ItemStatus.STORED)

    # 검색 쿼리를 파싱하여 키워드 추출
    keywords = payload.query.strip().split() if payload.query else []
    
    # 키워드 기반 필터링 (이름, 설명, 카테고리, 브랜드, 색상에서 검색)
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
        from sqlalchemy import or_
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
        # 사진 정보 가져오기
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

# 🔍 GET 방식 검색 (URL 쿼리 파라미터)
@router.get("")
def search_items_get(
    q: str = Query(..., description="검색 쿼리"),
    db: Session = Depends(get_db),
):
    """
    GET 방식 검색 (results 페이지에서 사용)
    LLM 기반 유사도 점수 계산 및 Top 5 반환
    """
    # 1. 전체 DB에서 후보 아이템 가져오기
    candidates = db.query(Item).filter(Item.status == ItemStatus.STORED).all()
    
    if not candidates:
        return {"results": [], "query": q}
    
    # 2. 각 후보 아이템에 대해 유사도 점수 계산
    scored_items = []
    keywords = [k.lower() for k in q.strip().split() if len(k) > 1]
    
    for item in candidates:
        score = 0.0
        reasons = []
        
        # 2-1. 제목 매칭 (가장 높은 가중치)
        item_name_lower = (item.name or "").lower()
        if q.lower() in item_name_lower:
            score += 40
            reasons.append("제목 완전 일치")
        elif any(kw in item_name_lower for kw in keywords):
            score += 30
            matched_kw = [kw for kw in keywords if kw in item_name_lower]
            reasons.append(f"제목 키워드 일치 ({', '.join(matched_kw)})")
        
        # 2-2. 카테고리 매칭
        if item.category:
            category_lower = item.category.lower()
            if any(kw in category_lower for kw in keywords):
                score += 15
                matched_kw = [kw for kw in keywords if kw in category_lower]
                reasons.append(f"카테고리 일치 ({', '.join(matched_kw)})")
        
        # 2-3. 브랜드 매칭
        if item.brand:
            brand_lower = item.brand.lower()
            if any(kw in brand_lower for kw in keywords):
                score += 15
                matched_kw = [kw for kw in keywords if kw in brand_lower]
                reasons.append(f"브랜드 일치 ({', '.join(matched_kw)})")
        
        # 2-4. 색상 매칭
        if item.color:
            color_lower = item.color.lower()
            if any(kw in color_lower for kw in keywords):
                score += 15
                matched_kw = [kw for kw in keywords if kw in color_lower]
                reasons.append(f"색상 일치 ({', '.join(matched_kw)})")
        
        # 2-5. 특성/기능 매칭
        if item.features:
            features_lower = item.features.lower()
            if any(kw in features_lower for kw in keywords):
                score += 10
                matched_kw = [kw for kw in keywords if kw in features_lower]
                reasons.append(f"설명 키워드 일치 ({', '.join(matched_kw)})")
        
        # 2-6. 보관 위치 매칭
        if item.stored_place:
            place_lower = item.stored_place.lower()
            if any(kw in place_lower for kw in keywords):
                score += 5
                matched_kw = [kw for kw in keywords if kw in place_lower]
                reasons.append(f"보관 위치 일치 ({', '.join(matched_kw)})")
        
        # 최대 점수는 100점
        score = min(score, 100.0)
        
        # 점수가 10점 이상인 아이템만 저장
        if score >= 10:
            scored_items.append({
                "item": item,
                "score": round(score, 1),
                "reason": " | ".join(reasons) if reasons else "일반 매칭"
            })
    
    # 3. 점수 높은 순으로 정렬하고 Top 5 선정
    scored_items.sort(key=lambda x: x["score"], reverse=True)
    top_5 = scored_items[:5]
    
    # 4. 결과 포맷팅
    results = []
    for item_data in top_5:
        item = item_data["item"]
        photos = db.query(ItemPhoto).filter(ItemPhoto.item_id == item.id).limit(2).all()
        
        results.append({
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
            "score": item_data["score"],
            "reason": item_data["reason"]
        })
    
    return {"results": results, "query": q}
