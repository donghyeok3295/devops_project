# apps/api/app/routers/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from sqlalchemy import text

router = APIRouter(  tags=["health"])

@router.get("/health")
def health():
    return {"ok": True}

@router.get("/db/health")
def db_health(db: Session = Depends(get_db)):
    # Oracle 연결 확인
    status = db.execute(text("SELECT 'UP' FROM dual")).scalar_one()
    return {"db": status}
