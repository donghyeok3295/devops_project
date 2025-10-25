# 내 목록 (`/me/items`) — Page Spec (v1)

## 목적
- 내가 등록한 분실물 목록 조회
- 상태(STORED, CLAIMED, HANDED_OVER) 필터, 최신순 정렬

## 사용자 시나리오
1) 페이지 진입 시 내 아이템 목록 호출
2) 상태 필터 전환
3) 아이템 카드 클릭 → 상세(`/items/{id}`)

## 규약/에러
- 응답 래퍼, 페이지네이션 표준 적용 (page/size/total)
- 에러코드: `UNAUTHORIZED`

## 엔드포인트(요약)
- `GET /me/items` (인증 필요)
  - Query: `status?=STORED|CLAIMED|HANDED_OVER`, `page?`, `size?`
  - 200: `{data:{items:[ItemSummary], pagination:Pagination}, error:null}`
    - `ItemSummary` 최소 필드: `{id, status, created_at, thumb_url, attributes.category, attributes.brand?, color?}`
  - 401 에러

## 통합 체크리스트
- [ ] 페이지네이션 스키마 준수
- [ ] 상태 필터 정상 동작
