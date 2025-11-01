import os
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, Depends
from pydantic import BaseModel
import oracledb

router = APIRouter(prefix="/items", tags=["items"])

class ItemCandidate(BaseModel):
    id: int
    name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    stored_place: Optional[str] = None
    photos: List[dict] = []
    created_at: Optional[str] = None

@router.get("/candidates")
async def get_candidates_for_ai(
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    status: str = "STORED",
    limit: int = 100
):
    """
    AI 서비스용 후보 아이템 조회
    - X-Admin-Token 헤더로 인증
    """
    # 내부 토큰 검증
    expected_token = os.getenv("AI_INTERNAL_TOKEN", "dev-internal-secret")
    
    if x_admin_token != expected_token:
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    
    # DB 연결 설정
    dsn = os.getenv("ORACLE_DSN", "localhost:1521/FREEPDB1")
    user = os.getenv("ORACLE_USER", "ADMIN")
    password = os.getenv("ORACLE_PASSWORD", "1234")
    
    try:
        # DB 연결
        connection = oracledb.connect(user=user, password=password, dsn=dsn)
        cursor = connection.cursor()
        
        # 쿼리 실행
        query = """
            SELECT ID, NAME, CATEGORY, BRAND, COLOR, STORED_PLACE, CREATED_AT
            FROM ITEMS
            WHERE STATUS = :status
            ORDER BY CREATED_AT DESC
            FETCH FIRST :limit ROWS ONLY
        """
        
        cursor.execute(query, {"status": status, "limit": limit})
        rows = cursor.fetchall()
        
        # 결과 포맷팅
        candidates = []
        for row in rows:
            item_id, name, category, brand, color, stored_place, created_at = row
            
            candidates.append({
                "id": item_id,
                "name": name,
                "category": category,
                "brand": brand,
                "color": color,
                "stored_place": stored_place,
                "photos": [],  # TODO: 사진 정보 추가
                "created_at": str(created_at) if created_at else None
            })
        
        cursor.close()
        connection.close()
        
        return candidates
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")