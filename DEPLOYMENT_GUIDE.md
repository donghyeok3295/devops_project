# 🖥️ 3개 PC 분산 배포 가이드

이 가이드는 devops_project를 3개의 PC에 분산하여 실행하는 방법을 설명합니다.

## 📋 배포 구성

```
PC1 (백엔드+DB)          PC2 (AI+LLM)           PC3 (클라이언트)
┌──────────────┐         ┌──────────────┐        ┌──────────────┐
│  FastAPI     │◄────────│   AI 서비스   │        │   Next.js    │
│  포트: 8000  │         │  포트: 9000   │        │  포트: 3000  │
├──────────────┤         ├──────────────┤        └──────┬───────┘
│  Oracle DB   │         │  LM Studio   │               │
│  포트: 1521  │         │  포트: 1234   │               │
└──────────────┘         └──────────────┘               │
       ▲                                                │
       └────────────────────────────────────────────────┘
```

---

## 🔧 PC1: 백엔드 API + Oracle DB

### 1. 사전 요구사항
- Python 3.10+
- Docker (Oracle DB 실행용)
- Git

### 2. 설치 및 설정

```bash
# 1. 저장소 클론
cd ~/projects
git clone <repository-url>
cd devops_project

# 2. Oracle DB 실행
docker run -d \
  --name oracle-db \
  -p 1521:1521 \
  -p 5500:5500 \
  -e ORACLE_PASSWORD=secret \
  -v oracle-data:/opt/oracle/oradata \
  gvenzl/oracle-free:23-slim

# DB 초기화 대기 (약 2-3분 소요)
docker logs -f oracle-db

# 3. API 서비스 환경 설정
cd apps/api
cp .env.example .env

# .env 파일 편집
nano .env
```

### 3. .env 파일 설정
```bash
# PC2의 IP 주소로 변경! (예: 192.168.0.100)
AI_SERVICE_URL=http://192.168.0.100:9000
AI_INTERNAL_TOKEN=dev-internal-secret

# DB 설정 (로컬)
ORACLE_DSN=localhost:1521/FREEPDB1
ORACLE_USER=lostfound
ORACLE_PASSWORD=secret
JWT_SECRET=your-random-secret-key-here
```

### 4. 서비스 실행
```bash
# 의존성 설치
pip install -r requirements.txt

# FastAPI 서버 실행 (모든 네트워크 인터페이스에서 접근 가능)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. 방화벽 설정
```bash
# Windows 방화벽
# 제어판 > Windows Defender 방화벽 > 고급 설정 > 인바운드 규칙
# 포트 8000 허용

# Linux (Ubuntu/Debian)
sudo ufw allow 8000/tcp
sudo ufw allow 1521/tcp
```

### 6. 테스트
```bash
# 로컬 테스트
curl http://localhost:8000/health

# 다른 PC에서 접근 테스트 (PC1의 IP가 192.168.0.50이라고 가정)
curl http://192.168.0.50:8000/health
```

---

## 🤖 PC2: AI 서비스 + LLM

### 1. 사전 요구사항
- Python 3.10+
- LM Studio (또는 OpenAI 호환 LLM 서버)
- Git

### 2. LM Studio 설치 및 설정

```bash
# 1. LM Studio 다운로드
# https://lmstudio.ai/ 에서 다운로드 후 설치

# 2. LM Studio 실행
# - 모델 다운로드: exaone-3.5-7.8b-instruct (또는 유사 모델)
# - Local Server 탭 선택
# - Server Port: 1234 (기본값)
# - Start Server 클릭
```

### 3. AI 서비스 설치 및 설정

```bash
# 1. 저장소 클론
cd ~/projects
git clone <repository-url>
cd devops_project/services/ai

# 2. 환경 변수 설정
cp ../../.env.example .env

# .env 파일 편집
nano .env
```

### 4. .env 파일 설정
```bash
# AI 서비스 인증 토큰 (PC1과 동일하게 설정!)
ADMIN_TOKEN=dev-internal-secret
AI_INTERNAL_TOKEN=

# LLM 설정 (로컬)
LLM_BASE_URL=http://127.0.0.1:1234/v1
LLM_MODEL=exaone-3.5-7.8b-instruct
LLM_API_KEY=
LLM_TIMEOUT_SECONDS=8
LLM_TEMPERATURE=0.2

# 매칭 규칙 파라미터
SIGMA_KM=1.5
HALF_LIFE_HOURS=24
```

### 5. 서비스 실행
```bash
# 의존성 설치
pip install -r requirements.txt

# AI 서비스 실행 (모든 네트워크 인터페이스에서 접근 가능)
uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```

### 6. 방화벽 설정
```bash
# Windows 방화벽
# 포트 9000 허용

# Linux (Ubuntu/Debian)
sudo ufw allow 9000/tcp
```

### 7. 테스트
```bash
# 로컬 테스트
curl http://localhost:9000/healthz

# LLM 연결 테스트
curl -X POST http://localhost:9000/rerank \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: dev-internal-secret" \
  -d '{
    "query_text": "검은색 지갑을 잃어버렸어요",
    "candidates": [
      {
        "item_id": 1,
        "name": "검은색 지갑",
        "brand": "루이비통",
        "color": "검은색"
      }
    ]
  }'
```

---

## 💻 PC3: 프론트엔드 (클라이언트)

### 1. 사전 요구사항
- Node.js 18+ (LTS 버전 권장)
- npm 또는 yarn
- Git

### 2. 설치 및 설정

```bash
# 1. 저장소 클론
cd ~/projects
git clone <repository-url>
cd devops_project/apps/frontend

