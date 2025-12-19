# 🚀 로컬 환경 설정 가이드

## 📋 시스템 요구사항

- **OS**: Windows 10/11
- **Python**: 3.9 이상
- **Node.js**: 18 이상
- **Oracle DB**: 실행 중
- **LM Studio**: 설치됨
- **디스크 공간**: 최소 10GB (LLM 모델 포함)

## 🔧 초기 설정 (처음 한 번만)

### 1. 백엔드 API 설정

```bash
cd apps/api

# 가상환경 생성
python -m venv venv

# 가상환경 활성화 (Windows)
.\venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정 (.env 파일 생성)
# Oracle DB 연결 정보 입력
```

### 2. AI 서비스 설정

```bash
cd services/ai

# 가상환경 생성
python -m venv .venv

# 가상환경 활성화 (Windows)
.\.venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 확인
# .env 파일이 이미 설정되어 있음:
# - BACKEND_API_URL=http://localhost:8000
# - LLM_BASE_URL=http://127.0.0.1:1234/v1
```

### 3. 프론트엔드 설정

```bash
cd apps/frontend

# 의존성 설치
npm install

# 환경변수 확인
# .env.local 파일이 이미 설정되어 있음:
# - NEXT_PUBLIC_API_BASE=http://localhost:8000
# - NEXT_PUBLIC_AI_BASE=http://localhost:9000
```

### 4. LM Studio 설정

1. LM Studio 다운로드 및 설치
2. 모델 다운로드: **exaone-3.5-7.8b-instruct**
3. Local Server 설정:
   - 포트: 1234
   - Model: exaone-3.5-7.8b-instruct

## ⚡ 빠른 시작

### 방법 1: 배치 스크립트 사용 (추천)

1. **Oracle DB 시작** (미리 실행되어 있어야 함)
2. **LM Studio 시작** (모델 로드 후 서버 시작)
3. `start-all.bat` 더블클릭

```bash
# 또는 명령줄에서
start-all.bat
```

이 스크립트는 자동으로 3개의 터미널을 열고:
- 백엔드 API (포트 8000)
- AI 서비스 (포트 9000)
- 프론트엔드 (포트 3000)

를 시작합니다.

### 방법 2: 수동 시작

자세한 내용은 [START_SERVICES.md](START_SERVICES.md) 참조

## 🌐 접속 주소

시작 후 다음 주소로 접속:

| 서비스 | URL | 설명 |
|--------|-----|------|
| **웹 UI** | http://localhost:3000 | 사용자 인터페이스 |
| **검색 페이지** | http://localhost:3000/search | AI 검색 |
| 백엔드 API | http://localhost:8000/docs | API 문서 (Swagger) |
| AI 서비스 | http://localhost:9000/docs | AI API 문서 |
| LM Studio | http://127.0.0.1:1234/v1/models | LLM 서버 상태 |

## 🧪 테스트

### 1. 각 서비스 상태 확인

```bash
# LM Studio
curl http://127.0.0.1:1234/v1/models

# 백엔드
curl http://localhost:8000/health/ping

# AI 서비스
curl http://localhost:9000/healthz
```

### 2. 전체 검색 플로우 테스트

```bash
# AI 검색 API 직접 호출
curl -X POST http://localhost:9000/search \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: dev-internal-secret" \
  -d "{\"query_text\": \"빨간색 아이폰\"}"
```

### 3. 웹 UI 테스트

1. http://localhost:3000/search 접속
2. 검색어 입력 (예: "빨간색 아이폰")
3. 검색 결과 확인
   - 각 아이템의 점수
   - 매칭 근거
   - 사진 및 상세 정보

## 🐛 문제 해결

### 포트 이미 사용 중

```bash
# Windows에서 포트 사용 프로세스 확인
netstat -ano | findstr :8000
netstat -ano | findstr :9000
netstat -ano | findstr :3000

# 프로세스 종료
taskkill /PID <프로세스ID> /F
```

### 서비스 연결 실패

1. **각 서비스가 실행 중인지 확인**
   - 터미널에 에러 메시지 없는지 확인
   - 각 서비스의 health 엔드포인트 접속

2. **.env 파일 확인**
   - 모든 URL이 `localhost`로 설정되어 있는지
   - 포트 번호가 올바른지

3. **방화벽 확인**
   - Windows Defender 방화벽에서 Python, Node.js 허용

### Oracle DB 연결 실패

```bash
# 백엔드 API 로그 확인
cd apps/api
# 터미널에서 DB 연결 오류 메시지 확인
```

**해결**:
- Oracle DB가 실행 중인지 확인
- `.env` 파일의 DB 연결 정보 확인
- 네트워크 연결 확인

### LLM 응답 없음

**증상**: AI 서비스 로그에 "[LLM ERROR] Timeout"

**해결**:
1. LM Studio가 실행 중인지 확인
2. 모델이 로드되었는지 확인 (하단 상태 바)
3. "Start Server" 버튼 클릭했는지 확인
4. http://127.0.0.1:1234/v1/models 접속 테스트

## 📊 시스템 아키텍처

```
┌─────────────────┐
│  사용자 브라우저  │
│  (localhost:3000)│
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│   프론트엔드     │
│   (Next.js)     │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐      ┌──────────────┐
│   AI 서비스      │─────▶│  LM Studio   │
│   (FastAPI)     │      │  (LLM 서버)  │
│  localhost:9000 │      │  :1234       │
└────────┬────────┘      └──────────────┘
         │ REST API
         ▼
┌─────────────────┐
│   백엔드 API     │
│   (FastAPI)     │
│  localhost:8000 │
└────────┬────────┘
         │ SQL
         ▼
┌─────────────────┐
│   Oracle DB     │
│  localhost:1521 │
└─────────────────┘
```

## 📚 추가 문서

- [START_SERVICES.md](START_SERVICES.md) - 상세한 서비스 시작 가이드
- [AI_SEARCH_FLOW.md](AI_SEARCH_FLOW.md) - AI 검색 플로우 설명
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 배포 가이드

## 🔐 보안 주의사항

- `X-Admin-Token`은 개발 환경 전용입니다
- 프로덕션 환경에서는 반드시 강력한 토큰으로 변경
- `.env` 파일은 절대 Git에 커밋하지 마세요
- Oracle DB 접속 정보는 안전하게 관리

## 💡 개발 팁

### Hot Reload

- **백엔드/AI**: `--reload` 옵션으로 코드 변경 시 자동 재시작
- **프론트엔드**: Next.js가 자동으로 Hot Reload

### 디버깅

각 서비스의 터미널에서 실시간 로그 확인:
- 백엔드: DB 쿼리, API 요청 로그
- AI 서비스: LLM 응답, 점수 계산 과정
- 프론트엔드: 컴파일 상태, 라우팅 로그

### VS Code 디버깅

각 서비스를 VS Code 디버거로 실행 가능:
1. `.vscode/launch.json` 설정
2. F5로 디버그 모드 시작
3. 브레이크포인트 설정하여 단계별 실행

## 🆘 지원

문제가 발생하면:
1. 각 서비스의 터미널 로그 확인
2. 브라우저 개발자 도구 (F12) Console 확인
3. [START_SERVICES.md](START_SERVICES.md)의 문제 해결 섹션 참조
