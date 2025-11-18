# app/routers/health.py (기존 healthz 유지 + 아래 엔드포인트 추가)
from fastapi import APIRouter
from app.config import ServiceInfo
from app.services import llm

router = APIRouter()

@router.get("/healthz", response_model=ServiceInfo)
def healthz():
    return ServiceInfo(service="ai-matcher", status="ok")

@router.get("/llm-ping")
def llm_ping():
    items = [
        {"item_id": 1, "brand": "Samsung", "color": "black"},
        {"item_id": 2, "brand": "Apple", "color": "white"},
    ]
    return llm.score("검정색 삼성 케이스", items)
