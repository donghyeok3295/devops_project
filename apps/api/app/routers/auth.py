# apps/api/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, Role
from ..security import create_access_token
import hashlib

router = APIRouter(prefix="/auth", tags=["auth"])

def _hash_pw(email: str, raw: str) -> str:
    email = email.lower().strip()
    return hashlib.sha256(f"{email}:{raw}".encode("utf-8")).hexdigest()

class RegisterIn(BaseModel):
    email: EmailStr
    phone: str
    password: str
    role: Role = Role.SEEKER

class LoginIn(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already in use")
    if db.query(User).filter(User.phone == payload.phone).first():
        raise HTTPException(status_code=400, detail="Phone already in use")

    user = User(
        email=payload.email.lower(),
        phone=payload.phone,
        password_hash=_hash_pw(payload.email, payload.password),
        role=payload.role.value,  # ✅ 문자열로 저장 보장
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role}

@router.post("/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or user.password_hash != _hash_pw(email, payload.password):
        return JSONResponse(status_code=401, content={"message": "로그인 정보가 틀립니다."})
    token = create_access_token(sub=str(user.id))
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "role": user.role}}

from ..security import get_current_user
@router.get("/me")
def me(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    u = db.get(User, int(user_id))
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": u.id, "email": u.email, "phone": u.phone, "role": u.role}
