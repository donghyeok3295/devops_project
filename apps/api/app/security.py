# apps/api/app/security.py
import jwt, datetime
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from .config import get_settings

bearer_scheme = HTTPBearer(auto_error=False)  # ✅ auto_error=False로 변경 (토큰 없어도 None 허용)

# === JWT 토큰 생성 ===
def create_access_token(sub: str, expires_minutes: int = 60):
    s = get_settings()
    payload = {
        "sub": sub,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, s.JWT_SECRET, algorithm="HS256")


# === 기본 인증 (토큰 필수) ===
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing token")

    token = credentials.credentials
    try:
        payload = jwt.decode(token, get_settings().JWT_SECRET, algorithms=["HS256"])
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# === 선택적 인증 (게스트 허용) ===
def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[str]:
    """
    게스트 접근 허용 버전.
    - 토큰이 없으면 None 반환
    - 토큰이 있으면 user_id(sub) 반환
    """
    if not credentials:
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, get_settings().JWT_SECRET, algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        # 잘못된 토큰은 무시하고 게스트 처리
        return None
