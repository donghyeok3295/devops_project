# 🚀 빠른 시작 가이드

## 📋 PC 구성

```
PC1 (백엔드+DB)          PC2 (AI+LLM)              PC3 (프론트엔드)
- IP: 203.234.62.84     - IP: 203.234.62.47       - 클라이언트 PC
- FastAPI               - AI 재랭킹 서비스         - Next.js
- Oracle DB             - LM Studio               - 웹 브라우저
- 포트: 8000, 1521      - 포트: 9000, 1234        - 포트: 3000
```

**네트워크**: 모든 PC가 같은 네트워크에 연결되어 있어야 합니다.

---

## ⚡ PC2 (203.234.62.47): AI + LLM

### 1. LM Studio 실행
```bash
# 1. LM Studio 실행
# 2. 모델 로드: exaone-3.5-7.8b-instruct
# 3. Local Server 탭 → Port: 1234 → Start Server
```

### 2. AI 서비스 실행
```bash
cd devops_project/services/ai

# .env 파일 생성 (이미 있으면 스킵)
cp ../../.env.example .env

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# AI 서비스 실행 (외부 접근 허용)
uvicorn app.main:app --host 0.0.0.0 --port 9000
```

### 3. 방화벽 설정
```bash
# Windows: 제어판 → 방화벽 → 인바운드 규칙
# 포트 9000 허용

# Linux:
sudo ufw allow 9000/tcp
```

### 4. 테스트
```bash
# 로컬 테스트
curl http://localhost:9000/healthz

# 외부 접근 테스트 (다른 PC에서)
curl http://203.234.62.47:9000/healthz
```

---

## 💻 PC1 (백엔드+DB)

### 1. .env 파일 설정
```bash
cd devops_project/apps/api
cp .env.example .env

# .env 파일 내용 (이미 설정됨):
# AI_SERVICE_URL=http://203.234.62.47:9000
# AI_INTERNAL_TOKEN=dev-internal-secret
```

### 2. Oracle DB 실행 (Docker)
```bash
docker run -d \
  --name oracle-db \
  -p 1521:1521 \
  -e ORACLE_PASSWORD=secret \
  -v oracle-data:/opt/oracle/oradata \
  gvenzl/oracle-free:23-slim

# 초기화 대기 (2-3분)
docker logs -f oracle-db
```

### 3. API 서버 실행
```bash
# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# FastAPI 서버 실행
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 방화벽 설정
```bash
# Windows: 포트 8000 허용
# Linux:
sudo ufw allow 8000/tcp
```

### 5. 테스트
```bash
# 헬스체크
curl http://localhost:8000/health

# 검색 API 테스트 (AI 서비스 연동)
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "text": "검은색 지갑 잃어버렸습니다",
    "radius_km": 20.0
  }'
```

---

## 🌐 PC3 (프론트엔드)

### 1. .env.local 파일 설정
```bash
cd devops_project/apps/frontend
cp .env.example .env.local

# .env.local 파일 편집
# NEXT_PUBLIC_API_BASE=http://PC1_IP:8000
# PC1의 실제 IP 주소를 입력하세요
```

### 2. Next.js 실행
```bash
# 의존성 설치 (최초 1회)
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 접속
# http://localhost:3000
```

---

## 🧪 전체 통신 테스트

### 테스트 스크립트 실행 (PC1에서)
```bash
cd devops_project

# requests 라이브러리 설치
pip install requests

# 테스트 실행
python test_data_flow.py
```

**예상 결과**:
```
============================================================
 테스트 1: 백엔드 → AI 간 JSON 통신
============================================================

✅ 성공: AI 서비스 응답 형태 정상

============================================================
 테스트 2: 백엔드 /search 엔드포인트 (OpenAPI 계약)
============================================================

✅ 성공: OpenAPI SearchResponse 형태 정상

============================================================
 테스트 3: 전체 데이터 플로우
============================================================

✅ 성공: 전체 플로우 정상 동작
```

---

## 🔍 문제 해결

### AI 서비스 연결 실패
```bash
# PC2에서 확인
curl http://localhost:9000/healthz

# PC1에서 확인
curl http://203.234.62.47:9000/healthz

# 실패 시:
# 1. PC2 방화벽 확인
# 2. AI 서비스 실행 상태 확인
# 3. 네트워크 연결 확인: ping 203.234.62.47
```

### LLM 응답 없음
```bash
# PC2에서 LM Studio 상태 확인
# - 모델이 로드되었는지
# - Local Server가 1234 포트에서 실행 중인지

# LLM 직접 테스트
curl http://localhost:1234/v1/models
```

### 백엔드 에러
```bash
# 로그 확인
# uvicorn 터미널에서 에러 메시지 확인

# .env 파일 확인
cat apps/api/.env
# AI_SERVICE_URL=http://203.234.62.47:9000 인지 확인
```

---

## 📊 서비스 상태 확인

### 모든 서비스 확인 (한 번에)
```bash
# PC2 (AI 서비스)
echo "=== PC2 AI 서비스 ==="
curl -s http://203.234.62.47:9000/healthz | jq

# PC1 (백엔드)
echo "=== PC1 백엔드 ==="
curl -s http://localhost:8000/health | jq

# Oracle DB
echo "=== Oracle DB ==="
docker ps | grep oracle-db
```

---

## ✅ 체크리스트

### PC2 (203.234.62.47) ✓
- [ ] LM Studio 실행 (포트 1234)
- [ ] 모델 로드 완료
- [ ] AI 서비스 실행 (포트 9000)
- [ ] 방화벽 9000 포트 허용
- [ ] `curl http://localhost:9000/healthz` 성공

### PC1 (백엔드) ✓
- [ ] .env 파일에 `AI_SERVICE_URL=http://203.234.62.47:9000` 설정
- [ ] Oracle DB 실행 중
- [ ] API 서버 실행 (포트 8000)
- [ ] 방화벽 8000 포트 허용
- [ ] `curl http://localhost:8000/health` 성공
- [ ] `python test_data_flow.py` 모든 테스트 통과

### PC3 (프론트엔드) ✓
- [ ] .env.local에 PC1 IP 설정
- [ ] `npm install` 완료
- [ ] `npm run dev` 실행
- [ ] 브라우저에서 http://localhost:3000 접속 가능

---

## 🎯 다음 단계

통신 테스트가 성공하면:
1. DB에 실제 분실물 데이터 입력
2. 프론트엔드 UI 개발
3. 검색 기능 테스트
4. 사용자 인증 구현

---

## 💡 참고

- 상세 배포 가이드: `DEPLOYMENT_GUIDE.md`
- 데이터 흐름 분석: `DATA_FLOW_ANALYSIS.md`
- OpenAPI 계약: `contracts/openapi.yaml`
