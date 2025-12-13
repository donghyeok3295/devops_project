'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getMyStats, getMyActivities } from '@/lib/api'

import Link from 'next/link'
import {
  LayoutDashboard,
  PlusCircle,
  Search,
  User,
  PackageSearch,
  ListChecks,
  Home,
  Bell,
} from 'lucide-react'

// --- 환경변수 ---
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'

// --- 타입 ---
interface Stats {
  total: number
  stored: number
  handed_over: number
  online: number
}
interface ActivityItem {
  id: string | number
  icon?: 'match' | 'new' | 'search'
  title: string
  timeAgo: string
}

// 간단 fetch (게스트 허용 + 실패시 null)
async function getJSON<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      cache: 'no-store',
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** ✅ 히어로 내부 상단 네비 (좌 로고 · 우 로그인) */
// (홈 page.tsx 내부)
function HeroTopNav() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  // 토큰 상태 읽기
  const refreshAuth = useCallback(() => {
    try {
      const t =
        localStorage.getItem('lf_token') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token')
      setLoggedIn(!!t)
    } catch {
      setLoggedIn(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    refreshAuth()

    // 다른 탭/창에서 로그인/로그아웃해도 동기화
    const onStorage = (e: StorageEvent) => {
      if (!e.key || ['lf_token', 'token'].includes(e.key)) refreshAuth()
    }
    window.addEventListener('storage', onStorage)

    // 같은 탭에서 로그인 완료 시 알림 받기 (커스텀 이벤트)
    const onAuthChanged = () => refreshAuth()
    window.addEventListener('lf-auth-changed', onAuthChanged as any)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('lf-auth-changed', onAuthChanged as any)
    }
  }, [refreshAuth])

  const onLogout = () => {
    try {
      localStorage.removeItem('lf_token')
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
    } catch {}
    setLoggedIn(false)
    router.replace('/auth') // 또는 router.refresh()
  }

  return (
    <div className="lf-hero-nav">
      <Link href="/home" className="lf-hero-brand" aria-label="홈으로">
        🔍 Smart Lost & Found
      </Link>

      {/* 마운트 전엔 자리만 확보해 깜빡임 방지 */}
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
  )
}


