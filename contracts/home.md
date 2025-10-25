# 홈 (`/`) — Page Spec (v1)

## 목적
- 앱 첫 화면에서 “등록하기”/“찾기”로 진입
- (선택) 미확인 알림 개수 뱃지

## 사용자 시나리오
1) 앱 진입 → 홈 노출
2) 버튼으로 `/items/new` 또는 `/search` 이동
3) 로그인 상태면 미확인 알림 개수 표시(비로그인 0)

## API 합의(공통)
- 모든 응답: `{ "data": <T|null>, "error": <{code,message}|null> }`
- 에러 예시 코드: `UNAUTHORIZED`, `INTERNAL_ERROR`
- 시간 포맷: UTC ISO8601 `...Z`
- 201 응답 시 `Location` 헤더 (본 페이지에는 생성 없음)

## 엔드포인트(요약)
- `GET /notifications/unread_count` (비로그인 허용, 200/401)
  - 200: `{data:{unread_count:number},error:null}`
  - 401: `{data:null,error:{code:"UNAUTHORIZED",message:string}}`

## 통합 체크리스트
- [ ] 타입 생성 OK
- [ ] 목서버 200/401 스텁 확인
- [ ] `{data,error}` 래퍼 준수
