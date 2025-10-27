# apps/api/app/routers/stats.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Item, ItemStatus
from ..utils.response import ok

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    total = db.query(Item).count()
    stored = db.query(Item).filter(Item.status == ItemStatus.STORED).count()
    handed = db.query(Item).filter(Item.status == ItemStatus.HANDED_OVER).count()
    online = 234  # MVP 스텁(추후 세션/핑 기반으로 계산)
    return ok({"total": total, "stored": stored, "handed": handed, "online": online})
