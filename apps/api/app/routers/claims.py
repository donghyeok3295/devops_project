from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..db import get_db
from ..models import Claim, Item, ClaimStatus, ItemStatus
from ..security import get_current_user

router = APIRouter(prefix="/claims", tags=["claims"])


class ClaimCreateIn(BaseModel):
  item_id: int
  memo: str | None = None


@router.get("/mine")
def my_claims(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
  claims = (
    db.query(Claim)
    .filter(Claim.seeker_id == int(user_id))
    .order_by(Claim.created_at.desc())
    .all()
  )
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


@router.post("/")
def create_claim(payload: ClaimCreateIn, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
  item = db.query(Item).get(payload.item_id)
  if not item:
    raise HTTPException(status_code=404, detail="Item not found")

  if item.finder_id == int(user_id):
    raise HTTPException(status_code=403, detail="Cannot claim your own item")

  existing_claim = (
    db.query(Claim)
    .filter(
      Claim.item_id == item.id,
      Claim.seeker_id == int(user_id),
      Claim.status == ClaimStatus.PENDING,
    )
    .first()
  )
  if existing_claim:
    raise HTTPException(status_code=400, detail="Already requested return for this item")

  new_claim = Claim(item_id=item.id, seeker_id=int(user_id), memo=payload.memo)
  db.add(new_claim)
  db.commit()
  db.refresh(new_claim)
  return {"id": new_claim.id, "status": new_claim.status, "message": "Return request submitted successfully"}


@router.get("/")
def owner_claims(
  status: Optional[ClaimStatus] = Query(default=None),
  db: Session = Depends(get_db),
  user_id: str = Depends(get_current_user),
):
  q = (
    db.query(Claim, Item)
    .join(Item, Claim.item_id == Item.id)
    .filter(Item.finder_id == int(user_id))
    .order_by(Claim.created_at.desc())
  )
  if status:
    q = q.filter(Claim.status == status)
  rows = q.all()
  return {
    "items": [
      {
        "id": c.id,
        "item_id": c.item_id,
        "item_name": i.name,
        "message": c.memo,
        "status": c.status,
        "created_at": c.created_at,
      }
      for c, i in rows
    ]
  }


@router.get("/count/")
def count_claims(
  status: Optional[ClaimStatus] = Query(default=None),
  db: Session = Depends(get_db),
  user_id: str = Depends(get_current_user),
):
  q = (
    db.query(Claim)
    .join(Item, Claim.item_id == Item.id)
    .filter(Item.finder_id == int(user_id))
  )
  if status:
    q = q.filter(Claim.status == status)
  return {"count": q.count()}


@router.patch("/{claim_id}")
def update_claim_status(
  claim_id: int,
  status: ClaimStatus,
  db: Session = Depends(get_db),
  user_id: str = Depends(get_current_user),
):
  claim = db.query(Claim).get(claim_id)
  if not claim:
    raise HTTPException(status_code=404, detail="Claim not found")

  item = db.query(Item).get(claim.item_id)
  if not item:
    raise HTTPException(status_code=404, detail="Item not found")

  if item.finder_id != int(user_id):
    raise HTTPException(status_code=403, detail="Not allowed")

  claim.status = status
  if status == ClaimStatus.APPROVED and item.status != ItemStatus.HANDED_OVER:
    item.status = ItemStatus.HANDED_OVER

  db.commit()
  db.refresh(claim)
  return {"id": claim.id, "status": claim.status}

