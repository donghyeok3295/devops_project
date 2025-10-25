# 검색 입력 (`/search`) — Page Spec (v1)

## 목적
- 분실자가 자연어 설명 입력
- 규칙 기반(위치/시간/카테/색/브랜드 등) 후보 검색

## 사용자 시나리오
1) 텍스트 입력, 검색 범위(시간/거리 등) 옵션 선택
2) 검색 실행 → 후보 Top-N(예: 50) 반환 → 결과 페이지로 이동(`/results`)

## 규약/에러
- 응답 래퍼
- 에러: `VALIDATION_RANGE`, `UNAUTHORIZED`(선택적 보호 — MVP에선 익명 허용 가능)

## 엔드포인트(요약)
- `POST /search` (익명 허용 권장)
  - Req: `{ query:string, filters?:{category?, brand?, color?, time_from?, time_to?, center?:{lat,lng}, radius_km?}, limit?:50 }`
  - 200: `{data:{candidates:[Candidate] }, error:null}`
    - `Candidate`(요약): `{ item_id, score_rule:number, distance_km?:number, created_at, attributes:{...}, photos:[{url}] }`

## 통합 체크리스트
- [ ] limit 상한 검증
- [ ] 시간/거리 필터의 단위 명확화(UTC, km)
