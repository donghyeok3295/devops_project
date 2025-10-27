from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
from ..db import get_db
from ..models import Notification
from ..security import get_current_user_optional

router = APIRouter(prefix="/activities", tags=["activities"])

def _time_ago(dt: datetime) -> str:
    if not dt:
        return "방금 전"
    diff = datetime.now(timezone.utc) - dt.replace(tzinfo=timezone.utc)
    s = diff.total_seconds()
    if s < 60:
        return "방금 전"
    elif s < 3600:
        return f"{int(s // 60)}분 전"
    elif s < 86400:
        return f"{int(s // 3600)}시간 전"
    else:
        return f"{int(s // 86400)}일 전"

@router.get("/")
def recent_activities(
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user_optional),
):
    q = db.query(Notification).order_by(Notification.created_at.desc())
    if user_id:
        q = q.filter(Notification.user_id == int(user_id))
    rows = q.limit(10).all()
    if not rows:
        return [
            {"id": 1, "type": "MATCHED", "message": "아이폰 12 Pro 매칭 성공", "time_ago": "2시간 전"},
            {"id": 2, "type": "CREATED", "message": "새로운 분실물 등록", "time_ago": "4시간 전"},
            {"id": 3, "type": "SEARCH", "message": "검색 요청 접수", "time_ago": "6시간 전"},
        ]
    return [
        {
            "id": n.id,
            "type": n.type,
            "message": n.payload_json or "",
            "time_ago": _time_ago(n.created_at),
        }
        for n in rows
    ]
