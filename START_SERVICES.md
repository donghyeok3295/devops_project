# 서비스 시작 가이드 (로컬 환경)

> 🖥️ **주의**: 모든 서비스는 한 대의 컴퓨터에서 실행됩니다.
> Oracle DB도 같은 PC에서 실행되어야 합니다.

## 🚀 전체 서비스 실행 순서

### 0. Oracle DB 준비
```bash
# Oracle DB가 실행 중인지 확인
# 백엔드 API가 DB에 연결할 수 있어야 합니다.
```

### 1. LM Studio 실행 (LLM 서버)

```bash
# LM Studio 앱을 실행하고:
# 1. 모델 로드: exaone-3.5-7.8b-instruct
# 2. Local Server 시작
# 3. 포트 확인: http://127.0.0.1:1234
```

**확인**:
- LM Studio 하단에 "Server running on port 1234" 표시 확인
- 브라우저: http://127.0.0.1:1234/v1/models

### 2. 백엔드 API 서버 실행 (포트 8000)

**터미널 1 열기**:

```bash
cd apps/api

# 가상환경 활성화 (Windows)
.\venv\Scripts\activate

# 의존성 설치 (처음 한 번만)
pip install -r requirements.txt

# 서버 실행
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**확인**: http://localhost:8000/docs

### 3. AI 서비스 실행 (포트 9000)

**터미널 2 열기**:

```bash
cd services/ai

# 가상환경 활성화 (Windows)
.\.venv\Scripts\activate

# 의존성 설치 (처음 한 번만)
pip install -r requirements.txt

# 환경변수 확인 (중요!)
# .env 파일에서 다음 설정 확인:
# BACKEND_API_URL=http://localhost:8000
# LLM_BASE_URL=http://127.0.0.1:1234/v1

# 서버 실행
uvicorn app.main:app --host 127.0.0.1 --port 9000 --reload
```

**확인**: http://localhost:9000/docs

### 4. 프론트엔드 실행 (포트 3000)

**터미널 3 열기**:

```bash
cd apps/frontend

# 환경변수 확인 (중요!)
# .env.local 파일에서 다음 설정 확인:
# NEXT_PUBLIC_API_BASE=http://localhost:8000
# NEXT_PUBLIC_AI_BASE=http://localhost:9000

# 의존성 설치 (처음 한 번만)
npm install

# 개발 서버 실행
npm run dev
```

**확인**: http://localhost:3000

---

## 🔍 검색 기능 테스트

### 1. 브라우저에서 프론트엔드 접속
```
http://localhost:3000/search
```

### 2. 검색어 입력
```
예: "빨간색 아이폰"
```

### 3. 결과 확인
- 검색 결과가 웹 페이지에 표시됨
- 각 아이템의 점수와 매칭 근거 확인 가능

---

## 🐛 문제 해결

### AI 서비스 연결 실패
**증상**: "AI 서버 연결 실패" 에러

**해결**:
1. AI 서비스가 실행 중인지 확인: `http://localhost:9000/healthz`
2. 프론트엔드 `.env.local` 확인:
   ```
   NEXT_PUBLIC_AI_BASE=http://localhost:9000
   ```
3. AI 서비스 로그 확인

### 백엔드 연결 실패
**증상**: AI 서비스 로그에 "Failed to fetch items from backend"

**해결**:
1. 백엔드 API가 실행 중인지 확인: `http://localhost:8000/docs`
2. AI 서비스 `.env` 확인:
   ```
   BACKEND_API_URL=http://localhost:8000
   ```
3. X-Admin-Token이 일치하는지 확인 (`dev-internal-secret`)
4. Oracle DB가 실행 중이고 백엔드가 연결되어 있는지 확인

### LLM 서버 연결 실패
**증상**: AI 서비스 로그에 "[LLM ERROR] Timeout"

**해결**:
1. LM Studio가 실행 중인지 확인
2. 모델이 로드되었는지 확인
3. AI 서비스 `.env` 확인:
   ```
   LLM_BASE_URL=http://127.0.0.1:1234/v1
   LLM_MODEL=exaone-3.5-7.8b-instruct
   ```

### 결과가 안 나오는 경우
**증상**: 로딩만 계속되고 결과 없음

**해결**:
1. 브라우저 개발자 도구 (F12) → Console 탭 확인
2. Network 탭에서 `/search` 요청 상태 확인
3. 백엔드 DB에 아이템이 등록되어 있는지 확인

---

## 📊 서비스 상태 확인

### 각 서비스의 Health Check

```bash
# 1. LM Studio 확인
curl http://127.0.0.1:1234/v1/models

# 2. 백엔드 API 확인
curl http://localhost:8000/health/ping

# 3. AI 서비스 확인
curl http://localhost:9000/healthz

# 4. 후보 아이템 조회 테스트
curl -H "X-Admin-Token: dev-internal-secret" http://localhost:8000/items/candidates

# 5. AI 검색 테스트 (전체 플로우)
curl -X POST http://localhost:9000/search \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: dev-internal-secret" \
  -d "{\"query_text\": \"빨간색 아이폰\"}"
```

---

## 🎯 정상 작동 확인

모든 것이 정상이면:

1. ✅ 터미널에 LLM 로그 출력
2. ✅ 웹 페이지에 검색 결과 표시
3. ✅ 각 결과에 점수와 매칭 근거 표시
4. ✅ 사진과 상세 정보 표시

---

## 📝 주요 포트 정리

| 서비스 | 포트 | URL | 용도 |
|--------|------|-----|------|
| Oracle DB | 1521 | localhost:1521 | 데이터베이스 |
| LM Studio | 1234 | http://127.0.0.1:1234 | LLM 추론 서버 |
| 백엔드 API | 8000 | http://localhost:8000 | REST API, DB 연동 |
| AI 서비스 | 9000 | http://localhost:9000 | AI 매칭 엔진 |
| 프론트엔드 | 3000 | http://localhost:3000 | 웹 UI |

## 🔄 서비스 간 통신 흐름

```
사용자 브라우저 (localhost:3000)
         ↓
    AI 서비스 (localhost:9000)
         ↓
    백엔드 API (localhost:8000)
         ↓
    Oracle DB (localhost:1521)

AI 서비스 → LM Studio (localhost:1234) [LLM 점수 계산]
```

## ⚡ 빠른 시작 (Quick Start)

모든 서비스를 한 번에 시작하려면 **3개의 터미널**을 열어야 합니다:

### 터미널 1: 백엔드
```bash
cd C:\vscode\devops_project\apps\api
.\venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 터미널 2: AI 서비스
```bash
cd C:\vscode\devops_project\services\ai
.\.venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 9000 --reload
```

### 터미널 3: 프론트엔드
```bash
cd C:\vscode\devops_project\apps\frontend
npm run dev
```

### 추가: LM Studio
- LM Studio 앱 실행
- exaone-3.5-7.8b-instruct 모델 로드
- Local Server 시작 (포트 1234)

**모든 서비스가 실행되면**: http://localhost:3000/search 접속!
