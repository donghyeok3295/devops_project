# 🌐 네트워크 시나리오별 설정 가이드

## 📋 상황 분석

```
PC1 (백엔드+DB)    : 203.234.62.84  (학교/회사 네트워크)
PC2 (AI+LLM)       : 203.234.62.47  (학교/회사 네트워크)
PC3 (프론트엔드)    : ???           (시연용 - 다른 네트워크 가능성)
```

---

## 🔴 시나리오 1: 모든 PC가 같은 네트워크 (가장 간단)

### 상황
- PC1, PC2, PC3 모두 같은 LAN에 연결
- 예: 모두 같은 Wi-Fi 또는 같은 스위치에 연결

### 설정
```bash
# PC3 (.env.local)
NEXT_PUBLIC_API_BASE=http://203.234.62.84:8000
```

### 테스트
```bash
# PC3에서 확인
ping 203.234.62.84
curl http://203.234.62.84:8000/health
```

---

## 🟡 시나리오 2: 프론트엔드가 다른 네트워크 (일반적)

### 상황
- PC1, PC2는 학교/회사 네트워크
- PC3는 외부 네트워크 (집, 카페, 다른 건물 등)
- **현재 IP(203.234.62.x)는 사설 IP일 가능성**

### 문제점
```
PC3 (외부)
    ↓ http://203.234.62.84:8000 ← 접근 불가능!
    ✗ (사설 IP는 외부에서 접근 불가)
백엔드 (내부)
```

### ⭐ 해결 방법

#### 방법 A: 공인 IP + 포트 포워딩 (권장)

1. **PC1의 공인 IP 확인**
```bash
# PC1에서 실행
curl ifconfig.me
# 또는
curl api.ipify.org

# 예: 123.456.78.90
```

2. **라우터 포트 포워딩 설정**
```
라우터 관리 페이지 접속
→ 포트 포워딩 설정
→ 외부 포트: 8000 → 내부 IP: 203.234.62.84, 포트: 8000
```

3. **방화벽 설정**
```bash
# PC1에서 8000 포트 허용
# Windows: 제어판 → 방화벽 → 인바운드 규칙
# Linux: sudo ufw allow 8000/tcp
```

4. **PC3 설정**
```bash
# PC3 (.env.local)
NEXT_PUBLIC_API_BASE=http://123.456.78.90:8000  # 공인 IP
```

5. **테스트**
```bash
# PC3에서 (외부 네트워크)
curl http://123.456.78.90:8000/health
```

#### 방법 B: ngrok 사용 (임시/개발용)

1. **ngrok 설치 (PC1에서)**
```bash
# https://ngrok.com 에서 다운로드
# Windows: ngrok.exe, Linux: ngrok

# 회원가입 후 인증 토큰 설정
ngrok config add-authtoken YOUR_TOKEN
```

2. **ngrok 실행**
```bash
# PC1에서 (백엔드 서버 실행 중인 상태에서)
ngrok http 8000

# 출력 예시:
# Forwarding: https://abc123.ngrok.io -> http://localhost:8000
```

3. **PC3 설정**
```bash
# PC3 (.env.local)
NEXT_PUBLIC_API_BASE=https://abc123.ngrok.io
```

4. **장점/단점**
```
장점:
✅ 빠르고 간단
✅ HTTPS 자동 지원
✅ 포트 포워딩 불필요

단점:
❌ 임시 URL (재시작하면 변경됨)
❌ 무료 버전은 제한 있음
❌ 프로덕션 부적합
```

#### 방법 C: VPN (조직 내부용)

1. **VPN 서버 설정** (IT 관리자)
2. **모든 PC가 VPN 연결**
3. **VPN 내부 IP 사용**

---

## 🟢 시나리오 3: 프론트엔드를 PC1과 같이 실행

### 상황
- 프론트엔드를 백엔드와 같은 PC에서 실행
- 간단하지만 시연 시 한 PC만 사용

### 설정
```bash
# PC1에서
cd devops_project/apps/frontend
cp .env.example .env.local

# .env.local
NEXT_PUBLIC_API_BASE=http://localhost:8000

# 실행
npm run dev

# 접속: http://localhost:3000
```

---

## 🔧 권장 시나리오별 선택

### 개발/테스트 단계
```
✅ 방법 B (ngrok) - 가장 빠르고 간단
   또는
✅ 시나리오 3 (같은 PC) - 네트워크 문제 없음
```

### 실제 시연 (다른 네트워크)
```
✅ 방법 A (포트 포워딩) - 안정적
   필요 조건:
   - 라우터 관리자 권한
   - 공인 IP 확인
   - 포트 포워딩 설정 가능
```

### 학교/회사 내부 네트워크
```
✅ 시나리오 1 (같은 LAN) - 가장 이상적
   또는
✅ 방법 C (VPN) - IT 지원 필요
```

---

## 📊 현재 설정 확인

### 1. 네트워크 타입 확인
```bash
# PC1에서 실행
ip addr show  # Linux
ipconfig      # Windows

# 203.234.62.x는:
# - 192.168.x.x: 사설 IP (NAT 뒤)
# - 10.x.x.x: 사설 IP
# - 172.16-31.x.x: 사설 IP
# - 기타: 공인 IP 가능성
```

### 2. 공인 IP 확인
```bash
# PC1에서
curl ifconfig.me
curl api.ipify.org

# 이 IP가 203.234.62.84와 다르면
# → 사설 IP이므로 포트 포워딩 필요
```

### 3. 외부 접근 테스트
```bash
# PC3 (다른 네트워크)에서
curl http://203.234.62.84:8000/
