// apps/frontend/app/items/[id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
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

  const handleHandOver = async () => {
    if (!confirm("반환 처리하시겠습니까?")) return;
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
        alert("반환 처리되었습니다.");
        setItem({ ...item, status: "HANDED_OVER" });
      }
    } catch (e) {
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  const handleRequestReturn = async () => {
    if (!confirm("등록자에게 반환 요청을 보내시겠습니까?")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("lf_token") : null;
      const res = await fetch(`${API_BASE}/items/${item?.id}/return-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setMessage("반환 요청이 전송되었습니다.");
      } else {
        const text = await res.text();
        alert(text || "반환 요청 실패");
      }
    } catch (e) {
      alert("반환 요청 중 오류가 발생했습니다.");
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
          {item.is_owner ? (
            <>
              {(item.status === "STORED" || item.status === "CLAIMED") && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
                    <CheckCircle size={18} /> 반환 처리
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
                </div>
              )}
              {item.status === "HANDED_OVER" && (
                <p style={{ color: "#4caf50", fontSize: "16px", fontWeight: "bold", textAlign: "center" }}>
                  이미 반환 완료된 물건입니다.
                </p>
              )}
            </>
          ) : (
            <>
              {item.status === "STORED" && (
                <>
                  <p style={{ marginBottom: "12px", color: "#666", fontSize: "14px" }}>
                    본인 물건이라면 등록자에게 반환 요청을 보내세요.
                  </p>
                  <button
                    onClick={handleRequestReturn}
                    className="lf-btn-primary-full"
                    style={{
                      background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
                      boxShadow: "0 4px 15px rgba(76, 175, 80, 0.4)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    반환 요청 보내기
                  </button>
                  {message && <p style={{ marginTop: 8, color: "#16a34a" }}>{message}</p>}
                </>
              )}
              {item.status === "CLAIMED" && (
                <p style={{ color: "#ff9800", fontSize: "16px", fontWeight: "bold", textAlign: "center" }}>
                  반환 요청이 처리 중입니다.
                </p>
              )}
              {item.status === "HANDED_OVER" && (
                <p style={{ color: "#666", fontSize: "16px", fontWeight: "bold", textAlign: "center" }}>
                  이미 반환 완료된 물건입니다.
                </p>
              )}
            </>
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
    </main>
  );
}
