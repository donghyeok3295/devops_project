# 🎓 학교 컴퓨터 외부 접속 설정 (간단 버전)

## 📋 상황

- ✅ 공인 IP 직접 할당 (내부 IP = 외부 IP)
- ✅ 포트 포워딩 **불필요**
- ⚠️ 학교 방화벽만 확인 필요

---

## 🚀 빠른 설정 (2단계만!)

### 1단계: Windows 방화벽 설정

**PowerShell 관리자 권한으로 실행**:

```powershell
# 포트 열기 (한 번만 실행)
New-NetFirewallRule -DisplayName "Smart LostFound" `
    -Direction Inbound `
    -LocalPort 3000,8000,9000 `
    -Protocol TCP `
    -Action Allow

# 확인
Get-NetFirewallRule -DisplayName "Smart LostFound"
```

### 2단계: 서버 실행

각각 **별도 터미널**에서:

```powershell
# 터미널 1: 백엔드
cd apps\api
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 터미널 2: AI 서버
cd services\ai
python -m uvicorn app.main:app --host 0.0.0.0 --port 9000

# 터미널 3: 프론트엔드
cd apps\frontend
npm run dev -- --hostname 0.0.0.0
```

**끝!** 🎉

---

## 🧪 테스트

### 1. 내 IP 확인

```powershell
# PowerShell에서
(Invoke-RestMethod -Uri "https://api.ipify.org").ip
```

예: `203.234.62.84`

### 2. 접속 테스트

**같은 컴퓨터에서**:

```
http://localhost:8000/health      ✅
http://localhost:9000/healthz     ✅
http://localhost:3000             ✅
```

**외부 (스마트폰, 다른 PC)에서**:

```
http://203.234.62.84:8000/health      ✅
http://203.234.62.84:9000/healthz     ✅
http://203.234.62.84:3000             ✅
```

---

## ⚠️ 학교 방화벽 확인

### 학교에서 포트를 막고 있을 수 있음:

**확인 방법**:

1. 스마트폰 모바일 데이터로 접속 시도
2. 안 되면 → 학교 방화벽이 막고 있음

**해결 방법**:

#### 옵션 1: 다른 포트 사용

```powershell
# 일반적으로 443, 8443 포트는 열려있음
uvicorn app.main:app --host 0.0.0.0 --port 443    # HTTPS 포트
uvicorn app.main:app --host 0.0.0.0 --port 8443   # Alt HTTPS
```

#### 옵션 2: VPN 사용

- 학교 VPN을 통해 접속
- 또는 개인 VPN 서비스

#### 옵션 3: 터널링 서비스

```powershell
# ngrok 사용 (학교 방화벽 우회)
choco install ngrok
ngrok http 8000
# → https://xxxx.ngrok-free.app
```

---

## 🔒 보안 주의사항

### 1. 학교 정책 확인

- 서버 운영이 학교 규정에 위배되지 않는지 확인
- IT 부서에 문의 권장

### 2. 개발용으로만 사용

```python
# 현재 설정: 개발용
allow_origins=["*"]  # 모든 접속 허용

# 프로덕션 시: 특정 도메인만
allow_origins=[
    "https://yourdomain.com",
    "http://203.234.62.84:3000"
]
```

### 3. 서버 종료

```powershell
# 사용하지 않을 때는 반드시 종료
# Ctrl + C로 각 서버 종료
```

### 4. 방화벽 규칙 삭제 (필요시)

```powershell
# 관리자 PowerShell
Remove-NetFirewallRule -DisplayName "Smart LostFound"
```

---

## 📱 모바일 접속

### 1. WiFi 연결 시

- 학교 WiFi와 컴퓨터가 같은 네트워크면 바로 접속 가능
- `http://203.234.62.84:3000`

### 2. 모바일 데이터 시

- 학교 방화벽이 막고 있을 수 있음
- 안 되면 ngrok 사용

---

## 🎯 완전 자동화 스크립트

**`quick-start.ps1`** (프로젝트 루트에 저장):

