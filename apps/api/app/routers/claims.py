from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from ..db import get_db
from ..models import Claim, Item, ClaimStatus
from ..security import get_current_user

router = APIRouter(prefix="/claims", tags=["claims"])

# ✉️ 클레임 생성용 모델
class ClaimCreateIn(BaseModel):
    item_id: int
    memo: str | None = None

# ✉️ 내 클레임 목록
@router.get("/mine")
def my_claims(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    claims = db.query(Claim).filter(Claim.seeker_id == int(user_id)).order_by(Claim.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "item_id": c.item_id,
            "memo": c.memo,
            "status": c.status,
            "created_at": c.created_at,
        }
        for c in claims
    ]

# ✉️ 클레임 생성 (반환 요청)
@router.post("/")
def create_claim(payload: ClaimCreateIn, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    item = db.query(Item).get(payload.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # 자신이 등록한 물건에는 반환 요청할 수 없음
    if item.finder_id == int(user_id):
        raise HTTPException(status_code=403, detail="Cannot claim your own item")

    # 이미 반환 요청한 경우 체크
    existing_claim = db.query(Claim).filter(
        Claim.item_id == item.id,
        Claim.seeker_id == int(user_id),
        Claim.status == ClaimStatus.PENDING
    ).first()

    if existing_claim:
        raise HTTPException(status_code=400, detail="Already requested return for this item")

    new_claim = Claim(item_id=item.id, seeker_id=int(user_id), memo=payload.memo)
    db.add(new_claim)

    # 아이템 상태를 CLAIMED로 변경
    from ..models import ItemStatus
    if item.status == ItemStatus.STORED:
        item.status = ItemStatus.CLAIMED

    db.commit()
    db.refresh(new_claim)
    return {"id": new_claim.id, "status": new_claim.status, "message": "Return request submitted successfully"}

# ✉️ (선택) 클레임 상태 변경 (승인/거절)
@router.patch("/{claim_id}")
def update_claim_status(claim_id: int, status: ClaimStatus, db: Session = Depends(get_db)):
    claim = db.query(Claim).get(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim.status = status
    db.commit()
    return {"id": claim.id, "status": claim.status}
