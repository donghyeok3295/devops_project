"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";

type Role = "SEEKER" | "FINDER";

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setMsg(null);
  }, [tab]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await login(email, password);
      localStorage.setItem("lf_token", res.access_token);

      // redirectTo 쿼리가 있으면 우선 사용, 없으면 /home
      let target = "/home";
      try {
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get("redirectTo");
        if (redirectTo) target = redirectTo;
      } catch {}

      setMsg("로그인 성공! 곧 이동합니다...");
      setTimeout(() => router.replace(target), 300);
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
      await register({ email, phone, password, role: "FINDER" as Role });
      setMsg("회원가입이 완료됐습니다. 로그인해 주세요.");
      setTab("login");
    } catch (e: any) {
      setMsg(e?.message || "회원가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div style={{ display: "grid", gap: 12 }}>
          <h1 className="auth-title">{tab === "login" ? "로그인" : "회원가입"}</h1>
          <p className="auth-sub">
            {tab === "login"
              ? "계정 정보를 입력하고 로그인하세요"
              : "간단한 정보를 입력해 계정을 만들 수 있습니다"}
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
              {loading ? "처리 중.." : "로그인"}
            </button>

            <div className="auth-toggle">
              계정이 없으신가요?{" "}
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
              placeholder="전화번호 (예: 010-1234-5678)"
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

            {msg && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#475569" }}>{msg}</p>
            )}

            <button
              type="submit"
              className="auth-btn-primary"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "처리 중.." : "회원가입"}
            </button>

            <div className="auth-toggle">
              이미 계정이 있으신가요?{" "}
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
