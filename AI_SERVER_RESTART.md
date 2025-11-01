# 🚨 AI 서버 완전 재시작 가이드

## 문제
AI 서버가 새로운 코드를 로드하지 않아 422 오류 발생

## 해결 방법

### 1단계: AI 서버 완전 종료
PC2에서:
```bash
# Ctrl+C를 눌러 uvicorn 종료
# 또는 터미널을 닫기
```

### 2단계: 프로세스 확인
```bash
# Windows에서 포트 9000 사용 중인 프로세스 찾기
netstat -ano | findstr :9000

# 프로세스 ID(PID) 확인 후 종료
taskkill /PID <PID번호> /F
```

### 3단계: 새로 시작
```bash
cd c:\vscode\devops_project\services\ai
python -m uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```

### 4단계: 테스트
```bash
curl -X POST "http://203.234.62.84:9000/search" ^
  -H "Content-Type: application/json" ^
  -H "X-Admin-Token: dev-internal-secret" ^
  -d "{\"query_text\": \"test\"}"
```

**성공 시**: `{"results":[...]}`
**실패 시**: `{"detail":[...]}`

---

## 주의사항

⚠️ **uvicorn --reload는 파일 변경을 자동 감지하지만, 때로는 수동 재시작이 필요합니다!**

특히:
- 새 파일 추가 시 (`search.py` 같은)
- 라우터 등록 변경 시
- 환경 변수 변경 시 (`.env` 파일)

이런 경우 **완전히 종료 후 다시 시작**해야 합니다!
