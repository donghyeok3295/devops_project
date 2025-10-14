from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from config import get_settings

settings = get_settings()

# 방법 A: oracledb + service_name (권장)
db_url = URL.create(
    "oracle+oracledb",
    username=settings.ORACLE_USER,
    password=settings.ORACLE_PASSWORD,
    host=settings.ORACLE_DSN.split(":")[0],   # 예: 'localhost'
    port=int(settings.ORACLE_DSN.split(":")[1].split("/")[0]),  # 예: 1521
    # service_name은 query로 전달
    query={
        "service_name": settings.ORACLE_DSN.split("/", 1)[1]    # 예: 'FREEPDB1'
    },
)

# 방법 B: DSN이 'host:port/service' 형식이면 그냥 문자열도 가능
# db_url = f"oracle+oracledb://{settings.ORACLE_USER}:{settings.ORACLE_PASSWORD}@{settings.ORACLE_DSN}"

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    echo=False,
)
