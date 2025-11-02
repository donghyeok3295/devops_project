from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
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

# 🔍 GET 방식 검색 (AI 서버 통합)
@router.get("")
async def search_items_get(
    q: str = Query(..., description="검색 쿼리"),
    db: Session = Depends(get_db),
):
    """
    GET 방식 검색 - AI 서버와 통합
    1. DB에서 후보 아이템 가져오기
    2. AI 서버로 LLM 기반 점수 계산 요청
    3. 점수 높은 순으로 정렬하여 반환
    """
    # 1. DB에서 보관 중인 모든 아이템 가져오기
    candidates = db.query(Item).filter(Item.status == ItemStatus.STORED).all()
    
    if not candidates:
        return {"results": [], "query": q}
    
    # 2. AI 서버로 보낼 후보 데이터 준비
    ai_candidates = []
    for item in candidates:
        ai_candidates.append({
            "item_id": item.id,
            "name": item.name,
            "category": item.category,
            "brand": item.brand,
            "color": item.color,
            "stored_place": item.stored_place,
            "features_text": item.features,
        })
    
    # 3. AI 서버 호출
    ai_service_url = os.getenv("AI_SERVICE_URL", "http://203.234.62.47:9000")
    ai_token = os.getenv("AI_INTERNAL_TOKEN", "dev-internal-secret")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ai_service_url}/search",
                json={
                    "query_text": q,
                    "candidates": ai_candidates
                },
                headers={"X-Admin-Token": ai_token}
            )
            
            if response.status_code != 200:
                print(f"[ERROR] AI 서버 응답 실패: {response.status_code}")
                # AI 서버 실패 시 폴백: 규칙 기반 검색
                return _fallback_search(q, candidates, db)
            
            ai_results = response.json()
            
    except Exception as e:
        print(f"[ERROR] AI 서버 호출 실패: {str(e)}")
        # AI 서버 연결 실패 시 폴백
        return _fallback_search(q, candidates, db)
    
    # 4. AI 결과를 item_id로 매핑
    scored_map = {}
    for result in ai_results.get("results", []):
        item_id = result.get("item_id")
        scored_map[item_id] = {
            "score": result.get("score", 0.0),
            "reason": result.get("reason", "")
        }
    
    # 5. 결과 포맷팅 (점수 높은 순)
    results = []
    for item in candidates:
        if item.id in scored_map:
            photos = db.query(ItemPhoto).filter(ItemPhoto.item_id == item.id).limit(2).all()
            
            score_data = scored_map[item.id]
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
                "score": score_data["score"],
                "reason": score_data["reason"]
            })
    
    # 점수 순으로 정렬
    results.sort(key=lambda x: x["score"], reverse=True)
    
    # Top 10 반환
    return {"results": results[:10], "query": q}


def _fallback_search(q: str, candidates: List[Item], db: Session):
    """AI 서버 실패 시 규칙 기반 검색으로 폴백"""
    print("[FALLBACK] 규칙 기반 검색 사용")
    
    scored_items = []
    keywords = [k.lower() for k in q.strip().split() if len(k) > 1]
    
    for item in candidates:
        score = 0.0
        reasons = []
        
        # 제목 매칭
        item_name_lower = (item.name or "").lower()
        if q.lower() in item_name_lower:
            score += 40
            reasons.append("제목 완전 일치")
        elif any(kw in item_name_lower for kw in keywords):
            score += 30
            matched_kw = [kw for kw in keywords if kw in item_name_lower]
            reasons.append(f"제목 키워드 일치")
        
        # 카테고리 매칭
        if item.category:
            category_lower = item.category.lower()
            if any(kw in category_lower for kw in keywords):
                score += 15
                reasons.append(f"카테고리 일치")
        
        # 브랜드 매칭
        if item.brand:
            brand_lower = item.brand.lower()
            if any(kw in brand_lower for kw in keywords):
                score += 15
                reasons.append(f"브랜드 일치")
        
        # 색상 매칭
        if item.color:
            color_lower = item.color.lower()
            if any(kw in color_lower for kw in keywords):
                score += 15
                reasons.append(f"색상 일치")
        
        score = min(score, 100.0)
        
        if score >= 10:
            scored_items.append({
                "item": item,
                "score": round(score, 1),
                "reason": " | ".join(reasons) if reasons else "일반 매칭"
            })
    
    scored_items.sort(key=lambda x: x["score"], reverse=True)
    
    results = []
    for item_data in scored_items[:10]:
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