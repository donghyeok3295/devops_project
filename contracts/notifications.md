# 알림 (`/notifications`) — Page Spec (v1)

## 목적
- 클레임 상태 변동 등 알림 확인
- (MVP) 클레임 상태 변경이 곧 알림

## 사용자 시나리오
1) 알림 목록 확인
2) 읽음 처리(선택)

## 규약/에러
- 응답 래퍼, 페이지네이션
- 에러: `UNAUTHORIZED`

## 엔드포인트(요약)
- `GET /notifications` (인증 필요)
  - 200: `{data:{notifications:[Notification], pagination}, error:null}`
- `POST /notifications/{id}/read` (인증 필요)
  - 204: 본문 없음
  - 404/401

- (홈 뱃지용) `GET /notifications/unread_count` (비로그인 허용)
  - 200/401 (홈.md 참고)

## 통합 체크리스트
- [ ] 읽음 처리 204 본문 없음
- [ ] unread_count 동기화
