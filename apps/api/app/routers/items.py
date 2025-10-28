# apps/api/app/routers/items.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional

from ..db import get_db
from ..models import Item, ItemPhoto, ItemStatus
from ..security import get_current_user_optional, get_current_user

router = APIRouter(prefix="/items", tags=["items"])

# ---------- Pydantic Schemas ----------
class PhotoIn(BaseModel):
    url: str
    exif_json: Optional[str] = None

class ItemCreateIn(BaseModel):
    name: str
    category: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    size: Optional[str] = None
    features: Optional[str] = None
    accessories: Optional[str] = None
    serial_masked: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    stored_place: Optional[str] = None
    photos: List[PhotoIn] = Field(min_items=2)  # 사진 2장 이상

class ItemOut(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    color: Optional[str] = None
    status: ItemStatus

    class Config:
        from_attributes = True  # pydantic v2

# ---------- Helpers ----------
ALLOWED_TRANSITIONS = {
    ItemStatus.STORED: {ItemStatus.CLAIMED},
    ItemStatus.CLAIMED: {ItemStatus.HANDED_OVER, ItemStatus.STORED},
    ItemStatus.HANDED_OVER: set(),
}

def ensure_transition(old: ItemStatus, new: ItemStatus):
    if new not in ALLOWED_TRANSITIONS.get(old, set()):
        raise HTTPException(status_code=400, detail=f"Invalid status transition: {old} -> {new}")

# ---------- Endpoints ----------

# 등록(로그인 필수)
@router.post("", status_code=201)
def create_item(
    payload: ItemCreateIn,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    item = Item(
        finder_id=int(user_id),
        name=payload.name,
        category=payload.category,
        brand=payload.brand,
        model=payload.model,
        color=payload.color,
        material=payload.material,
        size=payload.size,
        features=payload.features,
        accessories=payload.accessories,
        serial_masked=payload.serial_masked,
        lat=payload.lat,
        lng=payload.lng,
        stored_place=payload.stored_place,
        status=ItemStatus.STORED,
    )
    db.add(item)
    db.flush()  # item.id 확보

    for p in payload.photos:
        db.add(ItemPhoto(item_id=item.id, url=p.url, exif_json=p.exif_json))

    db.commit()
    return {"id": item.id, "status": item.status}

# 목록(로그인 필수)
@router.get("", response_model=List[ItemOut])
def list_items(
    db: Session = Depends(get_db),
    status: Optional[ItemStatus] = Query(None),
    mine: bool = Query(False, description="내가 등록한 것만 보기"),
    limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user),
):
    q = db.query(Item)
    if status:
        q = q.filter(Item.status == status)
    if mine:
        q = q.filter(Item.finder_id == int(user_id))
    rows = q.order_by(Item.created_at.desc()).limit(limit).all()
    return rows

# 내 목록(로그인 필수)
@router.get("/mine", response_model=List[ItemOut])
def my_items(
    db: Session = Depends(get_db),
    status: Optional[ItemStatus] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user),
):
    q = db.query(Item).filter(Item.finder_id == int(user_id))
    if status:
        q = q.filter(Item.status == status)
    rows = q.order_by(Item.created_at.desc()).limit(limit).all()
    return rows


# 📊 통계(게스트 허용) — mine=true이면 토큰 필수
@router.get("/stats")
def stats(
    db: Session = Depends(get_db),
    mine: bool = Query(False, description="내가 등록한 것만 집계"),
    user_id: Optional[str] = Depends(get_current_user_optional),
):
    if mine and not user_id:
        # '내 것만' 보려면 로그인 필요
        raise HTTPException(status_code=401, detail="Missing token")

    base_q = db.query(Item)
    if mine:
        base_q = base_q.filter(Item.finder_id == int(user_id))

    total = base_q.count()

    stored_q = db.query(Item).filter(Item.status == ItemStatus.STORED)
    if mine:
        stored_q = stored_q.filter(Item.finder_id == int(user_id))
    stored = stored_q.count()

    handed_q = db.query(Item).filter(Item.status == ItemStatus.HANDED_OVER)
    if mine:
        handed_q = handed_q.filter(Item.finder_id == int(user_id))
    handed = handed_q.count()

    online = 234  # TODO: 실제 지표로 교체

    return {"total": total, "stored": stored, "handed": handed, "online": online}


# 상세(로그인 필수) — 필요하면 게스트 허용으로 바꿔도 됨
@router.get("/{item_id}")
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    photos = db.query(ItemPhoto).filter(ItemPhoto.item_id == item.id).all()
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "brand": item.brand,
        "model": item.model,
        "color": item.color,
        "material": item.material,
        "size": item.size,
        "features": item.features,
        "accessories": item.accessories,
        "serial_masked": item.serial_masked,
        "lat": item.lat,
        "lng": item.lng,
        "stored_place": item.stored_place,
        "status": item.status,
        "created_at": item.created_at,
        "photos": [{"id": p.id, "url": p.url} for p in photos],
    }

# 상태 변경(로그인 필수)
@router.patch("/{item_id}/status")
def update_status(
    item_id: int,
    new_status: ItemStatus,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.finder_id != int(user_id):
        raise HTTPException(status_code=403, detail="Not your item")

    ensure_transition(item.status, new_status)
    item.status = new_status
    db.commit()
    return {"id": item.id, "status": item.status}

# DELETE 엔드포인트
@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """분실물 삭제 (사진도 함께 삭제)"""
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.finder_id != int(user_id):
        raise HTTPException(status_code=403, detail="Not your item")
    
    # 사진 삭제는 cascade로 자동 삭제됨
    db.delete(item)
    db.commit()
    return {"ok": True}

# PATCH 엔드포인트 (전체 업데이트)
@router.patch("/{item_id}")
def patch_item(
    item_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """분실물 상태 변경 (전체 업데이트)"""
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.finder_id != int(user_id):
        raise HTTPException(status_code=403, detail="Not your item")
    
    # status 필드만 업데이트
    if "status" in payload:
        item.status = ItemStatus(payload["status"])
        db.commit()
        return {"id": item.id, "status": item.status}
    
    return {"id": item.id}

