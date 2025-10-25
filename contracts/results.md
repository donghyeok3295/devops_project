# 검색 결과 (`/results`) — Page Spec (v1)

## 목적
- 규칙 기반 후보들을 AI 재랭크하여 Top-5 정렬
- 카드에 사진/속성/거리/AI 근거(reason_text) 표시
- AI 실패 시 규칙 점수 순으로 대체 정렬

## 사용자 시나리오
1) `/search` 결과 candidates 수령
2) 재랭크 요청 → Top-5 및 reason_text 수령
3) 실패 시 규칙 정렬로 표시

## 규약/에러
- 응답 래퍼
- 에러: `AI_SERVICE_DOWN`, `UNAUTHORIZED`(선택), `VALIDATION_RANGE`

## 엔드포인트(요약)
- `POST /results/rerank` (익명 허용 권장)
  - Req: `{ candidates:[{item_id, score_rule, ...}], top_k:5, query:string }`
  - 200: `{ data:{ results:[{ item_id, score_final:number, reason_text:string }] }, error:null }`
  - Fallback: 서버 내부에서 규칙 정렬로 대체해 동일 스키마로 반환

## 통합 체크리스트
- [ ] top_k 상한 5~10 내 설정
- [ ] reason_text 길이 제한(예: 300자)
