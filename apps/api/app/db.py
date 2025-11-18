# apps/api/app/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import URL
from .config import get_settings
from fastapi import HTTPException

settings = get_settings()

# ORACLE_DSN 예시: "127.0.0.1:1521/devopsdb"
raw = settings.ORACLE_DSN.strip()

# 호스트:포트/서비스명 형태만 허용하도록 엄격 파싱
try:
    host, rest = raw.split(":", 1)            # "127.0.0.1", "1521/devopsdb"
    port_str, service = rest.split("/", 1)    # "1521", "devopsdb"
    port = int(port_str)
except Exception:
    raise ValueError(
        f"Invalid ORACLE_DSN='{settings.ORACLE_DSN}'. "
        "Use 'host:port/service_name' (e.g., 127.0.0.1:1521/devopsdb)."
    )

# ✅ 서비스명 접속을 확실히: query={'service_name': ...}
db_url = URL.create(
    "oracle+oracledb",
    username=settings.ORACLE_USER,
    password=settings.ORACLE_PASSWORD,
    host=host,
    port=port,
    query={"service_name": service},
)

engine = create_engine(
    db_url,
    pool_pre_ping=True,         # 죽은 커넥션 자동 감지
    # echo=True,                 # 디버깅 시 주석 해제하면 SQL 로그 출력
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def get_db():
    db = None
    try:
        db = SessionLocal()
        yield db
    except Exception as e:
        print(f"Database connection failed: {e}")
        # DB 연결 실패 시 503 Service Unavailable 반환
        raise HTTPException(
            status_code=503, 
            detail="Database service is currently unavailable."
        )
    finally:
        if db:
            db.close()
