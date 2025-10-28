# services/ai/app/main.py
from fastapi import FastAPI, HTTPException

app = FastAPI(title='Smart Lost&Found AI', version="1.0.0")

from .service import calculate_similarity_scores
from .schemas import SearchRequest, SearchResponse

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/search", response_model=SearchResponse)
def search(payload: SearchRequest):
    """
    LLM 기반 분실물 검색 엔드포인트
    현재는 규칙 기반, 추후 실제 LLM 통합 예정
    """
    try:
        result = calculate_similarity_scores(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/rerank')
def rerank():
    # TODO: 규칙 점수 기반 후보 N개 + LLM rerank 반환
    return {'items': []}