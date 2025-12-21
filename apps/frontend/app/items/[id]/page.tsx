"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Home, PlusCircle, Bell, User, Search, CheckCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type ItemDetail = {
  id: number;
  name: string;
  finder_id?: number;
  is_owner?: boolean;
  category?: string;
  brand?: string;
  model?: string;
  color?: string;
  status?: string;
  stored_place?: string;
  lat?: number | null;
  lng?: number | null;
  features?: string;
  accessories?: string;
  serial_masked?: string;
  photos?: Array<{ url: string }>;
  description?: string;
};

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [memo, setMemo] = useState("");
  const [posting, setPosting] = useState(false);
  const [claimMemo, setClaimMemo] = useState("");
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("lf_token") : null;
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const res = await fetch(`${API_BASE}/items/${id}`, {
          cache: "no-store",
          headers,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        if (!cancelled) setItem(data);

        // 이미 요청한 아이템인지 로컬 기록 확인
        try {
          const raw = localStorage.getItem("lf_requested_claims");
          const arr = raw ? JSON.parse(raw) : [];
          if (Array.isArray(arr) && arr.some((v: any) => Number(v) === Number(id))) {
            setRequested(true);
          }
        } catch {}
      } catch (e) {
        console.error("Failed to fetch item:", e);
        if (!cancelled) {
          setItem({
            id: Number(id),
            name: "분실물",
            status: "STORED",
            stored_place: "미정",
            photos: [],
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      if (!item || !item.lat || !item.lng) return;
      if (!mapRef.current || mapInstanceRef.current) return;

      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current).setView([item.lat, item.lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const icon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png",
        shadowSize: [41, 41],
      });
      L.marker([item.lat, item.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${item.name}</b><br/>위치: ${item.lat}, ${item.lng}`);

      mapInstanceRef.current = map;
    })();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [item]);

  // 요청함에서 넘어올 때 메모 표시
  useEffect(() => {
    const claimId = searchParams.get("claim_id");
    if (!claimId) return;
    try {
      const raw = sessionStorage.getItem("lf_claim_ctx");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Number(parsed.claim_id) === Number(claimId)) {
        setClaimMemo(parsed.message || "");
      }
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  const handleHandOver = async () => {
    if (!confirm("이 분실물을 반환 완료로 표시할까요?")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("lf_token") : null;
      const res = await fetch(`${API_BASE}/items/${id}/status?new_status=HANDED_OVER`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      if (res.ok && item) {
        alert("반환 완료로 표시되었습니다.");
        setItem({ ...item, status: "HANDED_OVER" });
      } else {
        const txt = await res.text();
        alert(txt || "반환 처리에 실패했습니다.");
      }
    } catch (e) {
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  const handleRequest = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("lf_token") : null;
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch(`${API_BASE}/claims/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ item_id: Number(id), memo }),
      });
      if (res.status === 409) {
        alert("이미 반환 요청을 보냈습니다.");
        setRequested(true);
        setShowModal(false);
        return;
      }
      if (!res.ok) {
        const txt = await res.text();
        alert(txt || "반환 요청에 실패했습니다.");
        return;
      }
      // 성공
      setRequested(true);
      setShowModal(false);
      setMemo("");
      try {
        const raw = localStorage.getItem("lf_requested_claims");
        const arr = raw ? JSON.parse(raw) : [];
        const merged = Array.isArray(arr) ? arr : [];
        merged.push(Number(id));
        localStorage.setItem("lf_requested_claims", JSON.stringify(merged));
      } catch {}
      alert("반환 요청이 전송되었습니다.");
    } catch {
      alert("반환 요청 중 오류가 발생했습니다.");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠어요?")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("lf_token") : null;
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        alert("삭제되었습니다.");
        router.replace("/me/items");
      } else {
        const txt = await res.text();
        alert(txt || "삭제에 실패했습니다.");
      }
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading || !item) {
    return (
      <div className="lf-page lf-container" style={{ paddingTop: "100px" }}>
        로딩 중...
      </div>
    );
  }

  return (
    <main className="lf-page">
      <section className="lf-hero">
        <div className="lf-container">
          <p className="lf-hero-sub">분실물 상세</p>
          <h1 className="lf-hero-title">{item.name || "분실물"}</h1>
          <p className="lf-hero-desc">상세 정보를 확인하세요.</p>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="lf-btn ghost"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const q = (typeof window !== "undefined" && new URLSearchParams(location.search).get("q")) || "";
                const from = (typeof window !== "undefined" && new URLSearchParams(location.search).get("from")) || "";
                if (from === "search") {
                  if (q) router.push(`/results?q=${encodeURIComponent(q)}`);
                  else router.push("/search");
                } else {
                  router.back();
                }
              }}
              aria-label="검색 결과로 돌아가기"
            >
              ← 검색 결과로 돌아가기
            </button>
          </div>
          {claimMemo && (
            <div
              className="lf-card"
              style={{ marginTop: 12, padding: "14px 16px", maxWidth: 720 }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>반환 요청 메모</div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{claimMemo || "메모 없음"}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                요청 내용을 확인한 뒤 승인/거절을 진행해 주세요.
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="lf-container" style={{ paddingTop: "20px", paddingBottom: "88px" }}>
        <div className="lf-detail-gallery lf-card">
          {item.photos?.length ? (
            <div className="lf-detail-gallery-grid">
              {item.photos.map((p, i) => (
                <img key={i} src={p.url} alt={`${item.name} 사진 ${i + 1}`} />
              ))}
            </div>
          ) : (
            <div className="lf-detail-gallery-empty">이미지 없음</div>
          )}
        </div>

        <div className="lf-card lf-detail-attrs">
          <h2 className="lf-section-title">{item.name}</h2>
          <dl className="lf-attrs">
            <div><dt>카테고리</dt><dd>{item.category || "-"}</dd></div>
            <div><dt>브랜드</dt><dd>{item.brand || "-"}</dd></div>
            <div><dt>모델</dt><dd>{item.model || "-"}</dd></div>
            <div><dt>색상</dt><dd>{item.color || "-"}</dd></div>
            <div><dt>상태</dt><dd>{item.status || "-"}</dd></div>
          </dl>
        </div>

        <div className="lf-card lf-detail-place">
          <h3 className="lf-section-title">보관 위치</h3>
          <p className="lf-place-text">{item.stored_place || "미정"}</p>
          {item.lat && item.lng && (
            <>
              <p className="lf-place-text" style={{ fontFamily: "monospace", fontSize: "12px", color: "#666" }}>
                위도: {item.lat}, 경도: {item.lng}
              </p>
              <div ref={mapRef} style={{ width: "100%", height: "300px", marginTop: "12px", borderRadius: "8px" }} />
              <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <a
                  href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "12px", color: "#0066cc" }}
                >
                  Google Maps에서 보기
                </a>
              </div>
            </>
          )}
        </div>

        <div className="lf-card lf-detail-desc">
          <h3 className="lf-section-title">상세 설명</h3>
          <ul className="lf-desc-list">
            <li><strong>특징</strong> {item.features || "-"}</li>
            <li><strong>부속품</strong> {item.accessories || "-"}</li>
            <li><strong>시리얼(마스킹)</strong> {item.serial_masked || "-"}</li>
            {item.description && <li><strong>비고</strong> {item.description}</li>}
          </ul>
        </div>

        <div className="lf-card" style={{ marginTop: "16px" }}>
          {(item.status === "STORED" || item.status === "CLAIMED") && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {item.is_owner ? (
                <>
                  <button
                    onClick={handleHandOver}
                    className="lf-btn-primary-full"
                    style={{
                      flex: 1,
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <CheckCircle size={18} /> 반환 완료로 표시
                  </button>
                  <button
                    onClick={handleDelete}
                    className="lf-btn-primary-full"
                    style={{
                      flex: 1,
                      background: "linear-gradient(135deg, #f44336 0%, #e91e63 100%)",
                      boxShadow: "0 4px 15px rgba(244, 67, 54, 0.4)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    삭제
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  className="lf-btn-primary-full"
                  disabled={requested}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  }}
                >
                  {requested ? "요청됨" : "반환 요청"}
                </button>
              )}
            </div>
          )}
          {item.status === "HANDED_OVER" && (
            <p style={{ color: "#4caf50", fontSize: "16px", fontWeight: "bold", textAlign: "center" }}>
              이미 반환 완료된 물건입니다.
            </p>
          )}
        </div>
      </section>

      <nav className="lf-tabbar" aria-label="하단 내비게이션">
        <div className="lf-tabbar-inner">
          <Link href="/home" className="lf-tab" aria-label="홈">
            <Home size={18} />
            <span>홈</span>
          </Link>
          <Link href="/items/new" className="lf-tab" aria-label="등록">
            <PlusCircle size={18} />
            <span>등록</span>
          </Link>
          <Link href="/me/activity" className="lf-tab" aria-label="내 활동">
            <Bell size={18} />
            <span>내 활동</span>
          </Link>
          <Link href="/me/profile" className="lf-tab" aria-label="내 정보">
            <User size={18} />
            <span>내 정보</span>
          </Link>
          <Link href="/search" className="lf-tab" aria-label="검색">
            <Search size={18} />
            <span>검색</span>
          </Link>
        </div>
      </nav>
      {showModal && (
        <div
          className="lf-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="반환 요청"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="lf-modal"
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              width: "min(520px, 92vw)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            }}
          >
            <div
              className="lf-modal-head"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}
            >
              <h3 style={{ fontWeight: 700, fontSize: 18 }}>반환 요청</h3>
              <button
                className="lf-modal-close"
                onClick={() => (!posting ? setShowModal(false) : null)}
                aria-label="모달 닫기"
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 22,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <p className="lf-modal-desc" style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
              선택한 분실물에 대해 반환 요청을 보냅니다. 필요하면 메모를 남겨 주세요.
            </p>
            <div className="lf-modal-body" style={{ marginBottom: 16 }}>
              <label className="lf-modal-label" style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
                메모 (선택)
                <textarea
                  value={memo}
                  maxLength={500}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="예: ○○역에서 잃어버렸고 케이스에 스티커가 있습니다."
                  style={{
                    width: "100%",
                    marginTop: 6,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    padding: 10,
                    minHeight: 80,
                  }}
                />
              </label>
            </div>
            <div className="lf-modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="lf-btn ghost" onClick={() => setShowModal(false)} disabled={posting}>
                취소
              </button>
              <button className="lf-btn" onClick={handleRequest} disabled={posting}>
                {posting ? "전송 중..." : "요청 보내기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
