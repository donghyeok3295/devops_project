@echo off
chcp 65001 >nul
echo ========================================
echo 분실물 검색 시스템 시작
echo ========================================
echo.
echo 🖥️  모든 서비스를 시작합니다...
echo.

REM 현재 디렉토리 저장
set ROOT_DIR=%~dp0
cd /d %ROOT_DIR%

echo 📋 체크리스트:
echo [ ] Oracle DB 실행 중
echo [ ] LM Studio 실행 중 (포트 1234)
echo.
echo 계속하려면 아무 키나 누르세요...
pause >nul

echo.
echo ========================================
echo 1. 백엔드 API 시작 (포트 8000)
echo ========================================
start "Backend API" cmd /k "cd /d %ROOT_DIR%apps\api && .\venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 3 >nul

echo.
echo ========================================
echo 2. AI 서비스 시작 (포트 9000)
echo ========================================
start "AI Service" cmd /k "cd /d %ROOT_DIR%services\ai && .\.venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 9000 --reload"
timeout /t 3 >nul

echo.
echo ========================================
echo 3. 프론트엔드 시작 (포트 3000)
echo ========================================
start "Frontend" cmd /k "cd /d %ROOT_DIR%apps\frontend && npm run dev"
timeout /t 3 >nul

echo.
echo ========================================
echo ✅ 모든 서비스가 시작되었습니다!
echo ========================================
echo.
echo 서비스 접속 주소:
echo   - 프론트엔드: http://localhost:3000
echo   - 백엔드 API: http://localhost:8000/docs
echo   - AI 서비스:  http://localhost:9000/docs
echo.
echo 검색 페이지: http://localhost:3000/search
echo.
echo 서비스를 종료하려면 각 터미널 창을 닫으세요.
echo.
pause
