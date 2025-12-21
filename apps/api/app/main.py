from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from .db import get_db, engine
from .models import Base
from .routers import health, auth, items, claims, search, me

app = FastAPI(title="Smart Lost&Found API", version="1.0.0")

# ✅ CORS 설정 (외부 접속 허용)
# allow_credentials=True 사용 시 allow_origins에 "*" 사용 불가!
# 명시적인 오리진 목록 필요
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",  # 개발 서버
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"ok": True, "see": ["/health", "/db/health", "/docs"]}

@app.get("/db/tables")
def db_tables(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT table_name FROM user_tables ORDER BY table_name")).all()
    return {"tables": [r[0] for r in rows]}

# ✅ 라우터 등록 (6개만 사용)
app.include_router(health)
app.include_router(auth)
app.include_router(items)
app.include_router(search)
app.include_router(claims)
app.include_router(me)
