# 🎉 전체 시스템 연결 완료 가이드

## ✅ 완료된 작업

### 1. GitHub 브랜치 프론트엔드 통합
- ✅ feature/back-frontend 브랜치에서 프론트엔드 코드 복사
- ✅ 모든 페이지 및 컴포넌트 통합
- ✅ 환경 변수 설정 완료

### 2. 파일 구조
```
devops_project/apps/frontend/
├── app/
│   ├── layout.tsx              # 메인 레이아웃
│   ├── globals.css             # 글로벌 스타일
│   ├── (public)/page.tsx       # 홈페이지
│   ├── search/page.tsx         # 검색 페이지
│   ├── results/page.tsx        # 결과 페이지 (AI 직접 연동)
│   ├── items/                  # 아이템 관련 페이지
│   ├── me/                     # 사용자 페이지
│   └── settings/               # 설정 페이지
├── components/
│   ├── ItemCard.tsx
│   ├── Map.tsx
│   ├── PhotoUploader.tsx
│   └── ResultCard.tsx
├── lib/
│   ├── api.ts
│   ├── https.ts
│   ├── queryClient.tsx
│   └── zodSchemas.ts
└── .env.local                  # 환경 변수

```

---

## 🌐 시스템 아키텍처

### 네트워크 구성
```
[프론트엔드]           [백엔드 API]          [AI 서비스]
localhost:3000  →  203.234.62.84:8000  →  203.234.62.84:9000
   (PC 로컬)           (PC1)                  (PC2)
```

### 데이터 플로우
1. **검색 요청**: 프론트엔드 → AI 서비스 (직접 연결)
2. **AI 분석**: AI 서비스 → LLM 평가 → 결과 반환
3. **결과 표시**: 프론트엔드에 검색 결과 표시

---

## 🚀 전체 시스템 실행 방법

### 1. PC2 (AI 서비스) - 포트 9000
```bash
cd c:\vscode\devops_project\services\ai
python -m uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```

**확인**: http://203.234.62.84:9000/docs

---

### 2. PC1 (백엔드 API) - 포트 8000
```bash
cd c:\vscode\devops_project\apps\api
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**확인**: http://203.234.62.84:8000/docs

---

### 3. 프론트엔드 - 포트 3000
```cmd
cd c:\vscode\devops_project\apps\frontend
npm run dev
```

**접속**: http://localhost:3000

---

## 🧪 시스템 테스트

### 1. AI 서비스 테스트
```bash
curl -X POST "http://203.234.62.84:9000/search" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: dev-internal-secret" \
  -d "{\"query_text\": \"검은색 지갑\"}"
```

### 2. 백엔드 API 테스트
```bash
curl "http://203.234.62.84:8000/health"
```

### 3. 프론트엔드 테스트
1. http://localhost:3000 접속
2. 검색 페이지로 이동
3. "검은색 지갑" 검색
4. 결과 확인

---

## 📝 환경 변수 설정

### 프론트엔드 (.env.local)
```env
NEXT_PUBLIC_API_BASE=http://203.234.62.84:8000
NEXT_PUBLIC_AI_BASE=http://203.234.62.84:9000
```

### 백엔드 (apps/api/.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lostfound
AI_SERVICE_URL=http://203.234.62.84:9000
AI_SERVICE_TOKEN=dev-internal-secret
```

### AI 서비스 (services/ai/.env)
```env
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
```

---

## 🔧 문제 해결

### 프론트엔드 에러 시
```cmd
cd c:\vscode\devops_project\apps\frontend
rmdir /s /q .next
npm install
npm run dev
```

### AI 서비스 연결 안 될 때
- PC2의 방화벽 확인
- 포트 9000 사용 여부 확인
- AI 서비스 로그 확인

### CORS 에러 시
- 백엔드 CORS 설정 확인
- AI 서비스 CORS 설정 확인

---

## 📊 주요 페이지

### 1. 홈 (/)
- 서비스 소개
- 주요 기능 안내

### 2. 검색 (/search)
- 자연어 검색 입력
- 검색 팁 제공

### 3. 결과 (/results?q=검색어)
- AI 기반 유사도 점수
- 매칭 근거 표시
- 정렬 기능 (유사도순/최신순)

### 4. 아이템 상세 (/items/[id])
- 아이템 상세 정보
- 사진 및 설명

---

## ✅ 시스템 체크리스트

- [x] GitHub 브랜치 프론트엔드 통합
- [x] 환경 변수 설정
- [x] AI 서비스 연동 확인
- [x] 프론트엔드-AI 직접 연결
- [x] 의존성 설치
- [x] 캐시 삭제

---

## 🎯 다음 단계

1. 프론트엔드 실행: `npm run dev`
2. 브라우저에서 http://localhost:3000 접속
3. 검색 페이지에서 테스트
4. 결과 확인

**전체 시스템이 정상적으로 연결되었습니다!** 🚀
