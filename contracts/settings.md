# 설정 (`/settings`) — Page Spec (v1)

## 목적
- 내 계정 정보(이메일/휴대폰/역할) 조회
- 로그아웃(토큰 삭제)

## 사용자 시나리오
1) 설정 진입 → 계정 정보 조회(`/me`)
2) 로그아웃 실행 → 토큰 제거

## 규약/에러
- 응답 래퍼
- 에러: `UNAUTHORIZED`

## 엔드포인트(요약)
- `GET /me` (인증 필요)
  - 200: `{data:{user_id,email,phone,role,created_at}, error:null}`
- `POST /auth/logout` (인증 필요)
  - 204 (본문 없음)

## 통합 체크리스트
- [ ] `GET /me` 스키마 통일(회원가입 결과와 호환)
- [ ] 로그아웃 204 본문 없음
