# apps/api/app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from .db import get_db, engine
from .models import Base
from .routers import health, auth, items, claims, search, stats, activities, me

app = FastAPI(title="Smart Lost&Found API", version="1.0.0")

# ✅ CORS 설정 (프론트엔드 허용)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
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

# ✅ 라우터 등록
app.include_router(health)
app.include_router(auth)
app.include_router(items)
app.include_router(search)
app.include_router(claims)
app.include_router(stats)
app.include_router(activities)
app.include_router(me)
