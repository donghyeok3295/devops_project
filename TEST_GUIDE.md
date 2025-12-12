# 🧪 DB 없이 테스트하기 (LM Studio만 사용)

Oracle DB가 없어도 LM Studio만 있으면 AI 검색 기능을 테스트할 수 있습니다.

## 📋 필요한 것

- ✅ LM Studio (실행 중)
- ✅ Python 가상환경
- ✅ 테스트 데이터 (test_data.json)

## 🎯 테스트 데이터 구조

### JSON 형식

```json
{
  "candidates": [
    {
      "id": 1,
      "item_id": 1,
      "name": "아이폰 14 Pro",
      "brand": "Apple",
      "color": "스페이스 블랙",
      "category": "스마트폰",
      "stored_place": "강남역 파출소",
      "features": "128GB, 좌측 상단 작은 스크래치",
      "material": "티타늄",
      "model": "iPhone 14 Pro",
      "size": "6.1인치",
      "accessories": "검은색 가죽 케이스",
      "serial_masked": "ABC***123",
      "lat": 37.4979,
      "lng": 127.0276,
      "photos": [
        {"url": "https://example.com/photo1.jpg"}
      ],
      "created_at": "2025-01-10T09:30:00"
    }
  ]
}
```

### 필수 필드

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `id` | number | 아이템 고유 ID | 1 |
| `item_id` | number | 아이템 ID (호환성) | 1 |
| `name` | string | 물품 이름 | "아이폰 14 Pro" |
| `brand` | string | 브랜드 | "Apple" |
| `color` | string | 색상 | "스페이스 블랙" |
| `category` | string | 카테고리 | "스마트폰" |
| `stored_place` | string | 보관 장소 | "강남역 파출소" |
| `features` | string | 특징 설명 | "128GB, 스크래치" |

### 선택 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `material` | string | 재질 |
| `model` | string | 모델명 |
| `size` | string | 크기 |
| `accessories` | string | 부속품 |
| `serial_masked` | string | 마스킹된 시리얼 번호 |
| `lat` | number | 위도 |
| `lng` | number | 경도 |
| `photos` | array | 사진 URL 목록 |
| `created_at` | string | 등록 시간 (ISO 8601) |

## 🚀 빠른 시작

### 1. LM Studio 실행

```bash
# LM Studio 앱 실행
# 모델 로드: exaone-3.5-7.8b-instruct
# Local Server 시작 (포트 1234)
```

### 2. Python 환경 준비

```bash
cd C:\vscode\devops_project

# AI 서비스 가상환경 활성화
cd services\ai
.\.venv\Scripts\activate

# 의존성 확인
pip install -r requirements.txt
```

### 3. 테스트 실행

```bash
# 프로젝트 루트로 이동
cd C:\vscode\devops_project

# 기본 검색 (기본값: "아이폰")
python test_standalone.py

# 특정 검색어로 테스트
python test_standalone.py "블랙 헤드폰"
python test_standalone.py "Apple 노트북"
python test_standalone.py "갤럭시 스마트폰"
```

## 📊 테스트 출력 예시

```
============================================================
🔍 AI 검색 테스트
============================================================
검색어: 블랙 헤드폰

📂 테스트 데이터 로드 중...
✅ 10개 아이템 로드 완료

🤖 AI 매칭 엔진 실행 중...
------------------------------------------------------------
[DEBUG] 규칙 점수 계산 완료: 10개 아이템
[DEBUG] Sony WH-1000XM5 헤드폰: rule=20.000, llm=0.850
[LLM PARSED] {'llm_score': 0.85, 'reason': '색상과 카테고리 일치'}
...

============================================================
🎯 검색 결과 (Top 5)
============================================================

[1위] Sony WH-1000XM5 헤드폰
   📍 보관 장소: 인천공항 1터미널 안내데스크
   🏷️  브랜드: Sony | 색상: 블랙
   📊 점수:
       - 규칙 점수: 20.000
       - LLM 점수: 0.850
   💬 매칭 근거: 색상과 카테고리 일치

[2위] MacBook Air M2
   📍 보관 장소: 코엑스 분실물보관소
   🏷️  브랜드: Apple | 색상: 미드나잇
   📊 점수:
       - 규칙 점수: 0.000
       - LLM 점수: 0.420
   💬 매칭 근거: 브랜드 일치, 색상 유사

...

============================================================
✅ 테스트 완료
============================================================
```

