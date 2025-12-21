# apps/api/app/models.py
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, func, Identity, MetaData

# 이름 규칙(권장) – Alembic diff 안정화
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}
metadata_obj = MetaData(naming_convention=convention)

class Base(DeclarativeBase):
    metadata = metadata_obj

# 샘플 테이블 (분실물)
class Item(Base):
    __tablename__ = "ITEMS"

    id: Mapped[int] = mapped_column(
        Identity(start=1, always=True), primary_key=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp()
    )

# ── (참고) 시퀀스+트리거 방식 예시 ─────────────────────────────
# from sqlalchemy import Sequence, event, DDL, Integer
# id_seq = Sequence("SEQ_ITEMS_ID")
# class Item(Base):
#     __tablename__ = "ITEMS"
#     id: Mapped[int] = mapped_column(Integer, id_seq, primary_key=True)
#     name: Mapped[str] = mapped_column(String(100), nullable=False)
# # 트리거는 Alembic migration에서 DDL로 생성하는 게 일반적
