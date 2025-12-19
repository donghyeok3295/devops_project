# 🤖 AI 검색 기능 완전 가이드

## 📋 개요

LLM을 사용한 **자연어 기반 분실물 검색 및 매칭 시스템**

---

## 🔄 전체 흐름도

```
[사용자]
   ↓ "검은색 아이폰 도서관에서 잃어버림"
[프론트엔드] (results/page.tsx)
   ↓ POST /search
[AI 서버] (services/ai)
   ↓ 1. LLM으로 자연어 분석
   ↓ 2. 백엔드에서 후보 아이템 가져오기
   ↓ 3. AI 점수 계산 (0-100점)
   ↓ 4. 결과 정렬 (점수 높은 순)
   ↓ 5. 검색 로그 저장 ✅
[백엔드 API] (apps/api)
   ↓ MatchLog 테이블에 저장
[프론트엔드]
   ↓ 결과 표시 (점수 + 이유)
[사용자]
```

---

## 🎯 핵심 컴포넌트

### 1️⃣ **프론트엔드** (`apps/frontend/app/results/page.tsx`)

```typescript
// AI 서버로 직접 검색 요청
const res = await fetch(`${AI_BASE}/search`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Admin-Token": "dev-internal-secret",
  },
  body: JSON.stringify({
    query_text: "검은색 아이폰 도서관에서 잃어버림",
  }),
});
```

**결과 표시**:

- 점수 (0-100점)
- 매칭 이유 (AI가 설명)
- 분실물 정보 (사진, 이름, 브랜드, 색상 등)

---

### 2️⃣ **AI 서버** (`services/ai/app/routers/search.py`)

#### 단계 1: 백엔드에서 후보 가져오기

```python
# GET /items/candidates
candidates = await client.get(f"{backend_url}/items/candidates")
# 결과: 보관 중인 모든 분실물 목록
```

#### 단계 2: LLM으로 점수 계산

```python
# services/ai/app/services/pipeline.py
def rerank(query_text, candidates):
    # LLM에게 질문:
    # "사용자가 '검은색 아이폰'을 찾는데,
    #  이 분실물(아이폰 12 프로, 검정색)이 얼마나 유사한가?"

    # LLM 응답:
    # {
    #   "score": 95,
    #   "reason": "색상(검정)과 카테고리(아이폰)가 정확히 일치"
    # }
```

#### 단계 3: 결과 정렬 및 반환

```python
results = sorted(results, key=lambda x: x["score"], reverse=True)
return results[:10]  # Top 10
```

#### 단계 4: 검색 로그 저장 ✅

```python
# 백엔드로 로그 전송
await client.post(f"{backend_url}/items/search-logs", json={
    "query_text": "검은색 아이폰 도서관에서 잃어버림",
    "results": [
        {"item_id": 1, "score": 95, "reason": "색상과 카테고리 일치"},
        {"item_id": 2, "score": 80, "reason": "카테고리 일치"},
        # ...
    ]
})
```

---

### 3️⃣ **백엔드 API** (`apps/api`)

#### MatchLog 테이블 구조

```python
class MatchLog:
    id: int                    # 로그 ID
    user_id: int | None        # 사용자 (비로그인 가능)
    query_text: str            # "검은색 아이폰 도서관에서 잃어버림"
    item_id: int               # 매칭된 분실물 ID
    ai_score: float            # AI 점수 (95.5)
    ai_reason: str             # "색상과 카테고리 일치"
    created_at: datetime       # 검색 시간
```

#### 로그 저장 엔드포인트

```python
# POST /items/search-logs
# AI 서버 전용 (X-Admin-Token 필요)
def save_search_logs(payload: SearchLogIn):
    for result in payload.results:
        log = MatchLog(
            query_text=payload.query_text,
            item_id=result["item_id"],
            ai_score=result["score"],
            ai_reason=result["reason"]
        )
        db.add(log)
    db.commit()
```

---

## 🧪 테스트 방법

### 1. 백엔드 실행