export default function HomePage() {
  const router = useRouter()
  const [greetingName] = useState<string>('마음씨 고운 습득자님')
  const [mode] = useState<'finder' | 'seeker'>('finder')
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [pendingReturns, setPendingReturns] = useState<number>(0)
  const [pendingDelta, setPendingDelta] = useState<number>(0)
  const [showPendingAlert, setShowPendingAlert] = useState<boolean>(false)
  const [stats, setStats] = useState<Stats>({ total: 0, stored: 0, handed_over: 0, online: 0 })
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // 알림 기능 제거됨 - unread count를 0으로 설정
        if (mounted) setUnreadCount(0)

        // 로그인한 경우에는 개인 통계, 아닌 경우 전체 통계
        const token = localStorage.getItem('lf_token')
        
        let nextStats: Stats | null = null
        if (token) {
          // 로그인한 경우: 내 통계 가져오기
          try {
            console.log('Fetching my stats from:', `${API_BASE}/me/stats`)
            const token_header = localStorage.getItem('lf_token')
            const myStatsRes = await fetch(`${API_BASE}/me/stats`, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token_header}`,
              },
              credentials: 'include',
              cache: 'no-store',
            })
            console.log('My stats response status:', myStatsRes.status)
            if (!myStatsRes.ok) {
              const errorText = await myStatsRes.text()
              console.error('My stats error:', errorText)
            } else {
              const myStats = await myStatsRes.json()
              console.log('My stats data:', myStats)
              nextStats = {
                total: myStats.total || 0,
                stored: myStats.stored || 0,
                handed_over: myStats.handed_over || 0,
                online: myStats.online || 0,
              }
            }
          } catch (e) {
            console.error('Failed to fetch my stats:', e)
          }

          // 미처리 반환 요청 카운트 (등록자용)
          try {
            const pendingRes = await fetch(`${API_BASE}/me/return-requests/pending-count`, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              credentials: 'include',
              cache: 'no-store',
            })
            if (pendingRes.ok) {
              const data = await pendingRes.json()
              const count = Number(data?.count || 0)
              if (mounted) {
                setPendingReturns(count)
                // 읽음 처리 비교: delta 계산
                try {
                  const key = `lf_lastSeen_returnRequests_${(token || '').slice(0, 8) || 'anon'}`
                  const lastSeenRaw = Number(localStorage.getItem(key) || 0)
                  const lastSeen = Math.min(lastSeenRaw, count) // 감소 시 보정
                  const delta = Math.max(0, count - lastSeen)
                  setPendingDelta(delta)
                  setShowPendingAlert(delta > 0)
                } catch {
                  setPendingDelta(count)
                  setShowPendingAlert(count > 0)
                }
              }
            }
          } catch (e) {
            console.error('Failed to fetch pending return requests:', e)
          }
        }
        
        // 로그인 안 했거나 내 통계 못 가져온 경우 전체 통계 사용
        if (!nextStats) {
          const statsA = await getJSON<any>(`/items/stats`).catch(() => null)
          if (statsA && typeof statsA === 'object') {
            nextStats = {
              total: Number(statsA.total ?? statsA.items_total ?? 0),
              stored: Number(statsA.stored ?? statsA.items_stored ?? 0),
              handed_over: Number(statsA.handed ?? statsA.handed_over ?? statsA.returned ?? 0),
              online: Number(statsA.online ?? statsA.users_online ?? 0),
            }
          } else {
            const statsB = await getJSON<any>(`/stats/overview`).catch(() => null)
            if (statsB) {
              nextStats = {
                total: Number(statsB.total ?? 0),
                stored: Number(statsB.stored ?? 0),
                handed_over: Number(statsB.handed_over ?? statsB.returned ?? 0),
                online: Number(statsB.online ?? 0),
              }
            }
          }
        }
        
        console.log('Main page stats:', nextStats);
        if (mounted) setStats(nextStats ?? { total: 0, stored: 0, handed_over: 0, online: 0 })

        // 활동 가져오기 (로그인한 경우에만)
        if (token) {
          try {
            const token_header = localStorage.getItem('lf_token')
            const actsRes = await fetch(`${API_BASE}/me/activities?limit=10`, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token_header}`,
              },
              credentials: 'include',
              cache: 'no-store',
            })
            
            console.log('My activities response status:', actsRes.status)
            
            if (actsRes.ok) {
              const acts = await actsRes.json()
              console.log('Main page activities:', acts)
              
              if (mounted && acts.length > 0) {
                // 백엔드 응답을 프론트엔드 형식으로 변환
                const mappedActs = acts.map((a: any) => ({
                  id: a.id || String(Math.random()),
                  icon: a.icon === 'CLOCK' ? 'new' : a.icon === 'CHECK' ? 'match' : 'search',
                  title: a.title || a.desc || '활동',
                  timeAgo: a.ago || a.timeAgo || '방금 전',
                }))
                setActivities(mappedActs.slice(0, 3))
              } else if (mounted) {
                // 데이터가 없으면 폴백
                setActivities([
                  { id: '1', icon: 'new', title: '샘플 분실물 등록', timeAgo: '2시간 전' },
                  { id: '2', icon: 'match', title: '샘플 분실물 반환', timeAgo: '4시간 전' },
                  { id: '3', icon: 'new', title: '샘플 분실물 등록', timeAgo: '6시간 전' },
                ])
              }
            } else {
              console.error('Activities fetch failed:', await actsRes.text())
              if (mounted) {
                setActivities([
                  { id: '1', icon: 'new', title: '샘플 분실물 등록', timeAgo: '2시간 전' },
                  { id: '2', icon: 'match', title: '샘플 분실물 반환', timeAgo: '4시간 전' },
                  { id: '3', icon: 'new', title: '샘플 분실물 등록', timeAgo: '6시간 전' },
                ])
              }
            }
          } catch (e) {
            console.error('Failed to fetch activities:', e)
            if (mounted) {
              setActivities([
                { id: '1', icon: 'new', title: '샘플 분실물 등록', timeAgo: '2시간 전' },
                { id: '2', icon: 'match', title: '샘플 분실물 반환', timeAgo: '4시간 전' },
                { id: '3', icon: 'new', title: '샘플 분실물 등록', timeAgo: '6시간 전' },
              ])
            }
          }
        } else {
          // 로그인 안 했으면 폴백 데이터
          if (mounted) {
            setActivities([
              { id: '1', icon: 'new', title: '샘플 분실물 등록', timeAgo: '2시간 전' },
              { id: '2', icon: 'match', title: '샘플 분실물 반환', timeAgo: '4시간 전' },
              { id: '3', icon: 'new', title: '샘플 분실물 등록', timeAgo: '6시간 전' },
            ])
          }
        }
      } catch (e) {
        console.error('Main page data fetch error:', e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const quickActions = useMemo(
    () => [
      {
        href: '/items/new',
        title: '분실물 등록',
        desc: '사진과 위치 정보로 쉽게 등록하기',
        Icon: PlusCircle,
      },
      {
        href: '/me/items',
        title: '내 등록 목록',
        desc: '등록한 분실물 상태 확인',
        Icon: ListChecks,
      },
    ],
    [],
  )

  return (
    <div className="lf-page pb-safe">
      {/* ====== HERO (상단 네비 포함) ====== */}
      <section className="lf-hero">
        <HeroTopNav />
        <div className="lf-container pt-10">
          <p className="lf-hero-sub">{mode === 'finder' ? '' : ''}</p>
          <h1 className="lf-hero-title">안녕하세요, {greetingName}</h1>
          <p className="lf-hero-desc">분실물을 등록하여 주인을 찾아주세요</p>
        </div>
      </section>

      {/* ====== BODY ====== */}
      <main className="lf-container space-y-8" style={{ marginTop: '-60px' }}>
        {showPendingAlert && pendingDelta > 0 && (
          <section aria-label="반환 요청 알림">
            <div
              className="lf-card"
              style={{
                background: '#eef2ff',
                border: '1px solid #c7d2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '16px 18px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>알림</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                  새 반환 요청이 {pendingDelta}건 있습니다.
                </div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  등록한 분실물에 대한 요청을 확인해 주세요.
                </div>
              </div>
              <button
                className="lf-hero-login"
                style={{ minWidth: 120 }}
                onClick={() => {
                  try {
                    const token = localStorage.getItem('lf_token') || ''
                    const key = `lf_lastSeen_returnRequests_${(token || '').slice(0, 8) || 'anon'}`
                    localStorage.setItem(key, String(pendingReturns))
                  } catch {}
                  setShowPendingAlert(false)
                  router.push('/me/activity')
                }}
                aria-label="반환 요청 확인하기"
              >
                확인하기
              </button>
            </div>
          </section>
        )}
        {/* 빠른 작업 2카드 */}
        <section aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="sr-only">빠른 작업</h2>
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

        {/* 실시간 현황 3스탯 */}
        <section aria-labelledby="live-stats">
          <h2 id="live-stats" className="lf-section-title">실시간 현황</h2>
          <div className="lf-grid-3">
            <StatBox label="전체 등록" value={stats.total} />
            <StatBox label="보관 중" value={stats.stored} />
            <StatBox label="반환 완료" value={stats.handed_over} />
          </div>
        </section>

        {/* 최근 활동 */}
        <section aria-labelledby="recent-activity">
          <h2 id="recent-activity" className="lf-section-title">최근 활동</h2>
          <div className="lf-card">
            <ul className="lf-activity-list">
              {activities.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-slate-500">
                  아직 활동이 없습니다. <Link className="underline" href="/items/new">분실물 등록하러 가기</Link>
                </li>
              )}
              {activities.map((a) => (
                <li key={a.id} className="lf-activity-item">
                  <ActivityIcon kind={a.icon} />
                  <div className="flex-1">
                    <p className="lf-activity-title line-clamp-1">{a.title}</p>
                    <p className="lf-activity-time">{a.timeAgo}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* 하단 탭바 */}
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
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="lf-stat" role="status" aria-label={label}>
      <div className="lf-stat-value">{Number.isFinite(value) ? value : '-'}</div>
      <div className="lf-stat-label">{label}</div>
    </div>
  )
}

function ActivityIcon({ kind }: { kind?: ActivityItem['icon'] }) {
  const cls = 'h-5 w-5 text-slate-500'
  if (kind === 'match') return <ListChecks className={cls} />
  if (kind === 'new') return <PackageSearch className={cls} />
  return <LayoutDashboard className={cls} />
}