```powershell
# 관리자 권한 확인
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ 관리자 권한으로 실행하세요!" -ForegroundColor Red
    exit
}

# 방화벽 설정
Write-Host "🔥 방화벽 설정 중..." -ForegroundColor Cyan
New-NetFirewallRule -DisplayName "Smart LostFound" `
    -Direction Inbound `
    -LocalPort 3000,8000,9000 `
    -Protocol TCP `
    -Action Allow `
    -ErrorAction SilentlyContinue | Out-Null

Write-Host "✅ 방화벽 설정 완료!" -ForegroundColor Green
Write-Host ""

# 공인 IP 확인
Write-Host "🌍 내 IP 주소..." -ForegroundColor Cyan
$ip = (Invoke-RestMethod -Uri "https://api.ipify.org").ip
Write-Host "📍 $ip" -ForegroundColor Yellow
Write-Host ""

# 서버 실행
Write-Host "🚀 서버 실행 중..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot

# 백엔드
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\apps\api'; Write-Host '🔹 백엔드 시작' -ForegroundColor Cyan; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 1

# AI 서버
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\services\ai'; Write-Host '🔹 AI 서버 시작' -ForegroundColor Cyan; python -m uvicorn app.main:app --host 0.0.0.0 --port 9000"

Start-Sleep -Seconds 1

# 프론트엔드
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\apps\frontend'; Write-Host '🔹 프론트엔드 시작' -ForegroundColor Cyan; npm run dev -- --hostname 0.0.0.0"

Write-Host "✅ 모든 서버 실행 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 접속 URL:" -ForegroundColor Yellow
Write-Host "   백엔드:     http://$ip:8000/health"
Write-Host "   AI 서버:    http://$ip:9000/healthz"
Write-Host "   프론트엔드: http://$ip:3000"
Write-Host ""
Write-Host "💡 Ctrl+C로 종료" -ForegroundColor Gray
```

**실행**:

```powershell
# 관리자 PowerShell
.\quick-start.ps1
```

---

## 🆘 문제 해결

### "접속이 안 돼요!"

#### 1. 서버가 0.0.0.0으로 실행 중인지 확인

```powershell
netstat -an | Select-String "8000"
# 결과: 0.0.0.0:8000 또는 :::8000 있어야 함
```

#### 2. 방화벽 규칙 확인

```powershell
Get-NetFirewallRule -DisplayName "Smart LostFound" | Select-Object DisplayName, Enabled
```

#### 3. 학교 방화벽 확인

```powershell
# 다른 PC에서 ping 테스트
ping 203.234.62.84

# 포트 테스트 (PowerShell)
Test-NetConnection -ComputerName 203.234.62.84 -Port 8000
```

#### 4. 로그 확인

서버 터미널에서 에러 메시지 확인

---

## 📊 포트별 설명

| 포트 | 서비스     | 용도         | 필수        |
| ---- | ---------- | ------------ | ----------- |
| 3000 | 프론트엔드 | 웹 UI        | ✅          |
| 8000 | 백엔드 API | 데이터 처리  | ✅          |
| 9000 | AI 서버    | LLM 검색     | ✅          |
| 1521 | Oracle DB  | 데이터베이스 | ❌ (로컬만) |

---

## ✅ 체크리스트

간단한 확인:

- [ ] Windows 방화벽 포트 열림 (3000, 8000, 9000)
- [ ] 서버 `0.0.0.0`으로 실행
- [ ] 로컬 접속 테스트 (`http://localhost:8000/health`)
- [ ] 외부 접속 테스트 (`http://내IP:8000/health`)
- [ ] 스마트폰으로 테스트

---

## 🎓 학교 네트워크 특징

### 장점:

- ✅ 공인 IP 직접 할당
- ✅ 포트 포워딩 불필요
- ✅ 빠른 속도
- ✅ 안정적인 연결

### 단점:

- ⚠️ 학교 방화벽 제한 가능
- ⚠️ 특정 포트 차단 가능
- ⚠️ 학교 정책 준수 필요

---

## 🚀 한 줄 요약

```powershell
# 관리자 PowerShell에서 실행 후 끝!
New-NetFirewallRule -DisplayName "Smart LostFound" -Direction Inbound -LocalPort 3000,8000,9000 -Protocol TCP -Action Allow
```

그 다음 서버를 `--host 0.0.0.0`으로 실행하면 외부 접속 완료! 🎉

---

**더 간단할 수 없습니다!** 😊
