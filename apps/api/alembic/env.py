import os, sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# --- apps/api/app 경로 추가 ---
APP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app"))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

from config import get_settings
from models import Base  # Base.metadata 사용

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---- DB URL을 settings에서 주입 (oracledb 권장) ----
settings = get_settings()
config.set_main_option(
    "sqlalchemy.url",
    f"oracle+oracledb://{settings.ORACLE_USER}:{settings.ORACLE_PASSWORD}@{settings.ORACLE_DSN}"
)

target_metadata = Base.metadata   # ← autogenerate가 모델을 인식하도록

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
