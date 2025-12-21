# 검색 및 LLM 통합 가이드

## 완료된 작업

### 1. 메인 페이지 하단바 UI 통일 ✅
- 모든 페이지에 `lucide-react` 아이콘을 사용하여 일관된 UI 적용
- 아이콘: Home, PlusCircle (등록), Bell (내 활동), User (내 정보), SearchIcon (검색)

### 2. 검색 기능 백엔드 통합 ✅

#### 백엔드 변경사항 (`apps/api/app/routers/search.py`)
- `POST /search`: 자연어 검색 엔드포인트 (기존)
- `GET /search?q={query}`: URL 쿼리 파라미터 방식 추가 (results 페이지에서 사용)
- 보관 중인 분실물만 검색 (`status = STORED`)
- 키워드 기반 다중 필드 검색:
  - 이름 (`name`)
  - 기능/특성 (`features`)
  - 카테고리 (`category`)
  - 브랜드 (`brand`)
  - 색상 (`color`)
- 응답 형식에 사진 정보 포함

#### 프론트엔드 변경사항 (`apps/frontend/app/results/page.tsx`)
- 실제 API 호출로 변경
- 검색 쿼리 `q` 파라미터로 백엔드 검색
- DB에서 가져온 실제 데이터 표시
- 사진, 브랜드, 색상, 카테고리, 보관 위치 등 모든 정보 표시
- 상세 보기 버튼으로 분실물 상세 페이지로 이동

### 3. LLM 통합 준비 완료 ✅

#### AI 서비스 구조 (`services/ai/`)
- **schemas.py**: 요청/응답 모델 정의
  - `SearchRequest`: 검색 쿼리 + 아이템 목록
  - `SearchItem`: 분실물 정보 (id, name, category, brand, color, features, stored_place)
  - `SearchScore`: 유사도 점수 + 매칭 이유
  - `SearchResponse`: 검색 결과
- **service.py**: 유사도 점수 계산 로직
  - 현재는 규칙 기반 스코어링
  - 제목 매칭(40점), 카테고리(15점), 브랜드(15점), 색상(15점) 등
  - 추후 실제 LLM 통합을 위한 `call_llm_api()` 함수 준비
- **main.py**: FastAPI 엔드포인트
  - `POST /search`: LLM 기반 검색 엔드포인트
  - 현재는 규칙 기반, 추후 LLM 통합 예정

## LLM 통합 방법

### 현재 구조
```
검색 페이지 → 검색 쿼리 → 결과 페이지
                              ↓
                        GET /search?q={query}
                              ↓
                         DB에서 분실물 검색
                              ↓
                        결과를 카드로 표시
```

### LLM 통합 후 구조
```
검색 페이지 → 검색 쿼리 → 결과 페이지
                              ↓
                        GET /search?q={query}
                              ↓
                        DB에서 후보 아이템 검색 (수십 개)
                              ↓
                        POST /ai/search (LLM 서비스)
                              ↓
                        LLM으로 유사도 점수 계산
                              ↓
                        점수 높은 순으로 정렬
                              ↓
                        상위 5개만 결과로 표시
```

### LLM 서비스 통합 방법

1. **AI 서비스 실행**
   ```bash
   cd services/ai
   uvicorn app.main:app --reload --port 8001
   ```

2. **백엔드에서 AI 서비스 호출** (`apps/api/app/routers/search.py` 수정)
   ```python
   @router.get("/search-ai")
   def search_with_ai(
       q: str = Query(...),
       db: Session = Depends(get_db),
   ):
       # 1. DB에서 후보 아이템 검색
       candidates = db.query(Item).filter(Item.status == ItemStatus.STORED).limit(50).all()
       
       # 2. AI 서비스로 검색 쿼리 전송
       import httpx
       ai_response = httpx.post(
           "http://localhost:8001/search",
           json={
               "query": q,
               "items": [{"id": i.id, "name": i.name, ...} for i in candidates]
           }
       ).json()
       
       # 3. 점수 높은 순으로 상위 5개 선택
       scored_ids = {s["item_id"]: s["score"] for s in ai_response["results"][:5]}
       
       # 4. 결과 반환
       return [...]
   ```

3. **실제 LLM 모델 통합** (`services/ai/app/service.py` 수정)
   ```python
   async def call_llm_api(query: str, items: List[SearchItem]) -> List[SearchScore]:
       # 예시: OpenAI Embeddings 사용
       import openai
       
       # 쿼리를 임베딩으로 변환
       query_embedding = await openai.Embedding.acreate(
           model="text-embedding-ada-002",
           input=query
       )
       
       # 각 아이템도 임베딩으로 변환
       item_embeddings = []
       for item in items:
           item_text = f"{item.name} {item.category} {item.brand} {item.color}"
           embedding = await openai.Embedding.acreate(
               model="text-embedding-ada-002",
               input=item_text
           )
           item_embeddings.append(embedding)
       
       # 코사인 유사도 계산
       similarities = calculate_cosine_similarity(query_embedding, item_embeddings)
       
       # 점수를 백분율로 변환하고 매칭 이유 생성
       scores = []
       for i, similarity in enumerate(similarities):
           score = min(similarity * 100, 100.0)
           scores.append(SearchScore(
               item_id=items[i].id,
               score=round(score, 1),
               reason=f"유사도 {similarity:.2%}"
           ))
       
       return sorted(scores, key=lambda x: x.score, reverse=True)
   ```

## 현재 동작 흐름

1. 사용자가 검색 페이지에서 "하늘색 무늬 케이스의 아이폰 12 Pro" 검색
2. 결과 페이지로 이동 (`/results?q=하늘색 무늬 케이스의 아이폰 12 Pro`)
3. 프론트엔드가 `GET /search?q=하늘색 무늬 케이스의 아이폰 12 Pro` 호출
4. 백엔드가 키워드("하늘색", "무늬", "케이스", "아이폰", "12", "Pro")로 DB 검색
5. 매칭되는 분실물을 반환
6. 프론트엔드가 카드 형식으로 표시
7. 상세보기 클릭 시 `/items/{id}` 페이지로 이동

## 테스트 방법

```bash
# 백엔드 실행
cd apps/api
uvicorn app.main:app --reload

# 프론트엔드 실행
cd apps/frontend
npm run dev

# AI 서비스 실행 (선택사항, LLM 통합 후)
cd services/ai
uvicorn app.main:app --reload --port 8001
```

### 테스트 시나리오

1. 분실물 등록 페이지에서 여러 개의 분실물을 등록 (예: "아이폰 12 Pro", "하늘색 지갑", "무선 헤드셋")
2. 검색 페이지에서 "아이폰" 또는 "하늘색" 검색
3. 결과 페이지에서 매칭되는 분실물 확인
4. 각 분실물 카드 클릭하여 상세 페이지 확인

## 향후 개선 사항

- [ ] 실제 LLM 모델 통합 (OpenAI, Claude, Gemma 등)
- [ ] 검색 결과에서 유사도 점수 표시
- [ ] 매칭 이유 설명 표시
- [ ] 검색 히스토리 저장
- [ ] 검색 성능 최적화 (인덱싱)

