@echo off
setlocal enabledelayedexpansion

:: 입력값 받기
set MODEL=%1
shift
set PROMPT=%*

if "%MODEL%"=="" (
    echo Usage: gemini-wrap.cmd [model] [prompt]
    exit /b 1
)

:retry
echo ============================================
echo  ▶ Gemini 호출중...
echo ============================================

:: CLI 실행
for /f "delims=" %%A in ('gemini -m %MODEL% "%PROMPT%" 2^>^&1') do (
    set OUTPUT=%%A
)

echo %OUTPUT% | find "\"code\": 500" >nul
if not errorlevel 1 (
    echo ⚠ 서버 내부 오류(500) → 3초 후 자동 재시도...
    timeout /t 3 >nul
    goto retry
)

echo.
echo.
echo ✅ 성공!
echo ----------------- 결과 ---------------------
echo %OUTPUT%
echo --------------------------------------------

endlocal
exit /b 0
