# 📊 데이터 흐름 분석 및 문제점 체크

## 현재 데이터 흐름 구조

```
프론트엔드 (PC3)
    ↓ POST /search
    ↓ SearchRequest
백엔드 API (PC1)
    ↓ POST /rerank
    ↓ AIRerankRequest
AI 서비스 (PC2)
    ↓ LLM 호출
    ↓ 재랭킹 결과
백엔드 API (PC1)
    ↓ SearchResponse
프론트엔드 (PC3)
```

---

## ⚠️ 발견된 문제점

### 🔴 **문제 1: 백엔드 → AI 간 데이터 형태 불일치**

#### 백엔드가 보내는 형태 (`apps/api/app/routers/search.py`):
```python
class AICandidate(BaseModel):
    item_id: int
    name: Optional[str] = None        # ⚠️ 필드명 불일치
    category: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    stored_place: Optional[str] = None
    distance_km: Optional[float] = None
    minutes_since_found: Optional[float] = None
    features_text: Optional[str] = None
```

#### AI 서비스가 받는 형태 (`services/ai/app/routers/rerank.py`):
```python
class Candidate(BaseModel):
    item_id: int
    name: Optional[str] = None        # ✅ 일치
    category: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    stored_place: Optional[str] = None
    distance_km: Optional[float] = None
    minutes_since_found: Optional[float] = None
    features_text: Optional[str] = None
```

**결과**: ✅ **실제로는 일치함!** 필드명이 동일하게 설계되어 있음.

---

### 🔴 **문제 2: AI → 백엔드 응답 형태와 OpenAPI 계약 불일치**

#### AI 서비스가 반환하는 형태 (`services/ai/app/services/pipeline.py`):
```python
return [{
    "item_id": e["item_id"],
    "rule_score": e["rule_score"],
    "llm_score": e["llm_score"],
    "reason_text": e["reason_text"],
} for e in enriched]
```

**AI 서비스 응답 예시**:
```json
[
  {
    "item_id": 1,
    "rule_score": 15.5,
    "llm_score": 0.85,
    "reason_text": "브랜드와 색상이 정확히 일치합니다"
  }
]
```

#### OpenAPI 계약이 요구하는 형태 (`contracts/openapi.yaml`):
```yaml
SearchResponse:
  type: object
  required: [top_n, top_5, reasons]
  properties:
    top_n:              # SearchCandidate[] - item + rule_score
    top_5:              # ItemRead[] - 전체 아이템 정보
    reasons:            # RerankResult[] - item_id + llm_score + reason_text
```

**OpenAPI 계약 응답 예시**:
```json
{
  "data": {
    "top_n": [
      {
        "item": {
          "id": 1,
          "title": "검은색 지갑",
          "brand": "루이비통",
          "color": "검은색",
          ...
        },
        "rule_score": 15.5
      }
    ],
    "top_5": [
      {
        "id": 1,
        "title": "검은색 지갑",
        ...
      }
    ],
    "reasons": [
      {
        "item_id": 1,
        "llm_score": 0.85,
        "reason_text": "브랜드와 색상이 정확히 일치합니다"
      }
    ]
  },
  "error": null
}
```

**결과**: ❌ **심각한 불일치!**
- AI 서비스는 단순 배열 반환
- 백엔드는 top_n, top_5, reasons 구조로 변환해야 함
- 백엔드가 전체 ItemRead 정보를 보관하고 있어야 함

---

### 🔴 **문제 3: 백엔드가 AI 응답을 OpenAPI 형태로 변환하지 않음**

#### 현재 백엔드 코드 (`apps/api/app/routers/search.py`):
```python
return {
    "data": {
        "query": request.text,
        "total_candidates": len(candidates),
        "reranked_results": rerank_results  # ⚠️ 그대로 반환
    },
    "error": None
}
```

**문제점**:
- OpenAPI 계약의 SearchResponse 형태가 아님
- top_n, top_5, reasons 구조가 없음
- 프론트엔드가 예상하는 형태와 다름

---

## ✅ 해결 방안

### 1. 백엔드 search.py 수정

백엔드에서 AI 응답을 받은 후 OpenAPI 계약에 맞게 변환:

```python
# AI 서비스 호출 전에 원본 아이템 정보 보관
candidates_map = {c.item_id: c for c in candidates}

# AI 서비스 호출
rerank_results = response.json()

# OpenAPI SearchResponse 형태로 변환
top_n_results = []
reasons = []

for result in rerank_results:
    item_id = result["item_id"]
    original_item = candidates_map[item_id]
    
    # top_n: SearchCandidate 형태
    top_n_results.append({
        "item": {
            "id": original_item.item_id,
            "title": original_item.name,
            "brand": original_item.brand,
            "color": original_item.color,
            # ... 전체 ItemRead 필드
        },
        "rule_score": result["rule_score"]
    })
    
    # reasons: RerankResult 형태
    reasons.append({
        "item_id": item_id,
        "llm_score": result["llm_score"],
        "reason_text": result["reason_text"]
    })

# top_5: 상위 5개만
top_5_items = [r["item"] for r in top_n_results[:5]]

return {
    "data": {
        "top_n": top_n_results,
        "top_5": top_5_items,
        "reasons": reasons
    },
    "error": None
}
```

### 2. AI 서비스는 현재 형태 유지

AI 서비스는 이미 올바르게 구현되어 있음:
- ✅ item_id, rule_score, llm_score, reason_text 반환
- ✅ 정렬된 결과 제공

### 3. 프론트엔드는 OpenAPI 계약에 맞게 파싱

```typescript
// apps/frontend/lib/api.ts
interface SearchResponse {
  data: {
    top_n: Array<{
      item: ItemRead;
      rule_score: number;
    }>;
    top_5: ItemRead[];
    reasons: Array<{
      item_id: number;
      llm_score: number;
      reason_text: string;
    }>;
  };
  error: null | ErrorDTO;
}
```

---

## 📋 각 시나리오별 체크 결과

### ✅ 1. 백엔드 → AI 간 JSON 통신
**상태**: ✅ **정상**
- 데이터 형태 일치
- HTTP + JSON 통신
- 인증 토큰 사용

**검증 방법**:
```bash
# PC1 백엔드에서 실행
curl -X POST http://PC2_IP:9000/rerank \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: dev-internal-secret" \
  -d '{
    "query_text": "검은색 지갑",
    "candidates": [{"item_id": 1, "name": "지갑", "brand": "루이비통"}]
  }'
```

### ⚠️ 2. AI → 백엔드 → 프론트 데이터 형태
**상태**: ❌ **수정 필요**
- AI 응답을 OpenAPI SearchResponse로 변환 필요
- 백엔드가 top_n, top_5, reasons 구조 생성 필요

**문제**:
- 현재 백엔드가 AI 응답을 그대로 반환
- OpenAPI 계약과 불일치

### ⚠️ 3. 프론트 → 백엔드 → AI 데이터 정제
**상태**: ⚠️ **부분 정상**
- 프론트 → 백엔드: ✅ SearchRequest 형태 정상
- 백엔드 → AI: ✅ 데이터 변환 정상 (더미 데이터)
- AI → 백엔드: ❌ 응답 변환 필요
- 백엔드 → 프론트: ❌ OpenAPI 계약 불일치

**문제**:
- 백엔드가 DB에서 실제 ItemRead 정보를 조회해야 함
- AI 응답을 ItemRead 객체와 결합해야 함

---

## 🔧 즉시 수정 필요 사항

### 우선순위 1: 백엔드 search.py 수정
- [ ] AI 응답을 OpenAPI SearchResponse로 변환
- [ ] 원
