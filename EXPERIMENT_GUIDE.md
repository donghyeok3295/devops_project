# 🧪 최종 실험 가이드

## 📦 브랜치 정보
- **브랜치명**: `feature/ai-search-final-fix`
- **커밋**: `a0ff85e`
- **GitHub**: https://github.com/donghyeok3295/devops_project/tree/feature/ai-search-final-fix

---

## 👥 각 PC 담당자별 작업

### PC1 (백엔드 담당자)

#### 1. 코드 받기
```bash
cd <프로젝트경로>
git fetch origin
git checkout feature/ai-search-final-fix
git pull origin feature/ai-search-final-fix
```

#### 2. 백엔드 실행
```bash
cd apps/api
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. 확인
```
http://203.234.62.84:8000/docs
```

---

### PC2 (AI 서비스 담당자)

#### 1. 코드 받기
```bash
cd <프로젝트경로>
git fetch origin
git checkout feature/ai-search-final-fix
git pull origin feature/ai-search-final-fix
```

#### 2. .env 파일 설정
`services/ai/.env` 파일에 다음 내용 추가:
```env
ADMIN_TOKEN=dev-internal-secret
AI_INTERNAL_TOKEN=dev-internal-secret
BACKEND_API_URL=http://203.234.62.84:8000

LLM_BASE_URL=http://127.0.0.1:1234/v1
LLM_MODEL=exaone-3.5-7.8b-instruct
LLM_API_KEY=
LLM_TIMEOUT_SECONDS=30
LLM_TEMPERATURE=0.2

SIGMA_KM=1.5
HALF_LIFE_HOURS=24
```

#### 3. AI 서버 실행
```bash
cd services/ai
python -m uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```

#### 4. 확인
```
http://203.234.62.84:9000/docs
```

---

### 현재 PC (프론트엔드 담당자 - 당신)

#### 1. 이미 브랜치에 있음
```bash
cd c:\vscode\devops_project
# 이미 feature/ai-search-final-fix 브랜치임
```

#### 2. 프론트엔드 실행
```cmd
cd apps\frontend
npm run dev
```

#### 3. 접속
```
http://localhost:3000
```

---

## 🧪 실험 순서

### 실험 1: AI 서버 직접 테스트
```bash
curl -X POST "http://203.234.62.84:9000/search" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: dev-internal-secret" \
  -d '{"query_text": "test"}'
```

**예상 결과**:
```json
{"results":[...]}
```
또는 빈 배열 `{"results":[]}`

---

### 실험 2: 백엔드 확인
```bash
curl http://203.234.62.84:8000/items
```

**예상 결과**: 
- 아이템 목록 반환 (인증 필요 없음)
- 또는 `{"detail":"Missing token"}` (이 경우 백엔드 수정 필요)

---

### 실험 3: 프론트엔드 검색
1. http://localhost:3000 접속
2. 검색 페이지로 이동
3. "검은색 지갑" 입력 후 검색
4. 결과 확인

**예상 결과**:
- ✅ 검색 결과 표시
- ✅ 유사도 점수 표시
- ✅ 매칭 근거(한국어) 표시

---

### 실험 4: 분실물 등록
1. http://localhost:3000/items/new 접속
2. 로그인
3. 사진 2장 업로드
4. 카테고리 선택 (버튼 클릭 시 파란색)
5. 색상 선택 (체크마크 표시)
6. 등록 완료

**예상 결과**:
- ✅ 카테고리/색상 선택 시각적 피드백
- ✅ 등록 성공

---

## ⚠️ 만약 실험 1이 실패하면

백엔드의 `/items` 엔드포인트가 인증을 요구할 수 있습니다.

**백엔드 담당자가 수정:**

`apps/api/app/routers/items.py`에서:
```python
@router.get("")
async def list_items(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)  # 이 부분 제거 또는 주석
):
    items = db.query(Item).all()
    return items
```

백엔드 재시작 후 다시 테스트

---

## 📊 성공 기준

- [ ] AI 서버 `/search` 엔드포인트 정상 응답
- [ ] 백엔드 `/items` 정상 응답
- [ ] 프론트엔드 검색 기능 작동
- [ ] 분실물 등록 UI 개선 확인
- [ ] 카테고리/색상 선택 시각적 피드백
- [ ] 프로필 페이지 가입일 정상 표시

---

## 🔄 실험 후 조치

### 성공 시:
```bash
# 백엔드 담당자
git checkout main
git merge feature/ai-search-final-fix
git push origin main

# AI 담당자
git checkout main
git merge feature/ai-search-final-fix
git push origin main

# 프론트엔드 담당자
git checkout main
git merge feature/ai-search-final-fix
git push origin main
```

### 실패 시:
문제 보고 및 추가 수정

---

## 📞 문의사항

실험 중 문제 발생 시:
1. 어느 단계에서 실패했는지
2. 오류 메시지 전체
3. 각 서버의 로그

위 정보를 공유해주세요.
