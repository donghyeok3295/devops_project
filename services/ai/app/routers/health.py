from fastapi import APIRouter
from sqlalchemy import create_engine, text
import os

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/health/db")
def check_db():
    dsn = (
        f"oracle+oracledb://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@"
        f"{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/?service_name={os.getenv('DB_SERVICE')}"
    )
    try:
        engine = create_engine(dsn)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 FROM dual")).scalar()
        return {"status": "ok", "result": result}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@router.get("")
async def health_check():
    return {"status": "ok"}