```bash
cd apps/api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. AI 서버 실행

```bash
cd services/ai
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 9000
```

### 3. 프론트엔드 실행

```bash
cd apps/frontend
npm run dev
```

### 4. 검색 테스트

1. http://localhost:3000/search 접속
2. "검은색 아이폰"으로 검색
3. 결과에 **점수**와 **매칭 이유** 표시됨
4. DB에서 확인:
   ```sql
   SELECT * FROM MATCH_LOGS ORDER BY created_at DESC LIMIT 10;
   ```

---

## 📊 로그 활용 방법

### 1. 검색 성능 분석

```sql
-- 평균 점수 확인
SELECT AVG(ai_score) as avg_score
FROM MATCH_LOGS
WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Top 검색어
SELECT query_text, COUNT(*) as count
FROM MATCH_LOGS
GROUP BY query_text
ORDER BY count DESC
LIMIT 10;
```

### 2. AI 점수 개선

```sql
-- 낮은 점수 검색 분석
SELECT query_text, ai_score, ai_reason
FROM MATCH_LOGS
WHERE ai_score < 50
ORDER BY created_at DESC
LIMIT 20;
```

### 3. 인기 분실물 파악

```sql
-- 가장 많이 검색된 분실물
SELECT item_id, COUNT(*) as search_count
FROM MATCH_LOGS
WHERE item_id IS NOT NULL
GROUP BY item_id
ORDER BY search_count DESC
LIMIT 10;
```

---

## 🎨 사용자 경험

### 검색 전:

```
┌─────────────────────────────────┐
│ 🔍 무엇을 잃어버리셨나요?       │
│ [검은색 아이폰 도서관에서...]   │
│              [검색]              │
└─────────────────────────────────┘
```

### 검색 후:

```
┌─────────────────────────────────┐
│ 📱 아이폰 12 프로              │
│ ⭐ 95점                        │
│ 📍 중앙도서관 3층 열람실        │
│ 💡 색상(검정)과 카테고리 일치   │
│ 🖼️ [사진]                      │
└─────────────────────────────────┘
```

---

## ⚙️ 설정

### 환경 변수

**AI 서버** (`services/ai/.env`):

```bash
BACKEND_API_URL=http://localhost:8000  # 백엔드 주소
ADMIN_TOKEN=dev-internal-secret         # 인증 토큰
LLM_BASE_URL=http://localhost:1234/v1  # LLM 서버
LLM_MODEL=exaone-3.5-7.8b-instruct      # 사용할 모델
```

**프론트엔드** (`apps/frontend/.env.local`):

```bash
NEXT_PUBLIC_AI_BASE=http://localhost:9000  # AI 서버 주소
```

---

## 🚀 성능 최적화

### 1. 캐싱

- 자주 검색되는 쿼리 결과 캐싱
- Redis 또는 메모리 캐시 사용

### 2. 배치 처리

- 한 번에 여러 아이템 점수 계산
- LLM API 호출 횟수 최소화

### 3. 인덱싱

```sql
CREATE INDEX idx_match_logs_query ON MATCH_LOGS(query_text);
CREATE INDEX idx_match_logs_item ON MATCH_LOGS(item_id);
CREATE INDEX idx_match_logs_score ON MATCH_LOGS(ai_score DESC);
```

---

## 🔒 보안

1. **AI 서버 인증**: `X-Admin-Token` 헤더 필수
2. **Rate Limiting**: 과도한 검색 요청 방지
3. **Input Validation**: 쿼리 길이 제한 (500자)

---

## 📝 정리

### ✅ 구현 완료

- ✅ LLM 기반 자연어 검색
- ✅ AI 점수 계산 (0-100점)
- ✅ 매칭 이유 설명
- ✅ 검색 로그 저장 (MatchLog)
- ✅ 성능 분석용 인덱스

### 📍 MatchLog 테이블 용도

1. **성능 분석**: 어떤 검색어가 높은 점수를 받는가?
2. **AI 개선**: 낮은 점수 검색 분석 → 모델 튜닝
3. **사용자 분석**: 가장 많이 검색되는 분실물은?
4. **추천 시스템**: 비슷한 검색어 → 관련 분실물 추천

---

**이제 AI 검색 기능이 완전히 작동합니다!** 🎉
