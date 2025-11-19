'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Bell, MapPin, ShieldCheck, BadgeCheck, User, Settings, Sparkles, Star, Home, PlusCircle, Search } from 'lucide-react'
import { getMyProfile, getMyStats } from '@/lib/api'

type Profile = {
  name: string
  role: 'SEEKER' | 'FINDER'
  joined_at: string
  reputation: number // 0~5
  stats: {
    registered: number
    matched: number
    claims: number
    handed_over: number
  }
  badges: Array<{ id: string; label: string; desc: string }>
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export default function MeProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 토글(로컬 UI 상태만)
  const [notifOn, setNotifOn] = useState(true)
  const [locOn, setLocOn] = useState(false)

  const [profile, setProfile] = useState<Profile | null>(null)

  // 임시: 토큰 확인(없으면 로그인 유도)
  function getToken() {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('lf_token') || sessionStorage.getItem('lf_token')
  }

  // 실제 API 연결
  async function fetchProfile(): Promise<Profile> {
    try {
      const [profileData, statsData] = await Promise.all([
        getMyProfile(),
        getMyStats(),
      ]);

      // 가입일 포맷팅
      let joinedDate = '알 수 없음';
      if (profileData.created_at) {
        try {
          const date = new Date(profileData.created_at);
          joinedDate = date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          console.error('날짜 파싱 실패:', e);
        }
      }

      return {
        name: profileData.email.split('@')[0], // 이메일에서 이름 추출
        role: 'FINDER', // 모든 사용자가 FINDER
        joined_at: joinedDate,
        reputation: 4, // TODO: 평점 기능 추가 필요
        stats: {
          registered: statsData.total || 0,
          matched: 0, // TODO: 매칭 성공 카운트 추가 필요
          claims: 0, // TODO: 클레임 기능 추가 필요
          handed_over: statsData.handed_over || 0,
        },
        badges: [], // TODO: 업적 기능 추가 필요
      };
    } catch (e) {
      console.error('프로필 불러오기 실패:', e);
      throw new Error('프로필을 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    const token = getToken()
    if (!token) {
      // 로그인 필요 – UI만이므로 바로 이동
      router.push('/auth')
      return
    }
    setLoading(true)
    setError(null)
    fetchProfile()
      .then(setProfile)
      .catch((e) => setError(e.message || '불러오기 실패'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const roleLabel = useMemo(() => (profile?.role === 'FINDER' ? '습득자' : '분실자'), [profile?.role])

  const onToggleRole = () => {
    // UI 데모용: 토글만 바꿔줌 (실제에선 PATCH /me/role)
    if (!profile) return
    const next = profile.role === 'FINDER' ? 'SEEKER' : 'FINDER'
    setProfile({ ...profile, role: next })
  }

  const onLogout = () => {
    try { localStorage.removeItem('lf_token'); sessionStorage.removeItem('lf_token') } catch {}
    router.replace('/auth')
  }

  return (
    <main className="lf-page lf-profile" aria-live="polite">
      {/* Hero (파란색 상단바) */}
      <section className="lf-hero">
        <div className="lf-container">
          <p className="lf-hero-sub">내 정보</p>
          <h1 className="lf-hero-title">내 정보</h1>
          <p className="lf-hero-desc">프로필과 통계를 확인하세요</p>
        </div>
      </section>

      <div className="lf-container" style={{ marginTop: '20px' }}>
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
                <p className="lf-profile-sub">다시 시도해주세요.</p>
              </>
            ) : (
              <>
                <h1 className="lf-profile-name">{profile?.name}님</h1>
                <p className="lf-profile-sub">
                  역할 <span className="lf-role-chip">{roleLabel}</span> · 가입일 {profile?.joined_at}
                </p>
                <p className="lf-profile-rep" aria-label={`신뢰도 별점 ${profile?.reputation}점`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className={i < (profile?.reputation ?? 0) ? 'is-on' : ''} />
                  ))}
                  <span className="sr-only">신뢰도</span>
                </p>
              </>
            )}
          </div>
        </header>

        {/* 통계 4칸 */}
        <section className="lf-profile-stats">
          <div className="lf-grid-4">
            {['등록', '성공 매칭', '클레임 접수', '반환 완료'].map((label, idx) => (
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
                      {idx === 1 && profile?.stats.handed_over}
                      {idx === 2 && profile?.stats.claims}
                      {idx === 3 && profile?.stats.handed_over}
                    </div>
                    <div className="lf-stat-label">{label}</div>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>

       

        {/* 설정(알림/위치 토글) */}
        <section className="lf-card lf-profile-settings section" aria-label="설정">
          <div className="lf-section-title">설정</div>
          <ul className="lf-setting-list">
            <li className="lf-setting-row">
              <div className="lf-setting-left">
                <Bell size={18} /> 알림
              </div>
              <button
                className={`lf-toggle ${notifOn ? 'is-on' : ''}`}
                onClick={() => setNotifOn(v => !v)}
                aria-pressed={notifOn}
                aria-label="알림 토글"
              >
                <span className="knob" />
              </button>
            </li>
            <li className="lf-setting-row">
              <div className="lf-setting-left">
                <MapPin size={18} /> 위치 서비스
              </div>
              <button
                className={`lf-toggle ${locOn ? 'is-on' : ''}`}
                onClick={() => setLocOn(v => !v)}
                aria-pressed={locOn}
                aria-label="위치 서비스 토글"
              >
                <span className="knob" />
              </button>
            </li>
          </ul>
        </section>

        {/* 개인정보 보호/도움말 */}
        <section className="lf-card lf-profile-info section" aria-label="안내">
          <div className="lf-section-title">안내</div>
          <div className="lf-info-grid">
            <div className="lf-info-item">
              <Settings size={18} />
              <div>
                <div className="tit">개인정보/보안</div>
                <p className="txt">개인정보는 암호화되어 저장되고, 위치는 반올림 좌표로 표시됩니다.</p>
              </div>
            </div>
            <div className="lf-info-item">
              <BadgeCheck size={18} />
              <div>
                <div className="tit">도움말 & 앱 정보</div>
                <p className="txt">FAQ와 업데이트 내역은 설정 페이지에서 확인할 수 있어요.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 업적(뱃지) */}
        <section className="lf-card lf-profile-badges section" aria-label="업적">
          <div className="lf-section-title">업적</div>
          {loading ? (
            <div className="lf-badges">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="lf-badge-card skel" />
              ))}
            </div>
          ) : (profile?.badges?.length ?? 0) === 0 ? (
            <p className="lf-empty">아직 업적이 없습니다.</p>
          ) : (
            <div className="lf-badges">
              {profile!.badges.map(b => (
                <article key={b.id} className="lf-badge-card" aria-label={b.label}>
                  <div className="ico"><Sparkles size={18} /></div>
                  <div className="name">{b.label}</div>
                  <div className="desc">{b.desc}</div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* 하단 로그아웃 */}
        <section className="lf-profile-logout section" aria-label="로그아웃">
          <button className="lf-btn-danger" onClick={onLogout} aria-label="로그아웃">
            <LogOut size={18} /> 로그아웃
          </button>
        </section>

        {/* 여백(고정 탭바와 간섭 방지) */}
        <div style={{ height: 76 }} aria-hidden="true" />
      </div>

      {/* 하단 TabBar */}
      <footer className="lf-tabbar" role="navigation" aria-label="하단 탭바">
        <div className="lf-tabbar-inner">
          <Link href="/" className="lf-tab" aria-label="홈">
            <Home size={18} />
            <span>홈</span>
          </Link>
          <Link href="/items/new" className="lf-tab" aria-label="분실물 등록">
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
  )
}
