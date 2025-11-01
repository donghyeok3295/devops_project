import os
from fastapi import APIRouter
from sqlalchemy import create_engine, text

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
async def health(): return {"status": "ok"}

@router.get("/db")
def db():
    user, pwd, host, port, svc = (
        os.getenv("DB_USER"), os.getenv("DB_PASSWORD"), os.getenv("DB_HOST"),
        os.getenv("DB_PORT"), os.getenv("DB_SERVICE")
    )
    if not all([user, pwd, host, port, svc]):
        return {"status": "skip", "detail": "DB_* not fully set"}
    dsn = f"oracle+oracledb://{user}:{pwd}@{host}:{port}/?service_name={svc}&encoding=UTF-8&nencoding=UTF-8"
    try:
        eng = create_engine(dsn)
        with eng.connect() as conn:
            val = conn.execute(text("SELECT 1 FROM dual")).scalar()
        return {"status": "ok", "result": val}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
