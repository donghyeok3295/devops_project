# apps/api/app/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import URL
from urllib.parse import quote_plus
from .config import get_settings

def _parse_dsn(dsn: str):
    """
    ORACLE_DSN 형식: host:port/service
    예) localhost:1521/XEPDB1  또는  localhost:1521/devops_project
    """
    try:
        host_port, service = dsn.split("/", 1)
        host, port_str = host_port.split(":", 1)
        return host, int(port_str), service
    except Exception as e:
        raise ValueError(
            "ORACLE_DSN은 'host:port/service' 형식이어야 합니다. 예) localhost:1521/XEPDB1"
        ) from e

settings = get_settings()
host, port, service = _parse_dsn(settings.ORACLE_DSN)

# 비밀번호 안전 인코딩 (특수문자 포함 시 필수)
password = quote_plus(settings.ORACLE_PASSWORD)

# 권장: service_name 기반 oracledb(Thin) 접속
db_url = URL.create(
    "oracle+oracledb",
    username=settings.ORACLE_USER,
    password=password,
    host=host,
    port=port,
    query={"service_name": service},
)

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    echo=False,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
