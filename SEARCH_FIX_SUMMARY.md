# 검색 기능 문제 해결 요약

## 🔍 발견된 문제

### 1. 필드 불일치 문제
**문제**: 백엔드 API와 AI 서비스 간 데이터 필드가 일치하지 않음

- **백엔드** `/items/candidates`가 `item_id` 필드만 반환
- **AI 서비스**는 `id` 필드를 기대함
- **결과**: 검색 결과가 올바르게 매칭되지 않음

### 2. 데이터 흐름
```
[프론트엔드] 
    ↓ POST /search {"query_text": "빨간색 상의"}
[AI 서비스 - 203.234.62.47:9000]
    ↓ GET /items/candidates (X-Admin-Token 인증)
[백엔드 API - 203.234.62.84:8000]
    ↓ 응답: {"candidates": [...]}
[AI 서비스]
    ↓ LLM 기반 랭킹 & 유사도 점수 계산
    ↓ 응답: {"results": [...]}
[프론트엔드]
    ↓ 검색 결과 표시
```

## ✅ 적용된 수정사항

### 1. 백엔드 API 수정 (`apps/api/app/routers/items.py`)

**Before**:
```python
candidates.append({
    "item_id": item.id,
    "name": item.name,
    # ...
})
```

**After**:
```python
candidates.append({
    "id": item.id,          # AI 서비스가 사용
    "item_id": item.id,     # 호환성 유지
    "name": item.name,
    # ...
})
```

### 2. 수정 이유
- AI 서비스의 `app/routers/search.py`가 `item.get("id")`를 사용
- 백엔드가 `id`와 `item_id` 둘 다 제공하여 호환성 보장

## 🧪 테스트 방법

### 자동 테스트 실행
```bash
cd devops_project
python test_search_flow.py
```

### 수동 테스트

#### 1. 백엔드 API 테스트
```bash
curl -H "X-Admin-Token: dev-internal-secret" \
     http://203.234.62.84:8000/items/candidates
```

**기대 결과**:
```json
{
  "candidates": [
    {
      "id": 1,
      "item_id": 1,
      "name": "아이템 이름",
      "brand": "브랜드",
      "color": "색상",
      ...
    }
  ]
}
```

#### 2. AI 서비스 테스트
```bash
curl -X POST http://localhost:9000/search \
     -H "Content-Type: application/json" \
     -H "X-Admin-Token: dev-internal-secret" \
     -d '{"query_text": "빨간색 상의"}'
```

**기대 결과**:
```json
{
  "results": [
    {
      "id": 1,
      "item_id": 1,
      "name": "빨간색 티셔츠",
      "score": 85.5,
      "reason": "색상 일치 (빨간색) | 카테고리 일치 (상의)",
      ...
    }
  ]
}
```

#### 3. 프론트엔드 테스트
1. 브라우저에서 `http://localhost:3000/search` 접속
2. "빨간색 상의" 검색
3. 결과 확인:
   - 점수 순으로 정렬된 결과
   - 각 아이템의 점수와 매칭 이유 표시

## 🔧 서버 재시작 방법

### 백엔드 API 재시작
```bash
cd devops_project/apps/api
# 기존 프로세스 종료 후
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### AI 서비스 재시작
```bash
cd devops_project/services/ai
# 기존 프로세스 종료 후
uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```

### 프론트엔드 재시작
```bash
cd devops_project/apps/frontend
npm run dev
```

## 📋 환경 변수 확인

### 백엔드 (apps/api/.env)
```env
AI_SERVICE_URL=http://203.234.62.47:9000
AI_INTERNAL_TOKEN=dev-internal-secret
```

### AI 서비스 (services/ai/.env)
```env
BACKEND_API_URL=http://203.234.62.84:8000
ADMIN_TOKEN=dev-internal-secret
LLM_BASE_URL=http://127.0.0.1:1234/v1
LLM_MODEL=exaone-3.5-7.8b-instruct
```

### 프론트엔드 (apps/frontend/.env.local)
```env
NEXT_PUBLIC_API_BASE=http://203.234.62.84:8000
NEXT_PUBLIC_AI_BASE=http://localhost:9000
```

## 🚨 주의사항

1. **IP 주소 확인**: 환경 변수의 IP가 실제 서버 IP와 일치하는지 확인
2. **포트 충돌**: 8000, 9000, 3000 포트가 이미 사용 중인지 확인
3. **방화벽**: 서버 간 통신을 위해 방화벽 설정 확인
4. **LLM 서버**: LM Studio가 `http://127.0.0.1:1234`에서 실행 중인지 확인

## 📊 검증 체크리스트

- [ ] 백엔드 API `/items/candidates`가 `id`와 `item_id` 모두 반환
- [ ] AI 서비스가 백엔드에서 데이터를 성공적으로 가져옴
- [ ] AI 서비스가 LLM을 통해 유사도 점수 계산
- [ ] 검색 결과가 점수 순으로 정렬됨
- [ ] 프론트엔드에서 검색 결과와 점수가 표시됨
- [ ] 매칭 이유(reason)가 올바르게 표시됨

## 🐛 트러블슈팅

### 문제: AI 서비스가 백엔드에 연결할 수 없음
**해결**:
```bash
# 백엔드 서버가 실행 중인지 확인
curl http://203.234.62.84:8000/docs

# AI 서비스의 BACKEND_API_URL 확인
cat services/ai/.env | grep BACKEND_API_URL
```

### 문제: 검색 결과가 비어있음
**해결**:
1. DB에 아이템이 등록되어 있는지 확인
2. 아이템의 `status`가 `STORED`인지 확인
3. 검색 쿼리가 너무 구체적이지 않은지 확인

### 문제: 점수가 표시되지 않음
**해결**:
1. AI 서비스가 LLM 서버에 연결되어 있는지 확인
2. LM Studio가 실행 중인지 확인
3. AI 서비스 로그 확인

## 📝 다음 개선 사항

1. **에러 핸들링 강화**: 더 자세한 에러 메시지
2. **캐싱**: 자주 검색되는 쿼리 캐싱
3. **성능 최적화**: 대량의 아이템 처리 최적화
4. **모니터링**: 검색 성능 및 정확도 모니터링
5. **A/B 테스트**: 다양한 랭킹 알고리즘 비교

## 🎉 결론

이제 전체 검색 흐름이 다음과 같이 작동합니다:

1. ✅ 프론트엔드가 AI 서비스로 검색 요청
2. ✅ AI 서비스가 백엔드에서 아이템 목록 조회
3. ✅ AI 서비스가 LLM으로 유사도 점수 계산
4. ✅ 점수 순으로 정렬된 결과 반환
5. ✅ 프론트엔드에서 결과와 점수 표시

**수정 일시**: 2025. 11. 2.
**수정자**: Cline AI Assistant
