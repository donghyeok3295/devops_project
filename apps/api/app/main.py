from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from .db import get_db, Base, engine
from . import models  # ✅ 모델을 반드시 import 해서 등록
from sqlalchemy import text
Base.metadata.create_all(bind=engine)

app = FastAPI(title="LF API")

@app.on_event("startup")
def startup():
    # 연결 확인 겸 테이블 생성 시도 (Base가 비어있으면 아무 일도 안 함)
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"ok": True, "see": ["/health", "/db/health", "/docs"]}

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/db/health")
def db_health(db: Session = Depends(get_db)):
    try:
        status = db.execute(text("SELECT 'UP' FROM dual")).scalar_one()
        return {"ok": True, "db": status}  # {"ok": true, "db": "UP"}
    except Exception as e:
        # 개발 중 원인 추적용(운영에선 상세 에러 숨기기)
        return {"ok": False, "error": str(e)}
