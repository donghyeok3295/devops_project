# 🎯 DB 연동 시연 가이드

지금 바로 실제 DB와 연동하여 시연할 수 있습니다!

---

## 🚀 빠른 실행 (5단계)

### 1단계: Oracle DB 실행 (PC1)
```bash
# Docker로 Oracle DB 실행
docker run -d --name oracle-db \
  -p 1521:1521 \
  -e ORACLE_PASSWORD=secret \
  gvenzl/oracle-free:23-slim

# 초기화 대기 (2-3분)
docker logs -f oracle-db
# "DATABASE IS READY TO USE!" 메시지 확인
```

### 2단계: DB 테이블 생성 및 샘플 데이터 입력 (PC1)
```bash
cd devops_project/apps/api

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# .env 파일 생성
cp .env.example .env

# DB 설정 스크립트 실행
python setup_db.py
```

**예상 출력**:
```
🔧 Oracle DB 연결 중...
✅ DB 연결 성공!

🗑️  기존 테이블 삭제 중...
📝 시퀀스 생성 중...
✅ SEQ_ITEMS_ID 생성 완료

📝 ITEMS 테이블 생성 중...
✅ ITEMS 테이블 생성 완료

📥 샘플 데이터 입력 중...
   1. 검은색 지갑 - 입력 완료
   2. 갈색 가방 - 입력 완료
   3. 아이폰 14 Pro - 입력 완료
   4. 삼성 갤럭시 버즈 - 입력 완료
   5. 회사 출입증 - 입력 완료

================================================================================
ID    제목                   브랜드            색상         카테고리      
================================================================================
1     검은색 지갑              루이비통           검은색        지갑         
2     갈색 가방               MCM             갈색         가방         
3     아이폰 14 Pro          Apple           보라색        핸드폰        
4     삼성 갤럭시 버즈          Samsung         흰색         이어폰        
5     회사 출입증              N/A             N/A         카드         
================================================================================

🎉 DB 설정 완료! 이제 API 서버를 실행하세요!
```

### 3단계: 백엔드 API 서버 실행 (PC1)
```bash
# 같은 터미널에서 계속
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**예상 출력**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### 4단계: AI 서비스 실행 (PC2)
```bash
# PC2 (203.234.62.47)에서
cd devops_project/services/ai

# LM Studio 먼저 실행 (포트 1234)

# AI 서비스 실행
uvicorn app.main:app --host 0.0.0.0 --port 9000
```

### 5단계: 테스트 실행 (PC1)
```bash
# 새 터미널 열기
cd devops_project

# 실제 DB 데이터로 검색 테스트
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "text": "검은색 지갑 잃어버렸어요",
    "brand": "루이비통",
    "color": "검은색"
  }'
```

---

## 📊 예상 결과

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
          "features": "카드 여러 장 들어있음, 학생증도 있음",
          "stored_addr": "강남역 3번 출구 안내 데스크",
          "status": "STORED"
        },
        "rule_score": 35.5
      }
    ],
    "top_5": [...],
    "reasons": [
      {
        "item_id": 1,
        "llm_score": 0.92,
        "reason_text": "브랜드, 색상, 카테고리가 모두 정확히 일치합니다"
      }
    ]
  },
  "error": null
}
```

---

## 🧪 다양한 검색 테스트

### 1. 브랜드로 검색
```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"text": "삼성 제품", "brand": "Samsung"}'
```

### 2. 색상으로 검색
```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"text": "갈색", "color": "갈색"}'
```

### 3. 카테고리로 검색
```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"text": "핸드폰", "category": "핸드폰"}'
```

### 4. 자유 텍스트 검색
```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"text": "아이폰이 있나요?"}'
```

---

## 🎨 프론트엔드에서 확인 (PC3)

### 설정
```bash
cd devops_project/apps/frontend

# .env.local 생성
echo "NEXT_PUBLIC_API_BASE=http://203.234.62.84:8000" > .env.local

# 실행
npm install
npm run dev
```

### 브라우저에서 테스트
1. http://localhost:3000 접속
2. 검색 기능 사용
3. 개발자 도구 (F12) → Network 탭 확인
4. /search 요청 확인

---

## 📝 샘플 데이터 목록

setup_db.py가 생성하는 데이터:

1. **검은색 지갑** (루이비통)
   - 카테고리: 지갑
   - 색상: 검은색
   - 위치: 강남역 3번 출구

2. **갈색 가방** (MCM)
   - 카테고리: 가방
   - 색상: 갈색
   - 위치: 신사역 근처

3. **아이폰 14 Pro** (Apple)
   - 카테고리: 핸드폰
   - 색상: 보라색
   - 위치: 역삼역 2번 출구

4. **삼성 갤럭시 버즈** (Samsung)
   - 카테고리: 이어폰
   - 색상: 흰색
   - 위치: 선릉역 1번 출구

5. **회사 출입증**
   - 카테고리: 카드
   - 위치: 강남역 지하상가

---

## 🔧 문제 해결

### DB 연결 실패
```
오류: ORA-12541: TNS:no listener
```
**해결**: Docker Oracle DB가 완전히 시작되지 않음
```bash
docker logs oracle-db
# "DATABASE IS READY TO USE!" 메시지 확인
```

### oracledb 모듈 없음
```
ModuleNotFoundError: No module named 'oracledb'
```
**해결**:
```bash
pip install oracledb
```

### AI 서비스 연결 실패
```
HTTP 502: AI 서비스 호출 실패
```
**해결**:
1. PC2 AI 서비스 실행 확인
2. LM Studio 실행 확인
3. .env에 AI_SERVICE_URL 확인

---

## ✅ 체크리스트

- [ ] Oracle DB 실행 (`docker ps`)
- [ ] DB 테이블 생성 (`python setup_db.py`)
- [ ] 샘플 데이터 5개 입력 확인
- [ ] 백엔드 API 실행 (포트 8000)
- [ ] AI 서비스 실행 (포트 9000)
- [ ] LM Studio 실행 (포트 1234)
- [ ] 검색 API 테스트 성공

---

## 🎯 다음 단계

DB 연동 성공 후:
1. 더 많은 샘플 데이터 추가
2. GPS 거리 계산 구현
3. 사진 업로드 기능
4. 프론트엔드 UI 완성
5. 사용자 인증 추가

---

**지금 바로 시작하세요!** 🚀

```bash
cd devops_project/apps/api
python setup_db.py
