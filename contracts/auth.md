# 인증 (`/auth`) — Page Spec (v1)

## 목적
- 이메일+휴대폰 회원가입
- 로그인/로그아웃 (JWT)
- 중복 가입 방지, 오류 메시지 노출

## 사용자 시나리오
1) 회원가입: email/phone/password 입력 → 201 + `Location:/me`
2) 로그인: identifier(email|phone)/password → 200 + 토큰
3) 중복 가입 시도 → 409
4) 로그아웃 → 204 (본문 없음, 래퍼 N/A)

## 공통 규약
- 응답 래퍼: `{data,error}` (단, 204는 본문 없음)
- 시간: UTC `...Z`
- 에러코드: `DUPLICATE_EMAIL`, `DUPLICATE_PHONE`, `INVALID_CREDENTIALS`, `UNAUTHORIZED`

## 엔드포인트(요약)
- `POST /auth/register` (익명)
  - Req: `{email, phone, password}`
  - 201: `{data:{user_id,email,phone,role,created_at},error:null}`, `Location:/me`
  - 400/409 에러
- `POST /auth/login` (익명)
  - Req: `{identifier, password}`
  - 200: `{data:{access_token,token_type,expires_at},error:null}`
  - 401 에러
- `POST /auth/logout` (인증 필요)
  - 204 (본문 없음)
  - 401 에러

## 통합 체크리스트
- [ ] 201의 Location 헤더 포함
- [ ] 204 본문 미반환
- [ ] JWT Bearer 스키마 연동(보안 스키마)
