'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Bell, MapPin, ShieldCheck, BadgeCheck, User, Settings, Sparkles, Star } from 'lucide-react'

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

  // ✅ 나중에 실제 API 연결 시 여기만 바꾸면 됨
  async function fetchProfile(): Promise<Profile> {
    // const token = getToken()
    // const res = await fetch(`${API_BASE}/me/profile`, {
    //   headers: token ? { Authorization: `Bearer ${token}` } : {},
    //   credentials: 'include',
    // })
    // if (!res.ok) throw new Error('프로필을 불러오지 못했습니다.')
    // return await res.json()

    // ---- UI 데모용 Mock ----
    await new Promise(r => setTimeout(r, 450))
    return {
      name: '동혁',
      role: 'FINDER',
      joined_at: '2025-09-05',
      reputation: 4,
      stats: { registered: 18, matched: 7, claims: 5, handed_over: 6 },
      badges: [
        { id: 'first', label: '첫 등록', desc: '첫 분실물 등록 완료' },
        { id: 'matcher', label: '매칭 마스터', desc: '5회 이상 매칭 성공' },
        { id: 'guardian', label: '신뢰의 수호자', desc: '반환 5회 달성' },
      ],
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
      <div className="lf-container">
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
                      {idx === 1 && profile?.stats.matched}
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
    </main>
  )
}
