# apps/api/app/diagnose_db.py
import os, socket, traceback

# 1) .env 로드 보장
try:
    from dotenv import load_dotenv
    # apps/api/.env 강제 경로 지정
    HERE = os.path.dirname(os.path.dirname(__file__))  # apps/api
    env_path = os.path.join(HERE, ".env")
    load_dotenv(env_path)
    print(f"🔎 .env loaded from: {env_path}")
except Exception as e:
    print("⚠️ python-dotenv 로드 실패(무시 가능):", e)

# 2) 설정값 확인 (비밀번호는 마스킹)
ORACLE_DSN = os.getenv("ORACLE_DSN")
ORACLE_USER = os.getenv("ORACLE_USER")
ORACLE_PASSWORD = os.getenv("ORACLE_PASSWORD")

print("ENV.ORACLE_DSN   =", ORACLE_DSN)
print("ENV.ORACLE_USER  =", ORACLE_USER)
print("ENV.ORACLE_PASS  =", "***" if ORACLE_PASSWORD else None)

# 3) 호스트/포트/서비스 분해 및 포트 열려있는지 확인
def parse_dsn(dsn: str):
    # 허용: host:port/service  또는  host/service(포트생략)
    dsn = dsn.lstrip("/").replace("//", "")
    if "/" not in dsn:
        raise ValueError("ORACLE_DSN 형식 오류. 예: localhost:1521/FREEPDB1")
    host_port, service = dsn.split("/", 1)
    if ":" in host_port:
        host, port = host_port.split(":", 1)
        port = int(port)
    else:
        host, port = host_port, 1521
    return host, port, service

try:
    host, port, service = parse_dsn(ORACLE_DSN or "")
    print(f"🔌 DSN parsed → host={host}, port={port}, service_name={service}")
    with socket.create_connection((host, port), timeout=3):
        print("✅ TCP 연결 OK (호스트/포트 접근 가능)")
except Exception as e:
    print("❌ TCP 레벨에서 접근 실패(호스트/포트 확인 필요):", e)

# 4) python-oracledb Thin 모드로 '그냥' 접속 시도 → 에러 원문 수집
print("\n=== STEP A: python-oracledb 직접 접속 테스트 ===")
try:
    import oracledb
    # Thin 모드 강제 (Instant Client 없이)
    oracledb.init_oracle_client(lib_dir=None)  # Thick로 안가게 방지
    conn = oracledb.connect(user=ORACLE_USER, password=ORACLE_PASSWORD,
                            host=host, port=port, service_name=service)
    with conn.cursor() as cur:
        cur.execute("select user, sys_context('USERENV','CON_NAME') from dual")
        u, con = cur.fetchone()
        print(f"✅ oracledb 연결 OK → USER={u}, CON_NAME={con}")
    conn.close()
except Exception as e:
    print("❌ oracledb 연결 실패:", repr(e))
    traceback.print_exc()

# 5) SQLAlchemy 엔진으로 접속 테스트 (현재 프로젝트 설정 방식)
print("\n=== STEP B: SQLAlchemy 엔진 접속 테스트 ===")
try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.engine import URL
    db_url = URL.create(
        "oracle+oracledb",
        username=ORACLE_USER,
        password=ORACLE_PASSWORD,
        host=host,
        port=port,
        query={"service_name": service},
    )
    print("DB URL(preview) =", str(db_url).replace(ORACLE_PASSWORD or "", "***"))

    engine = create_engine(db_url, pool_pre_ping=True, future=True, echo=False)
    with engine.connect() as conn:
        row = conn.execute(text("select 'OK' as status from dual")).fetchone()
        print("✅ SQLAlchemy 연결 OK →", row)
except Exception as e:
    print("❌ SQLAlchemy 연결 실패:", repr(e))
    traceback.print_exc()
