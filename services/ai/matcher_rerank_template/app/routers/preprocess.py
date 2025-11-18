from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional, Dict, Any
from app.services import llm

router = APIRouter(prefix="/preprocess", tags=["preprocess"])

@router.post("")
async def preprocess_input(
    description: str = Form(..., description="자연어 설명"),
    image: Optional[UploadFile] = File(default=None)
) -> Dict[str, Any]:
    """
    자연어(+선택적 이미지)를 받아 DB 등록/검색용 구조화 JSON으로 정제합니다.
    현재 이미지는 파일명 메타만 포함(추후 Vision 연결 지점 표시).
    """
    # 1) LLM 기반 필드 추출 (brand/color/category/stored_place/date_lost)
    fields = llm.extract_fields(description)

    # 2) 이미지 메타(선택) — 향후 Vision 모델 연동 지점
    if image:
        fields["image_filename"] = image.filename

    # 3) DB 또는 검색에 곧바로 쓸 수 있는 표준 형태로 반환
    return {
        "status": "ok",
        "structured_data": {
            "brand": fields.get("brand", ""),
            "color": fields.get("color", ""),
            "category": fields.get("category", ""),
            "stored_place": fields.get("stored_place", ""),
            "date_lost": fields.get("date_lost", ""),
            "image_filename": fields.get("image_filename", None),
        }
    }
