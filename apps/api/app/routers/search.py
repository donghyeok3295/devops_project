from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel, Field
import httpx
from app.config import get_settings

router = APIRouter(prefix="/search", tags=["search"])

# DTO 정의
class SearchRequest(BaseModel):
    text: str = Field(..., description="검색할 분실물 설명")
    category: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    model: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: float = Field(default=20.0, description="검색 반경(km)")
    since_hours: int = Field(default=168, description="최근 N시간 이내")
    top_n: int = Field(default=50, description="최대 후보 개수")

class AICandidate(BaseModel):
    """AI 서비스로 전송할 후보 항목"""
    item_id: int
    name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    stored_place: Optional[str] = None
    distance_km: Optional[float] = None
    minutes_since_found: Optional[float] = None
    features_text: Optional[str] = None

class AIRerankRequest(BaseModel):
    """AI 서비스 요청 형식"""
    query_text: str
    candidates: List[AICandidate]

@router.post("")
async def search_items(
    request: SearchRequest,
    settings = Depends(get_settings)
):
    """
    분실물 검색 (OpenAPI 계약 준수 + 실제 DB 조회)
    1. DB에서 규칙 기반 필터링으로 후보 추출
    2. AI 서비스에 재랭킹 요청
    3. OpenAPI SearchResponse 형태로 변환하여 반환
    """
    
    # 실제 DB에서 분실물 조회
    import oracledb
    
    try:
        # DB 연결
        connection = oracledb.connect(
            user=settings.ORACLE_USER,
            password=settings.ORACLE_PASSWORD,
            dsn=settings.ORACLE_DSN
        )
        cursor = connection.cursor()
        
        # 검색 쿼리 (간단한 필터링)
        query = """
            SELECT ID, TITLE, DESCRIPTION, CATEGORY, BRAND, MODEL, COLOR,
                   FEATURES, STORED_ADDR, STATUS, CREATED_AT
            FROM ITEMS
            WHERE STATUS = 'STORED'
        """
        params = {}
        
        # 카테고리 필터
        if request.category:
            query += " AND UPPER(CATEGORY) LIKE UPPER(:category)"
            params['category'] = f"%{request.category}%"
        
        # 브랜드 필터
        if request.brand:
            query += " AND UPPER(BRAND) LIKE UPPER(:brand)"
            params['brand'] = f"%{request.brand}%"
        
        # 색상 필터
        if request.color:
            query += " AND UPPER(COLOR) LIKE UPPER(:color)"
            params['color'] = f"%{request.color}%"
        
        query += " ORDER BY CREATED_AT DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # AI 후보 생성
        candidates = []
        for row in rows:
            item_id, title, desc, category, brand, model, color, features, addr, status, created_at = row
            
            candidates.append(AICandidate(
                item_id=item_id,
                name=title,
                category=category,
                brand=brand,
                color=color,
                stored_place=addr,
                distance_km=0.5,  # TODO: GPS 거리 계산
                minutes_since_found=120.0,  # TODO: 실제 시간 계산
                features_text=features
            ))
        
        cursor.close()
        connection.close()
        
        if not candidates:
            # 검색 결과 없음
            return {
                "data": {
                    "top_n": [],
                    "top_5": [],
                    "reasons": []
                },
                "error": None
            }
            
    except Exception as db_error:
        # DB 오류 시 더미 데이터 사용
        print(f"DB 오류: {db_error}, 더미 데이터 사용")
        candidates = [
            AICandidate(
                item_id=1,
                name="검은색 지갑",
                category="지갑",
                brand="루이비통",
                color="검은색",
                stored_place="강남역 3번 출구",
                distance_km=0.5,
                minutes_since_found=120.0,
                features_text="카드 여러 장 들어있음"
            ),
            AICandidate(
                item_id=2,
                name="갈색 가방",
                category="가방",
                brand="MCM",
                color="갈색",
                stored_place="신사역 근처",
                distance_km=1.2,
                minutes_since_found=60.0,
                features_text="노트북 가방"
            )
        ]
    
    # 원본 후보 정보를 item_id로 매핑 (AI 응답과 결합하기 위해)
    candidates_map = {c.item_id: c for c in candidates}
    
    # AI 서비스 호출
    try:
        ai_request = AIRerankRequest(
            query_text=request.text,
            candidates=candidates
        )
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"X-Internal-Token": settings.AI_INTERNAL_TOKEN}
            response = await client.post(
                f"{settings.AI_SERVICE_URL}/rerank",
                json=ai_request.model_dump(),
                headers=headers
            )
            response.raise_for_status()
            rerank_results = response.json()
        
        # OpenAPI SearchResponse 형태로 변환
        top_n_results = []
        reasons = []
        
        for result in rerank_results:
            item_id = result["item_id"]
            original_item = candidates_map.get(item_id)
            
            if not original_item:
                continue
            
            # ItemRead 형태 구성 (TODO: DB에서 실제 데이터 조회)
            item_read = {
                "id": original_item.item_id,
                "title": original_item.name or "",
                "description": None,
                "category": original_item.category,
                "brand": original_item.brand,
                "model": None,
                "color": original_item.color,
                "material": None,
                "pattern": None,
                "size_text": None,
                "features": original_item.features_text,
                "accessories": None,
                "serial_masked": None,
                "photos": [],  # TODO: 실제 사진 URL
                "stored_lat": None,
                "stored_lng": None,
                "stored_addr": original_item.stored_place,
                "status": "STORED",
                "finder_user_id": None,
                "created_at": None
            }
            
            # SearchCandidate 형태 (item + rule_score)
            top_n_results.append({
                "item": item_read,
                "rule_score": float(result["rule_score"])
            })
            
            # RerankResult 형태 (item_id + llm_score + reason_text)
            reasons.append({
                "item_id": item_id,
                "llm_score": float(result["llm_score"]),
                "reason_text": str(result["reason_text"])
            })
        
        # top_5: 상위 5개의 ItemRead만 추출
        top_5_items = [result["item"] for result in top_n_results[:5]]
        
        # OpenAPI 계약에 맞는 응답 반환
        return {
            "data": {
                "top_n": top_n_results,
                "top_5": top_5_items,
                "reasons": reasons
            },
            "error": None
        }
    
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="AI 서비스 응답 시간 초과"
        )
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"AI 서비스 호출 실패: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"검색 처리 중 오류: {str(e)}"
        )