## 🔧 고급 사용법

### 커스텀 테스트 데이터 만들기

```bash
# test_data.json 복사
copy test_data.json my_test_data.json

# my_test_data.json 편집
# 원하는 아이템 추가/수정

# 스크립트 수정하여 사용
# test_standalone.py에서 파일명 변경
```

### 다양한 검색 시나리오 테스트

```bash
# 브랜드 검색
python test_standalone.py "Apple"
python test_standalone.py "Samsung"

# 색상 검색
python test_standalone.py "블랙"
python test_standalone.py "화이트"

# 카테고리 검색
python test_standalone.py "스마트폰"
python test_standalone.py "이어폰"

# 복합 검색
python test_standalone.py "Apple 블랙 이어폰"
python test_standalone.py "삼성 회색 태블릿"
```

## 🐛 문제 해결

### LLM 연결 실패

**증상**: `[LLM ERROR] Timeout`

**해결**:
1. LM Studio가 실행 중인지 확인
2. 모델이 로드되었는지 확인
3. 포트 1234 확인

```bash
# LM Studio 상태 확인
curl http://127.0.0.1:1234/v1/models
```

### Python 모듈 오류

**증상**: `ModuleNotFoundError`

**해결**:
```bash
cd services\ai
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### JSON 파일 없음

**증상**: `FileNotFoundError: test_data.json`

**해결**:
- 프로젝트 루트에서 실행했는지 확인
- `test_data.json` 파일이 존재하는지 확인

## 📝 테스트 데이터 커스터마이징

### 아이템 추가

```json
{
  "id": 11,
  "item_id": 11,
  "name": "여러분의 물품",
  "brand": "브랜드",
  "color": "색상",
  "category": "카테고리",
  "stored_place": "보관 장소",
  "features": "특징 설명",
  "material": "재질",
  "model": "모델명",
  "size": "크기",
  "accessories": "부속품",
  "serial_masked": null,
  "lat": 37.5665,
  "lng": 126.9780,
  "photos": [
    {"url": "https://via.placeholder.com/300"}
  ],
  "created_at": "2025-01-10T10:00:00"
}
```

### 특정 시나리오 테스트

1. **브랜드 매칭 테스트**: 같은 브랜드 여러 제품 추가
2. **색상 매칭 테스트**: 같은 색상 다른 카테고리
3. **복합 매칭 테스트**: 여러 속성 조합

## 🎓 학습 포인트

이 테스트를 통해 확인할 수 있는 것:

1. ✅ **LLM 점수 계산**: 각 아이템이 검색어와 얼마나 일치하는지
2. ✅ **규칙 기반 점수**: 키워드, 색상, 브랜드 매칭
3. ✅ **최종 랭킹**: 규칙 점수 + LLM 점수 조합
4. ✅ **매칭 근거**: LLM이 판단한 이유

## 🔄 전체 시스템과 비교

### 독립 테스트 (현재)

```
테스트 스크립트 → JSON 파일 → AI 매칭 엔진 → LM Studio
```

### 전체 시스템

```
프론트엔드 → AI 서비스 → 백엔드 API → Oracle DB
                ↓
           LM Studio
```

## 💡 다음 단계

독립 테스트가 성공하면:

1. ✅ Oracle DB 연결
2. ✅ 백엔드 API 실행
3. ✅ 전체 시스템 테스트 ([START_SERVICES.md](START_SERVICES.md) 참조)

## 📚 관련 문서

- [README_SETUP.md](README_SETUP.md) - 전체 시스템 설정
- [START_SERVICES.md](START_SERVICES.md) - 서비스 시작 가이드
- [test_data.json](test_data.json) - 테스트 데이터
- [test_standalone.py](test_standalone.py) - 테스트 스크립트
