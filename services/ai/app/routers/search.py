import os
import httpx
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.services.pipeline import rerank as run_pipeline

router = APIRouter(prefix="/search", tags=["search"])

class SearchRequest(BaseModel):
    query_text: str = Field(...)

class SearchResponse(BaseModel):
    results: List[dict]

@router.post("", response_model=SearchResponse)
async def search_endpoint(
    req: SearchRequest,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    # 토큰 검증
    configured_token = os.getenv("ADMIN_TOKEN", "dev-internal-secret")
    if x_admin_token != configured_token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not (req.query_text or "").strip():
        raise HTTPException(status_code=400, detail="Empty query_text")

    # 백엔드 API에서 모든 아이템 가져오기
    # 백엔드가 로컬에서 실행 중이면 localhost:8000 사용
    backend_url = os.getenv("BACKEND_API_URL", "http://localhost:8000")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # /items/candidates 엔드포인트 사용 (X-Admin-Token으로 인증)
            print(f"[DEBUG] Fetching from: {backend_url}/items/candidates")
            response = await client.get(
                f"{backend_url}/items/candidates",
                headers={"X-Admin-Token": configured_token}
            )
            
            print(f"[DEBUG] Response status: {response.status_code}")
            if response.status_code != 200:
                print(f"[DEBUG] Response text: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to fetch items from backend")
            
            data = response.json()
            print(f"[DEBUG] Response data: {data}")
            items = data.get("candidates", [])
            print(f"[DEBUG] Number of items: {len(items)}")
            
            if not items:
                return SearchResponse(results=[])
            
            # 후보 데이터 준비 (안전한 ID 추출, 모든 필드 전달)
            candidates = []
            for item in items:
                # id, item_id, ID 모두 시도 (방어 코드)
                item_id = item.get("id") or item.get("item_id") or item.get("ID")
                
                candidate = {
                    "item_id": item_id,
                    "name": item.get("name"),  # LLM이 이름을 보도록!
                    "category": item.get("category"),
                    "brand": item.get("brand"),
                    "color": item.get("color"),
                    "stored_place": item.get("stored_place"),
                    "features_text": item.get("features"),  # 특징 설명
                }
                candidates.append(candidate)
            
            # Rerank 실행
            ranked_results = await run_pipeline(req.query_text, candidates)
            
            # 결과 포맷팅 (안전한 매칭)
            results = []
            for result in ranked_results:
                item_id = result.get("item_id")
                
                # 원본 아이템 찾기 (id 또는 item_id로 매칭)
                original_item = next(
                    (i for i in items if (i.get("id") == item_id or i.get("item_id") == item_id)),
                    None
                )
                
                if original_item:
                    # 안전한 사진 URL 추출
                    photos = original_item.get("photos", [])
                    thumb_url = None
                    if photos and len(photos) > 0:
                        thumb_url = photos[0].get("url") if isinstance(photos[0], dict) else None
                    
                    results.append({
                        "item_id": item_id,
                        "id": item_id,
                        "name": original_item.get("name", "이름 없음"),
                        "brand": original_item.get("brand"),
                        "color": original_item.get("color"),
                        "category": original_item.get("category"),
                        "stored_place": original_item.get("stored_place"),
                        "photos": photos,
                        "thumb_url": thumb_url,
                        "created_at": original_item.get("created_at"),
                        "score": result.get("llm_score", 0),
                        "reason": result.get("reason_text", "매칭 정보 없음"),
                    })
            
            # 🔍 검색 로그를 백엔드에 저장 (백그라운드)
            try:
                log_data = {
                    "query_text": req.query_text,
                    "results": [
                        {
                            "item_id": r["item_id"],
                            "score": r["score"],
                            "reason": r["reason"]
                        }
                        for r in results[:10]  # Top 10만 로그
                    ],
                    "user_id": None  # 비로그인 사용자 (프론트엔드에서 로그인 정보 전달 시 추가)
                }
                await client.post(
                    f"{backend_url}/items/search-logs",
                    json=log_data,
                    headers={"X-Admin-Token": configured_token}
                )
                print(f"[DEBUG] Search logs saved: {len(log_data['results'])} results")
            except Exception as log_error:
                # 로그 저장 실패해도 검색 결과는 반환
                print(f"[WARNING] Failed to save search logs: {log_error}")
            
            return SearchResponse(results=results)
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Backend connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")