# 2. 환경 변수 설정
cp .env.example .env.local

# .env.local 파일 편집
nano .env.local
```

### 3. .env.local 파일 설정
```bash
# PC1의 IP 주소로 변경! (예: 192.168.0.50)
NEXT_PUBLIC_API_BASE=http://192.168.0.50:8000
```

### 4. 서비스 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 또는 프로덕션 빌드
npm run build
npm start
```

### 5. 브라우저에서 접속
```
http://localhost:3000
```

---

## 🔗 네트워크 연결 확인

### IP 주소 확인

**Windows:**
```bash
ipconfig
# IPv4 주소 확인
```

**Linux/Mac:**
```bash
ifconfig
# 또는
ip addr show
```

### 전체 시스템 테스트

```bash
# PC3 (프론트엔드)에서 실행

# 1. PC1 백엔드 연결 확인
curl http://192.168.0.50:8000/health

# 2. 검색 API 테스트 (백엔드 -> AI 서비스 호출)
curl -X POST http://192.168.0.50:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "text": "검은색 지갑 잃어버렸습니다",
    "radius_km": 20.0
  }'
```

---

## ⚠️ 문제 해결

### 1. "Connection refused" 오류
- 방화벽 설정 확인
- 서비스가 `0.0.0.0`으로 바인딩되었는지 확인 (localhost만으로는 외부 접근 불가)
- IP 주소가 올바른지 확인

### 2. AI 서비스 타임아웃
- LM Studio가 실행 중인지 확인
- LLM 모델이 로드되었는지 확인
- `LLM_TIMEOUT_SECONDS` 값을 늘려보기 (예: 30초)

### 3. CORS 오류
- API 서버의 CORS 설정 확인 (`apps/api/app/main.py`)
- 브라우저 개발자 도구에서 자세한 오류 확인

### 4. Oracle DB 연결 실패
- Docker 컨테이너 상태 확인: `docker ps`
- DB 초기화 완료 여부 확인: `docker logs oracle-db`
- 포트 충돌 확인: `netstat -an | grep 1521`

---

## 📊 서비스 상태 모니터링

### PC1 (백엔드)
```bash
# API 서버 로그 확인
tail -f app.log

# DB 연결 확인
docker exec -it oracle-db sqlplus lostfound/secret@FREEPDB1
```

### PC2 (AI)
```bash
# AI 서비스 로그
tail -f ai-service.log

# LLM 호출 디버깅 활성화
export LLM_DEBUG=1
uvicorn app.main:app --host 0.0.0.0 --port 9000
```

### PC3 (프론트엔드)
```bash
# Next.js 로그 확인
npm run dev
```

---

## 🎯 성능 최적화 팁

1. **LLM 서버 (PC2)**
   - GPU가 있는 PC 사용 권장
   - 모델 크기와 VRAM 고려 (7B 모델: 최소 8GB VRAM)
   - Quantization 사용 (Q4, Q5 등)

2. **네트워크**
   - 가능하면 유선 랜 사용
   - 같은 네트워크 대역 사용 (192.168.0.x)

3. **API 서버 (PC1)**
   - Oracle DB SGA 메모리 설정 최적화
   - 연결 풀링 설정 조정

---

## 📝 체크리스트

### PC1 (백엔드+DB) ✓
- [ ] Oracle DB 실행 중 (`docker ps`)
- [ ] .env 파일에 PC2 IP 설정 완료
- [ ] API 서버 8000 포트 실행 중
- [ ] 방화벽 8000 포트 허용
- [ ] 헬스체크 성공 (`/health`)

### PC2 (AI+LLM) ✓
- [ ] LM Studio 실행 및 모델 로드 완료
- [ ] LM Studio 서버 1234 포트에서 실행 중
- [ ] .env 파일 설정 완료
- [ ] AI 서비스 9000 포트 실행 중
- [ ] 방화벽 9000 포트 허용
- [ ] 헬스체크 성공 (`/healthz`)
- [ ] 재랭킹 테스트 성공

### PC3 (프론트엔드) ✓
- [ ] .env.local 파일에 PC1 IP 설정 완료
- [ ] npm install 완료
- [ ] Next.js 서버 3000 포트 실행 중
- [ ] PC1 백엔드 연결 확인
- [ ] 브라우저에서 접속 가능

---

## 🚀 빠른 시작 요약

```bash
# PC1 (백엔드)
cd devops_project/apps/api
cp .env.example .env
# .env 편집: AI_SERVICE_URL=http://PC2_IP:9000
docker run -d -p 1521:1521 -e ORACLE_PASSWORD=secret gvenzl/oracle-free:23-slim
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000

# PC2 (AI)
# 1. LM Studio 실행 및 모델 로드 (포트 1234)
cd devops_project/services/ai
cp ../../.env.example .env
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 9000

# PC3 (프론트엔드)
cd devops_project/apps/frontend
cp .env.example .env.local
# .env.local 편집: NEXT_PUBLIC_API_BASE=http://PC1_IP:8000
npm install
npm run dev
```

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 모든 서비스의 로그 확인
2. 네트워크 연결 상태 확인 (`ping`, `curl`)
3. 방화벽 설정 확인
4. 환경 변수 설정 확인

각 서비스의 상세 로그와 함께 이슈를 보고해주세요.
