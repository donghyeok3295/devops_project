# 클레임 목록 (`/claims`) — Page Spec (v1)

## 목적
- 내가 보낸 클레임 목록/조회/생성(상세에서 생성도 가능)
- 상태: PENDING, APPROVED, REJECTED

## 사용자 시나리오
1) `/claims` 목록 확인
2) 카드 클릭 → 클레임 상세
3) 새 클레임 생성(대체 경로) 가능

## 규약/에러
- 응답 래퍼, 페이지네이션
- 에러: `UNAUTHORIZED`

## 엔드포인트(요약)
- `GET /claims` (인증 필요)
  - Query: `status?=PENDING|APPROVED|REJECTED`, `page?`, `size?`
  - 200: `{data:{claims:[ClaimSummary], pagination}, error:null}`
- `GET /claims/{id}` (인증 필요)
  - 200: `{data:Claim, error:null}`
  - 404

## 통합 체크리스트
- [ ] 상태 필터 정확성
- [ ] 본인 소유만 조회
