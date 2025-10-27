"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// ✅ 바뀐 포인트: 클래스가 아니라 함수로 import
import { login, register } from "@/lib/api";

// ✅ Role 타입을 로컬로 정의(또는 api.ts에서 export 해도 됨)
type Role = "SEEKER" | "FINDER";

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const router = useRouter();

  // 폼 상태
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("SEEKER");

  useEffect(() => {
    setMsg(null);
  }, [tab]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      // ✅ 함수 호출로 변경
      const res = await login(email, password);
      localStorage.setItem("lf_token", res.access_token);
      setMsg("✅ 로그인 성공! 잠시 후 이동합니다...");
      setTimeout(() => router.push("/"), 600);
    } catch (e: any) {
      setMsg(e?.message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      // ✅ 함수 호출로 변경
      await register({ email, phone, password, role });
      setMsg("🎉 회원가입 완료! 이제 로그인해주세요.");
      setTab("login");
    } catch (e: any) {
      setMsg(e?.message || "회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* 상단 타이틀 & 탭 */}
        <div style={{ display: "grid", gap: 12 }}>
          <h1 className="auth-title">{tab === "login" ? "로그인" : "회원가입"}</h1>
          <p className="auth-sub">
            {tab === "login"
              ? "계정을 입력하고 로그인하세요"
              : "간단한 정보로 빠르게 가입할 수 있어요"}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              background: "#f1f5f9",
              padding: 6,
              borderRadius: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setTab("login")}
              className="auth-input"
              style={{
                textAlign: "center",
                fontWeight: 700,
                background: tab === "login" ? "#fff" : "#f8fafc",
                borderColor: tab === "login" ? "#bfdbfe" : "#e6ebf3",
              }}
              aria-pressed={tab === "login"}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className="auth-input"
              style={{
                textAlign: "center",
                fontWeight: 700,
                background: tab === "register" ? "#fff" : "#f8fafc",
                borderColor: tab === "register" ? "#bfdbfe" : "#e6ebf3",
              }}
              aria-pressed={tab === "register"}
            >
              회원가입
            </button>
          </div>
        </div>

        {/* 폼 */}
        {tab === "login" ? (
          <form onSubmit={onLogin} style={{ display: "grid", gap: 12, marginTop: 8 }}>
            <input
              type="email"
              className="auth-input"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="password"
              className="auth-input"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {msg && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#475569" }}>{msg}</p>
            )}

            <button
              type="submit"
              className="auth-btn-primary"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "처리 중..." : "로그인"}
            </button>

            <div className="auth-toggle">
              계정이 없나요?{" "}
              <button type="button" onClick={() => setTab("register")}>
                회원가입
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={onRegister} style={{ display: "grid", gap: 12, marginTop: 8 }}>
            <input
              type="email"
              className="auth-input"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="tel"
              className="auth-input"
              placeholder="휴대폰 번호 (예: 010-1234-5678)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
            />
            <input
              type="password"
              className="auth-input"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <div className="auth-role">
              <button
                type="button"
                onClick={() => setRole("SEEKER")}
                className={role === "SEEKER" ? "is-active" : undefined}
                aria-pressed={role === "SEEKER"}
              >
                분실자(찾기)
              </button>
              <button
                type="button"
                onClick={() => setRole("FINDER")}
                className={role === "FINDER" ? "is-active" : undefined}
                aria-pressed={role === "FINDER"}
              >
                습득자(등록)
              </button>
            </div>

            {msg && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#475569" }}>{msg}</p>
            )}

            <button
              type="submit"
              className="auth-btn-primary"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "처리 중..." : "회원가입"}
            </button>

            <div className="auth-toggle">
              이미 계정이 있나요?{" "}
              <button type="button" onClick={() => setTab("login")}>
                로그인
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
