"use client"

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, BadgeCheck, User, Settings, Sparkles, Star, Home, PlusCircle, Search, Bell, ShieldCheck, Lock } from "lucide-react";
import { getMyProfile, getMyStats } from "@/lib/api";

type Profile = {
  name: string;
  joined_at: string;
  reputation: number;
  stats: {
    registered: number;
    stored?: number;
    handed_over: number;
    claims?: number;
    matched?: number;
  };
  badges: Array<{ id: string; label: string; desc: string }>;
};

export default function MeProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("lf_token") || sessionStorage.getItem("lf_token");
  }

  async function fetchProfile(): Promise<Profile> {
    const [profileData, statsData] = await Promise.all([
      getMyProfile(),
      getMyStats(),
    ]);

    let joinedDate = "N/A";
    if (profileData.created_at) {
      try {
        const date = new Date(profileData.created_at);
        joinedDate = date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
      } catch {}
    }

    return {
      name: profileData.email?.split("@")[0] ?? "사용자",
      joined_at: joinedDate,
      reputation: 4,
      stats: {
        registered: statsData.total || 0,
        stored: statsData.stored ?? 0,
        handed_over: statsData.handed_over || 0,
        matched: statsData.handed_over || 0,
        claims: statsData.claims ?? 0,
      },
      badges: [],
    };
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }
    setLoading(true);
    setError(null);
    fetchProfile()
      .then(setProfile)
      .catch((e) => setError(e?.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const matchSuccessCount = profile?.stats?.handed_over ?? profile?.stats?.matched ?? 0;

  const achievements = useMemo(() => {
    const defs = [
      { threshold: 3, title: "첫 도움의 손길", lines: ["처음으로 분실물을 찾아주었어요", "누군가의 하루를 도왔습니다"], tone: "tier1" },
      { threshold: 5, title: "믿음직한 발견자", lines: ["다섯 번의 성공, 신뢰가 쌓이고 있어요", "분실물 찾기의 감을 잡았어요"], tone: "tier2" },
      { threshold: 7, title: "분실물 전문가", lines: ["이제는 노하우가 보입니다", "많은 사람들에게 도움을 주고 있어요"], tone: "tier3" },
      { threshold: 10, title: "분실물 해결사", lines: ["열 번의 성공, 신뢰의 상징이 되었습니다", "당신 덕분에 많은 분실물이 돌아갔어요"], tone: "tier4" },
    ];
    return defs.map((def) => ({
      ...def,
      unlocked: matchSuccessCount >= def.threshold,
      needed: Math.max(def.threshold - matchSuccessCount, 0),
    }));
  }, [matchSuccessCount]);

  const currentTier = useMemo(() => {
    const tiers = [
      { threshold: 10, title: "분실물 해결사", lines: ["열 번의 성공, 신뢰의 상징이 되었습니다", "당신 덕분에 많은 분실물이 제자리로 돌아갔어요"], stars: 5 },
      { threshold: 7, title: "분실물 전문가", lines: ["이제는 노하우가 보입니다", "많은 사람들에게 도움을 주고 있어요"], stars: 3 },
      { threshold: 5, title: "믿음직한 발견자", lines: ["다섯 번의 성공, 신뢰가 쌓이고 있어요", "분실물 찾기의 감을 잡았어요"], stars: 2 },
      { threshold: 3, title: "첫 도움의 손길", lines: ["처음으로 분실물을 찾아주었어요", "누군가의 하루를 도왔습니다"], stars: 1 },
      { threshold: 0, title: "시작하는 발견자", lines: ["첫 매칭을 향해 달려가는 중이에요", ""], stars: 0 },
    ];
    return tiers.find((t) => matchSuccessCount >= t.threshold) ?? tiers[tiers.length - 1];
  }, [matchSuccessCount]);

  const onLogout = () => {
    try {
      localStorage.removeItem("lf_token");
      sessionStorage.removeItem("lf_token");
    } catch {}
    router.replace("/auth");
  };

  return (
    <main className="lf-page lf-profile" aria-live="polite">
      <section className="lf-hero">
        <div className="lf-container">
          <p className="lf-hero-sub">내 정보</p>
          <h1 className="lf-hero-title">내 정보</h1>
          <p className="lf-hero-desc">프로필과 통계를 확인하세요.</p>
        </div>
      </section>

      <div className="lf-container" style={{ marginTop: "20px" }}>
        <header className="lf-profile-header lf-card" role="banner" aria-label="프로필 헤더">
          <div className="lf-profile-avatar" aria-hidden="true">
            <User size={28} />
          </div>
          <div className="lf-profile-meta">
            {loading ? (
              <>
                <div className="skel-line w1" />
                <div className="skel-line w2" />
              </>
            ) : error ? (
              <>
                <h1 className="lf-profile-name">불러오기 실패</h1>
                <p className="lf-profile-sub">다시 시도해 주세요.</p>
              </>
            ) : (
              <>
                <h1 className="lf-profile-name">{profile?.name}님</h1>
                <p className="lf-profile-sub">가입일 {profile?.joined_at}</p>
                <div className="lf-profile-tier">
                  <div className="lf-profile-tier-name">{currentTier.title}</div>
                  <p className="lf-profile-rep" aria-label={`현재 등급: ${currentTier.title}, 별 ${currentTier.stars}/5`}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Star key={i} size={16} className={i < currentTier.stars ? "is-on" : ""} />
                    ))}
                    <span className="sr-only">등급</span>
                  </p>
                  <p className="lf-profile-sub" style={{ color: "#64748b" }}>
                    {currentTier.lines.filter(Boolean).join(" · ")}
                  </p>
                </div>
              </>
            )}
          </div>
        </header>

        {/* 통계 3칸: 등록 / 보관중 / 매칭성공(=반환 완료) */}
        <section className="lf-profile-stats">
          <div className="lf-grid-3">
            {["등록", "보관중", "매칭성공"].map((label, idx) => (
              <article key={label} className="lf-stat" aria-label={`통계 ${label}`}>
                {loading ? (
                  <>
                    <div className="skel-line w1" style={{ height: 24 }} />
                    <div className="skel-line w2" />
                  </>
                ) : (
                  <>
                    <div className="lf-stat-value">
                      {idx === 0 && profile?.stats.registered}
                      {idx === 1 && (profile?.stats.stored ?? 0)}
                      {idx === 2 && profile?.stats.handed_over}
                    </div>
                    <div className="lf-stat-label">{label}</div>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* 안내 */}
        <section className="lf-card lf-profile-info section" aria-label="안내">
          <div className="lf-section-title">안내</div>
          <div className="lf-info-grid">
            <div className="lf-info-item">
              <Settings size={18} />
              <div>
                <div className="tit">개인정보/보안</div>
                <p className="txt">개인정보는 안전하게 보호되며 위치는 반환 완료 시에만 표시됩니다.</p>
              </div>
            </div>
            <div className="lf-info-item">
              <BadgeCheck size={18} />
              <div>
                <div className="tit">설정 & 고객지원</div>
                <p className="txt">FAQ와 업데이트는 설정 페이지에서 확인하세요.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 업적 */}
        <section className="lf-card lf-profile-badges section" aria-label="업적">
          <div className="lf-section-title">업적</div>
          {loading ? (
            <div className="lf-badges">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="lf-badge-card skel" />
              ))}
            </div>
          ) : (
            <div className="lf-badges">
              {achievements.map((a) => (
                <article
                  key={a.threshold}
                  className={`lf-badge-card ${a.unlocked ? "is-on" : "is-off"} ${a.tone}`}
                  aria-label={a.title}
                >
                  <div className="ico">
                    {a.threshold >= 10 ? <ShieldCheck size={18} /> : <Search size={18} />}
                  </div>
                  <div className="name">{a.title}</div>
                  <div className="desc">{a.lines[0]}</div>
                  <div className="desc" style={{ color: "#94a3b8" }}>{a.lines[1]}</div>
                  <div className="lf-badge-stars" aria-hidden="true">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < (a.unlocked ? (a.threshold >= 10 ? 4 : a.threshold >= 7 ? 3 : a.threshold >= 5 ? 2 : 1) : 0) ? "is-on" : ""}
                      />
                    ))}
                  </div>
                  <div className="lf-badge-progress">
                    {a.unlocked ? "획득 완료" : `남은 횟수: ${a.needed} (성공 ${matchSuccessCount}회)`}
                  </div>
                  {!a.unlocked && (
                    <div className="lf-badge-lock" aria-hidden="true">
                      <Lock size={14} />
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* 로그아웃 */}
        <section className="lf-profile-logout section" aria-label="로그아웃">
          <button className="lf-btn-danger" onClick={onLogout} aria-label="로그아웃">
            <LogOut size={18} /> 로그아웃
          </button>
        </section>

        <div style={{ height: 76 }} aria-hidden="true" />
      </div>

      {/* TabBar */}
      <footer className="lf-tabbar" role="navigation" aria-label="하단 내비게이션">
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
          <Link href="/me/profile" className="lf-tab lf-tab-active" aria-current="page" aria-label="내 정보">
            <User size={18} />
            <span>내 정보</span>
          </Link>
          <Link href="/search" className="lf-tab" aria-label="검색">
            <Search size={18} />
            <span>검색</span>
          </Link>
        </div>
      </footer>
    </main>
  );
}
