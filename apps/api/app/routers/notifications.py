# apps/api/app/routers/notifications.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/unread_count")
def unread_count(db: Session = Depends(get_db)):
    """읽지 않은 알림 개수 (게스트 허용, 0 반환)"""
    return {"count": 0}

