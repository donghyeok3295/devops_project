# services/ai/app/service.py
"""
LLM 기반 분실물 매칭 서비스
현재는 규칙 기반 스코어링을 제공하며, 추후 실제 LLM 모델과 통합 예정
"""
from typing import List
from .schemas import SearchRequest, SearchItem, SearchScore, SearchResponse

def calculate_similarity_scores(request: SearchRequest) -> SearchResponse:
    """
    규칙 기반 유사도 점수 계산
    
    추후 실제 LLM 모델(GPT, Claude, Gemma 등)과 통합 예정:
    1. LLM API 호출 (OpenAI, Anthropic, HuggingFace 등)
    2. 자연어 쿼리를 임베딩으로 변환
    3. 아이템 설명도 임베딩으로 변환
    4. 코사인 유사도 계산
    5. LLM으로 매칭 이유 설명 생성
    """
    
    query_lower = request.query.lower()
    query_keywords = set(query_lower.split())
    
    scores = []
    
    for item in request.items:
        score = 0.0
        reasons = []
        
        # 제목 매칭 (가장 높은 가중치)
        if query_lower in item.name.lower():
            score += 40
            reasons.append("제목 일치")
        elif any(kw in item.name.lower() for kw in query_keywords if len(kw) > 1):
            score += 30
            reasons.append("제목 키워드 포함")
        
        # 카테고리 매칭
        if item.category and any(kw in item.category.lower() for kw in query_keywords if len(kw) > 1):
            score += 15
            reasons.append("카테고리 일치")
        
        # 브랜드 매칭
        if item.brand and any(kw in item.brand.lower() for kw in query_keywords if len(kw) > 1):
            score += 15
            reasons.append("브랜드 일치")
        
        # 색상 매칭
        if item.color and any(kw in item.color.lower() for kw in query_keywords if len(kw) > 1):
            score += 15
            reasons.append("색상 일치")
        
        # 특성/기능 매칭
        if item.features and any(kw in item.features.lower() for kw in query_keywords if len(kw) > 1):
            score += 10
            reasons.append("설명 키워드 포함")
        
        # 보관 위치 매칭
        if item.stored_place and any(kw in item.stored_place.lower() for kw in query_keywords if len(kw) > 1):
            score += 5
            reasons.append("보관 위치 일치")
        
        # 최대 점수는 100점
        score = min(score, 100.0)
        
        # 매칭 이유 설명 생성
        reason_text = ", ".join(reasons) if reasons else "일반 키워드 매칭"
        
        scores.append(SearchScore(
            item_id=item.id,
            score=round(score, 1),
            reason=reason_text
        ))
    
    # 점수 높은 순으로 정렬
    scores.sort(key=lambda x: x.score, reverse=True)
    
    return SearchResponse(
        query=request.query,
        results=scores
    )


async def call_llm_api(query: str, items: List[SearchItem]) -> List[SearchScore]:
    """
    실제 LLM API 호출 함수 (추후 구현)
    
    예시 구현:
    - OpenAI GPT-4: embeddings API + cosine similarity
    - Anthropic Claude: direct natural language comparison
    - HuggingFace: Sentence-BERT 등의 임베딩 모델
    
    Returns:
        List[SearchScore]: LLM 기반 유사도 점수 리스트
    """
    # TODO: 실제 LLM API 통합
    # 예시:
    # import openai
    # embeddings = await openai.Embedding.acreate(...)
    # similarity = cosine_similarity(...)
    # return scores
    pass