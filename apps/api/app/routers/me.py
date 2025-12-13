# apps/api/app/routers/me.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..db import get_db
from ..models import Item, User, ItemStatus, Claim, ClaimStatus
from ..security import get_current_user

router = APIRouter(prefix="/me", tags=["me"])

@router.get("/items")
def get_my_items(
    db: Session = Depends(get_db),
    status: Optional[ItemStatus] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user),
):
    """내가 등록한 분실물 목록"""
    q = db.query(Item).filter(Item.finder_id == int(user_id))
    
    if status:
        q = q.filter(Item.status == status)
    
    total = q.count()
    items = q.order_by(Item.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return {
        "items": [
            {
                "id": item.id,
                "name": item.name,
                "status": item.status,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "thumb_url": item.photos[0].url if item.photos else None,
                "photos": [{"url": p.url} for p in item.photos[:2]] if item.photos else [],
                "attributes": {
                    "category": item.category or "",
                    "brand": item.brand,
                    "color": item.color,
                },
            }
            for item in items
        ],
        "pagination": {
            "page": page,
            "size": size,
            "total": total,
        }
    }

@router.get("/stats")
def get_my_stats(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """내 통계"""
    user_id_int = int(user_id)
    
    total = db.query(Item).filter(Item.finder_id == user_id_int).count()
    stored = db.query(Item).filter(
        Item.finder_id == user_id_int,
        Item.status == ItemStatus.STORED
    ).count()
    handed_over = db.query(Item).filter(
        Item.finder_id == user_id_int,
        Item.status == ItemStatus.HANDED_OVER
    ).count()
    
    return {
        "total": total,
        "stored": stored,
        "handed_over": handed_over,
        "online": 0,
    }

@router.get("/activities")
def get_my_activities(
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    user_id: str = Depends(get_current_user),
):
    """내 활동 목록"""
    user_id_int = int(user_id)
    
    items = db.query(Item).filter(
        Item.finder_id == user_id_int
    ).order_by(Item.created_at.desc()).limit(limit).all()
    
    def _time_ago(dt: datetime) -> str:
        if not dt:
            return "알 수 없음"
        s = (datetime.now() - dt.replace(tzinfo=None)).total_seconds()
        if s < 60:
            return "방금 전"
        elif s < 3600:
            return f"{int(s // 60)}분 전"
        elif s < 86400:
            return f"{int(s // 3600)}시간 전"
        else:
            return f"{int(s // 86400)}일 전"
    
    activities = []
    for item in items:
        # 반환 완료된 경우에는 반환 기록만 추가
        if item.status == ItemStatus.HANDED_OVER:
            activities.append({
                "id": f"return_{item.id}",
                "type": "RETURNED",
                "title": f"{item.name} 분실물 반환",
                "desc": f"{item.name} — 반환 완료",
                "ago": _time_ago(item.created_at),
                "badge": "DONE",
                "icon": "CHECK",
                "created_at": item.created_at  # 정렬용
            })
        else:
            # 보관 중인 경우에는 등록 기록만 추가
            activities.append({
                "id": f"register_{item.id}",
                "type": "CREATED",
                "title": f"{item.name} 분실물 등록",
                "desc": f"{item.name} — {item.status}",
                "ago": _time_ago(item.created_at),
                "badge": "ONGOING",
                "icon": "CLOCK",
                "created_at": item.created_at  # 정렬용
            })
    
    # 시간 순으로 정렬 (최신순) - created_at 필드 기준
    activities.sort(key=lambda x: x.get("created_at") or datetime.min, reverse=True)
    
    # created_at 필드 제거 후 반환
    for act in activities:
        act.pop("created_at", None)
    
    return activities[:limit] if len(activities) > limit else activities

@router.get("/return-requests/pending-count")
def pending_return_requests_count(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    count = (
        db.query(Claim)
        .join(Item, Claim.item_id == Item.id)
        .filter(Item.finder_id == int(user_id), Claim.status == ClaimStatus.PENDING)
        .count()
    )
    return {"count": count}

@router.get("/return-requests")
def incoming_return_requests(
    status: ClaimStatus = Query(ClaimStatus.PENDING),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    claims = (
        db.query(Claim)
        .join(Item, Claim.item_id == Item.id)
        .filter(Item.finder_id == int(user_id))
        .filter(Claim.status == status)
        .order_by(Claim.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "item_id": c.item_id,
            "item_name": c.item.name if c.item else None,
            "seeker_id": c.seeker_id,
            "memo": c.memo,
            "status": c.status,
            "created_at": c.created_at,
        }
        for c in claims
    ]

@router.get("/profile")
def get_my_profile(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """내 프로필"""
    user = db.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
