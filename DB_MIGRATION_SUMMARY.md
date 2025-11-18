# 로컬 개발 환경 외부 DB 연결 전환 작업 요약

## 1. 초기 목표
로컬 `docker-compose` 환경에서 구동되던 Oracle DB를 별도의 외부 PC(IP: `203.234.62.84`)에서 실행되는 DB에 연결하도록 개발 환경을 수정합니다. DB 구동 전, 프론트엔드, 백엔드, AI 서비스가 독립적으로 실행되는지 먼저 확인하는 것을 목표로 합니다.

## 2. 주요 변경 사항
- **DB 연결 설정 변경:** `infra/docker-compose.yml` 파일에서 `api` 및 `ai` 서비스의 `ORACLE_DSN` 환경 변수를 `oracle:1521`에서 외부 IP 주소 `203.234.62.84:1521`로 수정했습니다.
- **로컬 DB 컨테이너 제거:** `infra/docker-compose.yml`에서 더 이상 사용하지 않는 `oracle` 서비스와 `oracle-data` 볼륨을 주석 처리했습니다.
- **Dockerfile 수정:** `api`와 `ai` 서비스의 `Dockerfile`을 수정하여 `cx_Oracle` 패키지 빌드에 필요한 시스템 라이브러리 및 진단 도구를 설치하도록 했습니다.
- **컨테이너 실행 명령어 수정:**
    - `api` 서비스의 `Dockerfile`에서 `CMD` 형식을 수정하여 `uvicorn` 서버가 정상 실행되도록 했습니다.
    - `frontend` 서비스의 `docker-compose.yml` `command`에 `npm install`을 추가하여 의존성 설치 후 개발 서버가 실행되도록 했습니다.
- **포트 변경:** 로컬 PC의 3000번 포트 충돌 문제를 해결하기 위해 `frontend` 서비스의 외부 포트를 `3001`번으로 변경했습니다.
- **API 오류 처리 개선:** DB 연결 실패 시 500 Internal Server Error 대신 503 Service Unavailable을 반환하도록 `apps/api/app/db.py`를 수정했습니다.

## 3. 해결된 문제 및 과정
1.  **Docker 데몬 연결 실패:** `docker-compose` 실행 시 Docker Desktop이 꺼져 있어 발생. Docker Desktop을 실행하여 해결했습니다.
2.  **프론트엔드 빌드 실패:** `frontend` 서비스 빌드 시 `Dockerfile`을 찾지 못하는 오류 발생. `docker-compose.yml`에서 `build` 대신 `image: node:20-alpine`을 사용하도록 수정하여 해결했습니다.
3.  **백엔드/AI 빌드 실패:** `cx_Oracle` 설치 중 `gcc` 컴파일러가 없어 빌드 오류 발생. 각 서비스의 `Dockerfile`에 `apt-get install -y build-essential libaio-dev` 명령을 추가하여 해결했습니다.
4.  **포트 충돌:** `frontend` 서비스 실행 시 로컬 3000번 포트가 이미 사용 중이어서 오류 발생. `docker-compose.yml`에서 포트 매핑을 `3001:3000`으로 변경하여 해결했습니다.
5.  **컨테이너 즉시 종료 (`Exited 127`):**
    - **API 서비스:** `CMD` 명령어 형식이 잘못되어 `uvicorn`을 찾지 못하는 문제. `Dockerfile`의 `CMD`를 쉘 형식으로 수정하여 해결했습니다.
    - **Frontend 서비스:** `npm install`이 실행되지 않아 `next` 명령어를 찾지 못하는 문제. `docker-compose.yml`의 `command`에 `npm install`을 추가하여 해결했습니다.
6.  **프론트엔드 접속은 되나 API 통신 실패 (`Failed to fetch`):** 컨테이너가 `localhost`를 자기 자신으로 인식하여 `api` 서비스에 도달하지 못하는 문제. `infra/docker-compose.yml`에서 `NEXT_PUBLIC_API_BASE`를 `http://api:8000`으로 수정하여 해결했습니다.
7.  **API 서비스 즉시 종료 (500 에러 원인):** `api` 컨테이너가 `AttributeError`로 인해 즉시 종료되는 문제 발생. 컨테이너를 강제 재빌드하여 해결했습니다.
8.  **외부 DB 연결 실패 진단:**
    - `api` 컨테이너 내부에서 `nc` 테스트 결과: `Connection refused`.
    - `api` 컨테이너 내부에서 `oracledb` 테스트 결과: `timed out` (DPY-6005).
    - **결론:** 외부 DB 서버의 리스너 서비스가 실행되지 않았거나, 네트워크 경로상의 방화벽이 패킷을 차단하고 있을 가능성이 높습니다.

## 4. 현재 상태
> 동일한 오류가 계속 발생한다. 로그인 및 회원가입 창에 나오는 오류메세지는 {"detail":"Database service is currently unavailable."}가 됨.

✦ 로그인 및 회원가입 창에 {"detail":"Database service is currently unavailable."} 오류가 발생하는 것은, API 서버가 데이터베이스에 연결할 수 없다는 의미입니다.

  apps/api/app/db.py 파일을 확인하여 데이터베이스 연결 설정을 확인하고, 데이터베이스 연결에 실패했을 때 503 Service Unavailable 오류를 반환하도록 설정되어 있는지 확인해야 합니다.

╭───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮ 
│ ✓  ReadFile apps\api\app\db.py                                                                                                                                                                        │ 
│                                                                                                                                                                                                       │ 
╰───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯ 
✦ apps/api/app/db.py 파일을 확인한 결과, 데이터베이스 연결 설정을 확인하고, 데이터베이스 연결에 실패했을 때 503 Service Unavailable 오류를 반환하도록 설정되어 있습니다.

  데이터베이스 연결 설정은 다음과 같습니다.

   * ORACLE_DSN: 데이터베이스 연결 문자열
   * ORACLE_USER: 데이터베이스 사용자 이름
   * ORACLE_PASSWORD: 데이터베이스 비밀번호

  infra/docker-compose.yml 파일을 확인하여 데이터베이스 연결 설정이 올바르게 설정되어 있는지 확인해야 합니다.