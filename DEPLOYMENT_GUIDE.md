# 🚀 검색 기능 수정사항 배포 가이드

## 📋 개요

**브랜치**: `fix/search-field-mismatch`
**GitHub URL**: https://github.com/donghyeok3295/devops_project/tree/fix/search-field-mismatch

이 브랜치에는 백엔드-AI 서비스 간 필드 불일치 문제를 해결하는 수정사항이 포함되어 있습니다.

## 🔧 백엔드 서버 (203.234.62.84) 배포 절차

### 1. 코드 받기

```bash
# 프로젝트 디렉토리로 이동
cd /path/to/devops_project

# 최신 변경사항 가져오기
git fetch origin

# 수정 브랜치로 전환
git checkout fix/search-field-mismatch

# 최신 버전으로 업데이트
git pull origin fix/search-field-mismatch
```

### 2. 변경된 파일 확인

```bash
# 어떤 파일이 변경되었는지 확인
git log -1 --name-only

# 변경 내용:
# - apps/api/app/routers/items.py (백엔드 API)
# - services/ai/app/routers/search.py (AI 서비스)
# - test_search_flow.py (테스트 스크립트)
# - SEARCH_FIX_SUMMARY.md (문서)
```

### 3. 백엔드 API 서버 재시작

```bash
# 기존 서버 프로세스 종료
# 방법 1: Ctrl+C (터미널에서 실행 중인 경우)
# 방법 2: pkill -f "uvicorn app.main:app"
# 방법 3: ps aux | grep uvicorn 후 해당 PID로 kill

# 백엔드 API 디렉토리로 이동
cd apps/api

# 서버 재시작
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 변경사항 검증

```bash
# 프로젝트 루트에서 테스트 실행
cd /path/to/devops_project
python test_search_flow.py
```

**성공 시 출력 예시**:
```
✅ 상태 코드: 200
📦 후보 아이템 개수: 6
✅ 필드 검증: id와 item_id 모두 존재
```

### 5. 수동 API 테스트 (선택)

```bash
# /items/candidates 엔드포인트 테스트
curl -H "X-Admin-Token: dev-internal-secret" \
     http://203.234.62.84:8000/items/candidates
```

**기대 결과**: 응답에 `"id"`와 `"item_id"` 필드가 모두 포함되어야 함

```json
{
  "candidates": [
    {
      "id": 25,
      "item_id": 25,
      "name": "가방",
      ...
    }
  ]
}
```

## 🤖 AI 서비스 (203.234.62.47) 배포 절차

### 1. 코드 받기

```bash
# 프로젝트 디렉토리로 이동
cd /path/to/devops_project

# 최신 변경사항 가져오기
git fetch origin
git checkout fix/search-field-mismatch
git pull origin fix/search-field-mismatch
```

### 2. AI 서비스 재시작

```bash
# 기존 서버 프로세스 종료
# Ctrl+C 또는 pkill -f "uvicorn app.main:app"

# AI 서비스 디렉토리로 이동
cd services/ai

# 서버 재시작
uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```

### 3. AI 검색 테스트

```bash
curl -X POST http://localhost:9000/search \
     -H "Content-Type: application/json" \
     -H "X-Admin-Token: dev-internal-secret" \
     -d '{"query_text": "빨간색 상의"}'
```

**기대 결과**: 검색 결과에 점수와 이유가 포함되어야 함

## 📊 전체 통합 테스트

### 자동 테스트 실행

```bash
# 프로젝트 루트에서
python test_search_flow.py
```

### 프론트엔드 테스트

1. 브라우저에서 접속: `http://localhost:3000/search`
2. "빨간색 상의" 검색
3. 결과 확인:
   - ✅ 검색 결과가 표시됨
   - ✅ 점수가 표시됨
   - ✅ 매칭 이유가 표시됨

## 🔍 주요 변경사항

### apps/api/app/routers/items.py

**변경 전**:
```python
candidates.append({
    "item_id": item.id,
    # ...
})
```

**변경 후**:
```python
candidates.append({
    "id": item.id,          # AI 서비스가 사용
    "item_id": item.id,     # 호환성 유지
    # ...
})
```

## 🚨 문제 해결

### 문제 1: "필드 검증 실패: 'id' 필드가 없습니다"

**원인**: 백엔드 서버가 재시작되지 않음

**해결**:
```bash
cd apps/api
pkill -f "uvicorn app.main:app"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 문제 2: AI 서비스 연결 실패

**원인**: 백엔드 또는 AI 서비스가 실행 중이 아님

**확인**:
```bash
# 백엔드 확인
curl http://203.234.62.84:8000/docs

# AI 서비스 확인
curl http://203.234.62.47:9000/docs
```

### 문제 3: 검색 결과 점수가 0

**원인**: LLM 서버(LM Studio) 미실행

**해결**:
1. LM Studio 실행
2. 모델 로드: `exaone-3.5-7.8b-instruct`
3. 서버 시작: `http://127.0.0.1:1234`

## 📞 연락처

문제 발생 시:
1. GitHub Issue 생성: https://github.com/donghyeok3295/devops_project/issues
2. 로그 파일 첨부
3. 에러 메시지 복사

## ✅ 배포 체크리스트

백엔드 서버:
- [ ] 코드 업데이트 완료 (`git pull`)
- [ ] 서버 재시작 완료
- [ ] `/items/candidates` API 테스트 통과
- [ ] `id` 필드 확인 완료

AI 서비스:
- [ ] 코드 업데이트 완료 (`git pull`)
- [ ] 서버 재시작 완료
- [ ] `/search` API 테스트 통과
- [ ] LLM 서버 실행 확인

전체 시스템:
- [ ] 통합 테스트 스크립트 실행 (`python test_search_flow.py`)
- [ ] 프론트엔드 검색 기능 확인
- [ ] 점수 및 매칭 이유 표시 확인

## 📝 참고 문서

- 상세 문제 해결: `SEARCH_FIX_SUMMARY.md`
- 테스트 스크립트: `test_search_flow.py`
- PR 링크: https://github.com/donghyeok3295/devops_project/pull/new/fix/search-field-mismatch

---

**배포 일시**: 2025. 11. 2.
**작성자**: Cline AI Assistant
