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
    backend_url = os.getenv("BACKEND_API_URL", "http://203.234.62.84:8000")
    
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
            
            # 후보 데이터 준비
            candidates = []
            for item in items:
                candidate = {
                    "item_id": item.get("id"),  # 백엔드는 "id" 필드 사용
                    "name": item.get("name"),
                    "category": item.get("category"),
                    "brand": item.get("brand"),
                    "color": item.get("color"),
                    "stored_place": item.get("stored_place"),
                }
                candidates.append(candidate)
            
            # Rerank 실행
            ranked_results = await run_pipeline(req.query_text, candidates)
            
            # 결과 포맷팅
            results = []
            for result in ranked_results:
                item_id = result.get("item_id")
                # 원본 아이템 찾기
                original_item = next((i for i in items if i.get("id") == item_id), None)
                
                if original_item:
                    results.append({
                        "item_id": item_id,
                        "id": item_id,
                        "name": original_item.get("name"),
                        "brand": original_item.get("brand"),
                        "color": original_item.get("color"),
                        "category": original_item.get("category"),
                        "stored_place": original_item.get("stored_place"),
                        "photos": original_item.get("photos", []),
                        "thumb_url": original_item.get("photos", [{}])[0].get("url") if original_item.get("photos") else None,
                        "created_at": original_item.get("created_at"),
                        "score": result.get("llm_score", 0),
                        "reason": result.get("reason_text", ""),
                    })
            
            return SearchResponse(results=results)
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Backend connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")
