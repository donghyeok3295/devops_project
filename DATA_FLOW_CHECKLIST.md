# ✅ 데이터 흐름 점검 체크리스트

프론트엔드까지 데이터가 제대로 전달되는지 단계별로 점검합니다.

---

## 📊 전체 데이터 흐름

```
1. 프론트엔드 (PC3)
   ↓ POST http://203.234.62.84:8000/search
   
2. 백엔드 (PC1)
   ↓ POST http://203.234.62.47:9000/rerank
   
3. AI 서비스 (PC2)
   ↓ LLM 호출 (localhost:1234)
   ↓ 재랭킹 결과 반환
   
4. 백엔드 (PC1)
   ↓ OpenAPI SearchResponse로 변환
   ↓ {top_n[], top_5[], reasons[]} 반환
   
5. 프론트엔드 (PC3)
   ↓ 화면에 표시
```

---

## 🔍 단계별 점검

### ✅ 1단계: 네트워크 연결

#### PC1 → PC2
```bash
# PC1에서
curl http://203.234.62.47:9000/healthz
# 예상: {"status":"ok","service":"ai-matcher"}
```

#### PC3 → PC1
```bash
# PC3에서
curl http://203.234.62.84:8000/health
# 예상: {"status":"ok"}
```

### ✅ 2단계: AI 서비스 테스트

```bash
curl -X POST http://203.234.62.47:9000/rerank \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: dev-internal-secret" \
  -d '{
    "query_text": "검은색 지갑",
    "candidates": [{
      "item_id": 1,
      "name": "검은색 지갑",
      "brand": "루이비통",
      "color": "검은색"
    }]
  }'
```

**점검**:
- [ ] HTTP 200 응답
- [ ] 배열 형태 응답
- [ ] item_id, rule_score, llm_score, reason_text 포함

### ✅ 3단계: 백엔드 API 테스트

```bash
curl -X POST http://203.234.62.84:8000/search \
  -H "Content-Type: application/json" \
  -d '{"text": "검은색 지갑", "radius_km": 20.0}'
```

**점검**:
- [ ] HTTP 200 응답
- [ ] data.top_n 배열 존재
- [ ] data.top_5 배열 존재  
- [ ] data.reasons 배열 존재
- [ ] error가 null

### ✅ 4단계: 프론트엔드 테스트

#### 환경 설정
```bash
# PC3: .env.local 확인
NEXT_PUBLIC_API_BASE=http://203.234.62.84:8000
```

#### 브라우저 개발자 도구
**Network 탭**:
- [ ] /search 요청 200 OK
- [ ] CORS 에러 없음
- [ ] Response 데이터 정상

**Console 탭**:
- [ ] CORS 에러 없음
- [ ] Network 에러 없음

---

## 🚨 일반적인 문제 해결

### CORS 에러
```
Access to fetch at 'http://203.234.62.84:8000/search' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**해결**: 백엔드 CORS 설정 확인
- ✅ `apps/api/app/main.py`에 CORSMiddleware 추가됨
- allow_origins=["*"] 설정됨

### 네트워크 연결 실패
```
curl: (7) Failed to connect to 203.234.62.84 port 8000
```

**해결 체크리스트**:
1. 서비스 실행 중인지 확인
2. 방화벽 확인
3. 같은 네트워크인지 확인
4. 다른 네트워크면 → `NETWORK_SCENARIOS.md` 참고

### AI 서비스 타임아웃
```
HTTP 504: AI 서비스 응답 시간 초과
```

**해결**:
1. PC2 LM Studio 실행 확인
2. 모델 로드 확인
3. AI 서비스 실행 확인

---

## 📋 최종 체크리스트

### PC2 (AI+LLM) - 203.234.62.47
- [ ] LM Studio 실행 (1234 포트)
- [ ] 모델 로드 완료
- [ ] AI 서비스 실행 (9000 포트)
- [ ] `curl localhost:9000/healthz` 성공

### PC1 (백엔드) - 203.234.62.84
- [ ] .env에 AI_SERVICE_URL=http://203.234.62.47:9000
- [ ] API 서버 실행 (8000 포트)
- [ ] `curl localhost:8000/health` 성공
- [ ] `curl 203.234.62.47:9000/healthz` 성공

### PC3 (프론트엔드)
- [ ] .env.local에 NEXT_PUBLIC_API_BASE 설정
- [ ] npm install 완료
- [ ] npm run dev 실행
- [ ] 브라우저에서 localhost:3000 접속
- [ ] 백엔드 API 호출 성공

---

## 🧪 자동 테스트

```bash
# PC1에서 실행
cd devops_project
pip install requests
python test_data_flow.py
```

**예상 결과**:
```
✅ 성공: AI 서비스 응답 형태 정상
✅ 성공: OpenAPI SearchResponse 형태 정상
✅ 성공: 전체 플로우 정상 동작
```

---

## 📝 데이터 샘플

### 프론트엔드가 받는 최종 데이터
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
          "category": "지갑",
          "stored_addr": "강남역 3번 출구",
          "status": "STORED"
        },
        "rule_score": 15.5
      }
    ],
    "top_5": [...],
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

### 프론트엔드 표시 예시
```
검색 결과: 2개 발견

1. 검은색 지갑 (루이비통)
   위치: 강남역 3번 출구
   매칭 점수: 85%
   AI 평가: 브랜드와 색상이 정확히 일치합니다
   
2. 갈색 가방 (MCM)
   위치: 신사역 근처
   매칭 점수: 62%
   AI 평가: 색상은 다르나 같은 지역에서 발견됨
```

---

## 🎯 다음 단계

모든 체크리스트 통과 후:
1. DB 연동 (더미 → 실제 데이터)
2. 사진 업로드 기능
3. 사용자 인증
4. 프론트엔드 UI 완성
