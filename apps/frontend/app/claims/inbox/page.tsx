"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

type ClaimItem = {
  id: number;
  item_id: number;
  item_name?: string;
  message?: string;
  status?: string;
  created_at?: string;
};

function timeAgo(ts?: string) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export default function ClaimsInboxPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClaims = async () => {
    try {
      const token = localStorage.getItem("lf_token");
      if (!token) {
        setError("로그인이 필요합니다.");
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/claims?status=PENDING`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(`요청 목록을 불러오지 못했습니다 (${res.status})`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setClaims(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleStatus = async (claimId: number, next: "APPROVED" | "REJECTED") => {
    const token = localStorage.getItem("lf_token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/claims/${claimId}?status=${next}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      if (!res.ok) {
        const msg = await res.text();
        alert(msg || "처리에 실패했습니다.");
        return;
      }
      setClaims((prev) =>
        prev
          .map((c) => (c.id === claimId ? { ...c, status: next } : c))
          .filter((c) => c.status === "PENDING")
      );
      if (next === "APPROVED") {
        alert("반환 완료로 승인했습니다.");
      } else {
        alert("요청을 거절했습니다.");
      }
    } catch {
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  const handleView = (claim: ClaimItem) => {
    try {
      sessionStorage.setItem(
        "lf_claim_ctx",
        JSON.stringify({ claim_id: claim.id, item_id: claim.item_id, message: claim.message || "" })
      );
    } catch {}
    router.push(`/items/${claim.item_id}?from=claims&claim_id=${claim.id}`);
  };

  return (
    <main className="lf-page">
      <section className="lf-hero">
        <div className="lf-container">
          <p className="lf-hero-sub">반환 요청함</p>
          <h1 className="lf-hero-title">받은 반환 요청</h1>
          <p className="lf-hero-desc">등록한 분실물에 대한 반환 요청을 확인하고 승인/거절하세요.</p>
        </div>
      </section>

      <div className="lf-container" style={{ marginTop: "-40px", paddingBottom: "80px" }}>
        <div className="lf-card" style={{ padding: "16px 18px", marginBottom: 16 }}>
          <button className="lf-btn ghost" onClick={() => router.back()} aria-label="뒤로가기">
            ← 뒤로가기
          </button>
        </div>

        {loading && <div className="lf-card" style={{ padding: 20 }}>불러오는 중...</div>}
        {error && !loading && <div className="lf-card" style={{ padding: 20, color: "#c00" }}>{error}</div>}

        {!loading && !error && claims.length === 0 && (
          <div className="lf-card" style={{ padding: 20 }}>
            받은 반환 요청이 없습니다.
          </div>
        )}

        <div className="lf-grid-2" style={{ marginTop: 8 }}>
          {claims.map((c) => (
            <article key={c.id} className="lf-card lf-card-quick" style={{ alignItems: "flex-start" }}>
              <div className="lf-card-quick-body" style={{ gap: 4 }}>
                <div className="lf-card-quick-title" style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>{c.item_name || `분실물 #${c.item_id}`}</span>
                  <span className="lf-chip" style={{ marginLeft: 8 }}>
                    요청됨
                  </span>
                </div>
                <p className="lf-card-quick-desc" style={{ whiteSpace: "pre-wrap" }}>
                  메모: {c.message || "메모 없음"}
                </p>
                <p className="lf-card-quick-desc" style={{ fontSize: 12 }}>
                  {timeAgo(c.created_at)}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button className="lf-btn ghost" onClick={() => handleView(c)} aria-label="상세보기">
                    상세보기
                  </button>
                  <button
                    className="lf-btn"
                    onClick={() => handleStatus(c.id, "APPROVED")}
                    aria-label="승인하기"
                  >
                    승인(반환 처리)
                  </button>
                  <button
                    className="lf-btn ghost"
                    onClick={() => handleStatus(c.id, "REJECTED")}
                    aria-label="거절하기"
                  >
                    거절
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
