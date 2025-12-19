"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  PlusCircle,
  Search,
  User,
  PackageSearch,
  ListChecks,
  Home,
  Bell,
} from "lucide-react";
import ReturnedAlertCard from "@/components/ReturnedAlertCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

interface Stats {
  total: number;
  stored: number;
  handed_over: number;
  online: number;
}

interface ActivityItem {
  id: string | number;
  icon?: "match" | "new" | "search";
  title: string;
  timeAgo: string;
  type?: string;
  created_at?: string;
  item_id?: number;
}

async function getJSON<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function HeroTopNav() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const refreshAuth = useCallback(() => {
    try {
      const t =
        localStorage.getItem("lf_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");
      setLoggedIn(!!t);
    } catch {
      setLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshAuth();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || ["lf_token", "token"].includes(e.key)) refreshAuth();
    };
    window.addEventListener("storage", onStorage);
    const onAuthChanged = () => refreshAuth();
    window.addEventListener("lf-auth-changed", onAuthChanged as any);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("lf-auth-changed", onAuthChanged as any);
    };
  }, [refreshAuth]);

  const onLogout = () => {
    try {
      localStorage.removeItem("lf_token");
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    } catch {}
    setLoggedIn(false);
    router.replace("/auth");
  };

  return (
    <div className="lf-hero-nav">
      <Link href="/home" className="lf-hero-brand" aria-label="홈으로">
        🔍 Smart Lost & Found
      </Link>
      {!mounted ? (
        <div style={{ width: 96, height: 36 }} aria-hidden />
      ) : loggedIn ? (
        <button
          type="button"
          onClick={onLogout}
          className="lf-hero-login"
          aria-label="로그아웃"
        >
          로그아웃
        </button>
      ) : (
        <Link href="/auth" className="lf-hero-login" aria-label="로그인">
          로그인
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [greetingName] = useState<string>("마음씨 고운 습득자님");
  const [stats, setStats] = useState<Stats>({ total: 0, stored: 0, handed_over: 0, online: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [returnedDelta, setReturnedDelta] = useState<number>(0);
  const [showReturnedAlert, setShowReturnedAlert] = useState<boolean>(false);
  const [returnedList, setReturnedList] = useState<ActivityItem[]>([]);
  const [pendingClaims, setPendingClaims] = useState<number>(0);
  const [showPendingAlert, setShowPendingAlert] = useState<boolean>(false);
  const [claimResultDelta, setClaimResultDelta] = useState<number>(0);
  const [claimResultList, setClaimResultList] = useState<ActivityItem[]>([]);
  const [showClaimResultAlert, setShowClaimResultAlert] = useState<boolean>(false);

  const handleReturnedConfirm = useCallback(() => {
    try {
      const key = `lf_lastSeen_returnedAt_${userId || "anon"}`;
      const latest = returnedList[0]?.created_at || new Date().toISOString();
      localStorage.setItem(key, latest);
    } catch {}
    setShowReturnedAlert(false);
    router.push("/me/activity");
  }, [router, returnedList, userId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem("lf_token");
        let nextStats: Stats | null = null;

        if (token) {
          // 프로필에서 userId 확보
          try {
            const profileRes = await fetch(`${API_BASE}/me/profile`, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
              cache: "no-store",
            });
            if (profileRes.ok) {
              const profile = await profileRes.json();
              if (profile?.id && mounted) setUserId(String(profile.id));
            }
          } catch (e) {
            console.error("Failed to fetch profile:", e);
          }

          // 내 통계
          try {
            const myStatsRes = await fetch(`${API_BASE}/me/stats`, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
              cache: "no-store",
            });
            if (myStatsRes.ok) {
              const myStats = await myStatsRes.json();
              nextStats = {
                total: myStats.total || 0,
                stored: myStats.stored || 0,
                handed_over: myStats.handed_over || 0,
                online: myStats.online || 0,
              };
            }
          } catch (e) {
            console.error("Failed to fetch my stats:", e);
          }

          // 반환 요청 카운트
          try {
            const countRes = await fetch(`${API_BASE}/claims/count/?status=PENDING`, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
              cache: "no-store",
            });
            if (countRes.ok) {
              const countData = await countRes.json();
              const c = Number(countData?.count || 0);
              if (mounted) {
                setPendingClaims(c);
                setShowPendingAlert(c > 0);
              }
            }
          } catch (e) {
            console.error("Failed to fetch pending claims count:", e);
          }

          // 활동 (RETURNED 알림 계산)
          try {
            const actsRes = await fetch(`${API_BASE}/me/activities?limit=50`, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
              cache: "no-store",
            });

            if (actsRes.ok) {
              const acts = await actsRes.json();
              const mappedActs: ActivityItem[] = (acts || []).map((a: any) => ({
                id: a.id || String(Math.random()),
                icon:
                  a.icon === "CLOCK"
                    ? "new"
                    : a.icon === "CHECK"
                    ? "match"
                    : a.icon === "SEARCH"
                    ? "search"
                    : "match",
                title: a.title || a.desc || "활동",
                timeAgo: a.ago || a.timeAgo || "방금 전",
                type: a.type || a.activity_type,
                created_at: a.created_at,
                item_id: a.item_id,
              }));
              if (mounted) {
                setActivities(mappedActs.slice(0, 5));

                const returnedActs = mappedActs
                  .filter((a) => (a.type || "").toUpperCase() === "RETURNED" && a.created_at)
                  .sort(
                    (a, b) =>
                      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
                  );

                setReturnedList(returnedActs);

                const keyId = userId || (token ? token.slice(0, 8) : "anon");
                const key = `lf_lastSeen_returnedAt_${keyId}`;
                let lastSeenTime = 0;
                try {
                  const raw = localStorage.getItem(key);
                  if (raw) lastSeenTime = new Date(raw).getTime();
                } catch {}

                const newReturned = returnedActs.filter(
                  (a) => new Date(a.created_at as string).getTime() > lastSeenTime,
                );
                const delta = newReturned.length;

                // 초기 진입에 delta 없더라도 최신 시점으로 보정
                if (delta === 0 && returnedActs[0]?.created_at && lastSeenTime === 0) {
                  try {
                    localStorage.setItem(key, returnedActs[0].created_at);
                  } catch {}
                }

                setReturnedDelta(delta);
                setShowReturnedAlert(delta > 0);

                // 반환 요청 결과 알림 (분실자)
                const claimResults = mappedActs
                  .filter((a) => {
                    const t = (a.type || "").toUpperCase();
                    return (t === "CLAIM_APPROVED" || t === "CLAIM_REJECTED") && a.created_at;
                  })
                  .sort(
                    (a, b) =>
                      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
                  );
                setClaimResultList(claimResults);

                const keyClaim = `lf_lastSeen_claimResult_${userId || token?.slice(0, 8) || "anon"}`;
                let lastSeenClaim = 0;
                try {
                  const raw = localStorage.getItem(keyClaim);
                  if (raw) lastSeenClaim = new Date(raw).getTime();
                } catch {}

                const newClaimResults = claimResults.filter(
                  (a) => new Date(a.created_at as string).getTime() > lastSeenClaim,
                );
                const deltaClaim = newClaimResults.length;

                if (deltaClaim === 0 && claimResults[0]?.created_at && lastSeenClaim === 0) {
                  try {
                    localStorage.setItem(keyClaim, claimResults[0].created_at as string);
                  } catch {}
                }

                setClaimResultDelta(deltaClaim);
                setShowClaimResultAlert(deltaClaim > 0);
              }
            }
          } catch (e) {
            console.error("Failed to fetch activities:", e);
          }
        }

        // 로그인 안 했거나 실패 시 전체 통계 폴백
        if (!nextStats) {
          const statsA = await getJSON<any>(`/items/stats`).catch(() => null);
          if (statsA && typeof statsA === "object") {
            nextStats = {
              total: Number(statsA.total ?? statsA.items_total ?? 0),
              stored: Number(statsA.stored ?? statsA.items_stored ?? 0),
              handed_over: Number(statsA.handed ?? statsA.handed_over ?? statsA.returned ?? 0),
              online: Number(statsA.online ?? statsA.users_online ?? 0),
            };
          } else {
            const statsB = await getJSON<any>(`/stats/overview`).catch(() => null);
            if (statsB) {
              nextStats = {
                total: Number(statsB.total ?? 0),
                stored: Number(statsB.stored ?? 0),
                handed_over: Number(statsB.handed_over ?? statsB.returned ?? 0),
                online: Number(statsB.online ?? 0),
              };
            }
          }
        }

        if (mounted) setStats(nextStats ?? { total: 0, stored: 0, handed_over: 0, online: 0 });
      } catch (e) {
        console.error("Main page data fetch error:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const quickActions = useMemo(
    () => [
      {
        href: "/items/new",
        title: "분실물 등록",
        desc: "사진과 위치 정보로 쉽게 등록하기",
        Icon: PlusCircle,
      },
      {
        href: "/me/items",
        title: "내 등록 목록",
        desc: "등록한 분실물 상태 확인",
        Icon: ListChecks,
      },
    ],
    [],
  );

  return (
    <div className="lf-page pb-safe">
      <section className="lf-hero">
        <HeroTopNav />
        <div className="lf-container pt-10">
          <h1 className="lf-hero-title">안녕하세요, {greetingName}</h1>
          <p className="lf-hero-desc">분실물을 등록하여 주인을 찾아주세요</p>
        </div>
      </section>

      <main className="lf-container space-y-8" style={{ marginTop: "-60px" }}>
        {showPendingAlert && pendingClaims > 0 && (
          <div
            className="lf-card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "16px 18px",
            }}
            aria-label="반환 요청 알림"
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>알림</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                반환 요청이 {pendingClaims}건 있습니다.
              </div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
                등록한 분실물에 대한 요청을 확인해 주세요.
              </div>
            </div>
            <button
              type="button"
              className="lf-btn"
              onClick={() => {
                setShowPendingAlert(false);
                router.push("/claims/inbox");
              }}
              aria-label="반환 요청 확인하기"
            >
              확인하기
            </button>
          </div>
        )}

        {showClaimResultAlert && claimResultDelta > 0 && (
          <div
            className="lf-card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "16px 18px",
            }}
            aria-label="반환 요청 결과 알림"
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>알림</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {claimResultDelta === 1
                  ? `${claimResultList[0]?.title || "분실물"} 요청 결과가 도착했습니다.`
                  : `반환 요청 결과가 ${claimResultDelta}건 있습니다.`}
              </div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
                승인 또는 거절된 요청 결과를 확인해 주세요.
              </div>
            </div>
            <button
              type="button"
              className="lf-btn"
              onClick={() => {
                try {
                  const keyClaim = `lf_lastSeen_claimResult_${userId || "anon"}`;
                  const latest = claimResultList[0]?.created_at || new Date().toISOString();
                  localStorage.setItem(keyClaim, latest);
                } catch {}
                setShowClaimResultAlert(false);
                router.push("/me/activity");
              }}
              aria-label="반환 요청 결과 확인하기"
            >
              확인하기
            </button>
          </div>
        )}

        <ReturnedAlertCard
          visible={showReturnedAlert && returnedDelta > 0}
          delta={returnedDelta}
          title={returnedList[0]?.title}
          onConfirm={handleReturnedConfirm}
        />

        <section aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="sr-only">
            빠른 작업
          </h2>
          <div className="lf-grid-2">
            {quickActions.map(({ href, Icon, title, desc }) => (
              <Link key={href} href={href} className="lf-card lf-card-quick group" aria-label={title}>
                <div className="lf-card-quick-left">
                  <div className="lf-pill-icon group-hover:scale-105">
                    <Icon className="h-8 w-8" />
                  </div>
                </div>
                <div className="lf-card-quick-body">
                  <div className="lf-card-quick-title">
                    <Icon className="mr-2 h-5 w-5 opacity-80" />
                    <span>{title}</span>
                  </div>
                  <p className="lf-card-quick-desc">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="live-stats">
          <h2 id="live-stats" className="lf-section-title">
            실시간 현황
          </h2>
          <div className="lf-grid-3">
            <StatBox label="전체 등록" value={stats.total} />
            <StatBox label="보관 중" value={stats.stored} />
            <StatBox label="반환 완료" value={stats.handed_over} />
          </div>
        </section>

        <section aria-labelledby="recent-activity">
          <h2 id="recent-activity" className="lf-section-title">
            최근 활동
          </h2>
          <div className="lf-card">
            <ul className="lf-activity-list">
              {activities.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-slate-500">
                  아직 활동이 없습니다.{" "}
                  <Link className="underline" href="/items/new">
                    분실물 등록하러 가기
                  </Link>
                </li>
              )}
              {activities.map((a) => (
                <li key={a.id} className="lf-activity-item">
                  <ActivityIcon kind={a.icon} />
                  <div className="flex-1">
                    <p className="lf-activity-title line-clamp-1">
                      {(() => {
                        const t = (a.type || "").toString().toUpperCase();
                        if (t === "RETURNED") return <span className="lf-activity-chip">반환</span>;
                        if (t === "CREATED" || t === "NEW") return <span className="lf-activity-chip">등록</span>;
                        return null;
                      })()}
                      {a.title}
                    </p>
                    <p className="lf-activity-time">{a.timeAgo}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <nav className="lf-tabbar" aria-label="하단 탭바">
        <div className="lf-tabbar-inner">
          <Link href="/home" className="lf-tab lf-tab-active" aria-label="홈">
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
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="lf-stat" role="status" aria-label={label}>
      <div className="lf-stat-value">{Number.isFinite(value) ? value : "-"}</div>
      <div className="lf-stat-label">{label}</div>
    </div>
  );
}

function ActivityIcon({ kind }: { kind?: ActivityItem["icon"] }) {
  const cls = "h-5 w-5 text-slate-500";
  if (kind === "match") return <ListChecks className={cls} />;
  if (kind === "new") return <PackageSearch className={cls} />;
  return <LayoutDashboard className={cls} />;
}
