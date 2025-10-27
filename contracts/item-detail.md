# 상세 (`/items/{id}`) — Page Spec (v1)

## 목적
- 특정 분실물 상세 정보(사진·속성·지도)
- 분실자의 클레임 작성

## 사용자 시나리오
1) 상세 조회
2) 분실자: 클레임 메모 작성/제출 → 생성됨

## 규약/에러
- 응답 래퍼
- 에러: `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN_ROLE`

## 엔드포인트(요약)
- `GET /items/{id}` (익명 허용)
  - 200: `{data:Item, error:null}` (사진/속성/위치 포함)
  - 404
- `POST /items/{id}/claims` (인증: SEEKER)
  - Req: `{ message:string }`
  - 201: `{data:Claim, error:null}`, `Location:/claims/{id}`
  - 401/403/404

## 통합 체크리스트
- [ ] `POST /items/{id}/claims` 201 + Location
- [ ] 존재하지 않는 id → 404
