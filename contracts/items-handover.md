# 인계 처리 (`/items/{id}/handover`) — Page Spec (v1)

## 목적
- 습득자의 상태 전환: `STORED → CLAIMED → HANDED_OVER`
- 잘못된 전환은 오류

## 사용자 시나리오
1) 상태 변경 버튼 클릭
2) 서버에서 상태 검증 및 전환 → 200
3) 최종 인계 완료 시 `HANDED_OVER`

## 규약/에러
- 응답 래퍼
- 에러: `INVALID_STATE_TRANSITION`, `UNAUTHORIZED`, `FORBIDDEN_ROLE`, `NOT_FOUND`

## 엔드포인트(요약)
- `PATCH /items/{id}/handover` (인증: FINDER)
  - Req: `{ action: 'CLAIM' | 'HANDOVER' }`  
    - `CLAIM`: `STORED → CLAIMED`
    - `HANDOVER`: `CLAIMED → HANDED_OVER`
  - 200: `{data:Item,error:null}`
  - 409: `{data:null,error:{code:"INVALID_STATE_TRANSITION",...}}`
  - 401/403/404

## 통합 체크리스트
- [ ] 전환 규칙 서버 검증
- [ ] 409 사용(충돌)
