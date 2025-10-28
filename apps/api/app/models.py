# apps/api/app/models.py
from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import (
    String, Text, DateTime, ForeignKey, Enum, Float, Integer, Identity,
    MetaData, func, Index, UniqueConstraint
)
import enum


# ---------- Alembic diff 안정화를 위한 네이밍 규칙 ----------
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


# ========================
#        ENUM 정의
# ========================
class Role(str, enum.Enum):
    SEEKER = "SEEKER"   # 분실자
    FINDER = "FINDER"   # 습득자
    ADMIN  = "ADMIN"    # (선택) 관리자


class ItemStatus(str, enum.Enum):
    STORED       = "STORED"
    CLAIMED      = "CLAIMED"
    HANDED_OVER  = "HANDED_OVER"


class ClaimStatus(str, enum.Enum):
    PENDING  = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ========================
#        USERS
# ========================
class User(Base):
    __tablename__ = "USERS"

    id: Mapped[int] = mapped_column(Identity(start=1, always=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False, default=Role.SEEKER)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    # 관계
    found_items: Mapped[list["Item"]] = relationship(
        back_populates="finder", cascade="all, delete-orphan"
    )
    claims: Mapped[list["Claim"]] = relationship(
        back_populates="seeker", cascade="all, delete-orphan", foreign_keys="Claim.seeker_id"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("email", name="uq_USERS_email"),
        UniqueConstraint("phone", name="uq_USERS_phone"),
        Index("ix_USERS_role", "role"),
    )


# ========================
#        ITEMS
# ========================
class Item(Base):
    __tablename__ = "ITEMS"

    id: Mapped[int] = mapped_column(Identity(start=1, always=True), primary_key=True)
    finder_id: Mapped[int] = mapped_column(ForeignKey("USERS.id"), nullable=False)

    # 핵심 속성
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    brand: Mapped[str | None] = mapped_column(String(50))
    model: Mapped[str | None] = mapped_column(String(80))
    color: Mapped[str | None] = mapped_column(String(30))
    material: Mapped[str | None] = mapped_column(String(50))
    size: Mapped[str | None] = mapped_column(String(50))
    features: Mapped[str | None] = mapped_column(String(200))        # 특징(흠집/스티커 등)
    accessories: Mapped[str | None] = mapped_column(String(200))     # 부속품(케이스/스트랩 등)
    serial_masked: Mapped[str | None] = mapped_column(String(80))    # 시리얼 일부(마스킹)

    # 시간/위치/보관
    lost_time: Mapped[DateTime | None] = mapped_column(DateTime)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    stored_place: Mapped[str | None] = mapped_column(String(120))

    status: Mapped[ItemStatus] = mapped_column(Enum(ItemStatus), nullable=False, default=ItemStatus.STORED)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime | None] = mapped_column(DateTime, onupdate=func.now())

    # 관계
    finder: Mapped["User"] = relationship(back_populates="found_items")
    photos: Mapped[list["ItemPhoto"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )
    claims: Mapped[list["Claim"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_ITEMS_status_created_at", "status", "created_at"),
        Index("ix_ITEMS_category_brand_color", "category", "brand", "color"),
        Index("ix_ITEMS_lat_lng", "lat", "lng"),
    )


# ========================
#      ITEM_PHOTOS
# ========================
class ItemPhoto(Base):
    __tablename__ = "ITEM_PHOTOS"

    id: Mapped[int] = mapped_column(Identity(start=1, always=True), primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("ITEMS.id"), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    exif_json: Mapped[str | None] = mapped_column(Text)   # EXIF 파싱 결과(JSON 문자열)
    phash: Mapped[str | None] = mapped_column(String(64)) # (선택) 중복 판별용 해시

    item: Mapped["Item"] = relationship(back_populates="photos")

    __table_args__ = (
        Index("ix_ITEM_PHOTOS_item_id", "item_id"),
    )


# ========================
#        CLAIMS
# ========================
class Claim(Base):
    __tablename__ = "CLAIMS"

    id: Mapped[int] = mapped_column(Identity(start=1, always=True), primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("ITEMS.id"), nullable=False)
    seeker_id: Mapped[int] = mapped_column(ForeignKey("USERS.id"), nullable=False)

    memo: Mapped[str | None] = mapped_column(String(300))
    status: Mapped[ClaimStatus] = mapped_column(Enum(ClaimStatus), nullable=False, default=ClaimStatus.PENDING)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    # 관계
    item: Mapped["Item"] = relationship(back_populates="claims")
    seeker: Mapped["User"] = relationship(back_populates="claims", foreign_keys=[seeker_id])

    __table_args__ = (
        Index("ix_CLAIMS_item_id_status", "item_id", "status"),
        Index("ix_CLAIMS_seeker_id", "seeker_id"),
    )


# ========================
#     NOTIFICATIONS
# ========================
class Notification(Base):
    __tablename__ = "NOTIFICATIONS"

    id: Mapped[int] = mapped_column(Identity(start=1, always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("USERS.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(40), nullable=False)     # e.g., "CLAIM_UPDATED"
    payload_json: Mapped[str | None] = mapped_column(Text)
    is_read: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # Oracle 호환 위해 Integer(0/1)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    read_at: Mapped[DateTime | None] = mapped_column(DateTime)

    user: Mapped["User"] = relationship(back_populates="notifications")

    __table_args__ = (
        Index("ix_NOTIFICATIONS_user_id_is_read", "user_id", "is_read"),
    )


# ========================
#      MATCH_LOGS
# ========================
class MatchLog(Base):
    """
    검색/매칭 추적용 로그 (규칙 점수 저장; AI 재랭킹 전/후 비교용)
    """
    __tablename__ = "MATCH_LOGS"

    id: Mapped[int] = mapped_column(Identity(start=1, always=True), primary_key=True)
    seeker_id: Mapped[int] = mapped_column(ForeignKey("USERS.id"), nullable=False)
    query_text: Mapped[str] = mapped_column(String(500), nullable=False)
    item_id: Mapped[int | None] = mapped_column(ForeignKey("ITEMS.id"))  # 후보 아이템
    rule_score: Mapped[float | None] = mapped_column(Float)               # 규칙 점수(카테고리/브랜드/색/위치/시간 등 가중합)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_MATCH_LOGS_seeker_created", "seeker_id", "created_at"),
        Index("ix_MATCH_LOGS_item_id", "item_id"),
    )
