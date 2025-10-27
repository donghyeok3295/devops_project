'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import Link from 'next/link'
import {
  LayoutDashboard,
  PlusCircle,
  Search,
  User,
  PackageSearch,
  ListChecks,
} from 'lucide-react'

// --- 환경변수 ---
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

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
      <Link href="/" className="lf-hero-brand" aria-label="홈으로">
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
  const [greetingName] = useState<string>('마음씨 고운 습득자님')
  const [mode] = useState<'finder' | 'seeker'>('finder')
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [stats, setStats] = useState<Stats>({ total: 0, stored: 0, handed_over: 0, online: 0 })
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const unread = await getJSON<{ count: number }>(`/notifications/unread_count`)
      if (mounted) setUnreadCount(unread?.count ?? 0)

      const statsA = await getJSON<any>(`/items/stats`)
      let nextStats: Stats | null = null
      if (statsA && typeof statsA === 'object') {
        nextStats = {
          total: Number(statsA.total ?? statsA.items_total ?? 0),
          stored: Number(statsA.stored ?? statsA.items_stored ?? 0),
          handed_over: Number(statsA.handed_over ?? statsA.returned ?? 0),
          online: Number(statsA.online ?? statsA.users_online ?? 0),
        }
      } else {
        const statsB = await getJSON<any>(`/stats/overview`)
        if (statsB) {
          nextStats = {
            total: Number(statsB.total ?? 0),
            stored: Number(statsB.stored ?? 0),
            handed_over: Number(statsB.handed_over ?? statsB.returned ?? 0),
            online: Number(statsB.online ?? 0),
          }
        }
      }
      if (mounted) setStats(nextStats ?? { total: 1247, stored: 89, handed_over: 456, online: 234 })

      const acts = await getJSON<any[]>(`/activities`)
      if (mounted) {
        if (Array.isArray(acts) && acts.length) {
          setActivities(
            acts.slice(0, 5).map((a: any, i: number) => ({
              id: a.id ?? i,
              icon: a.type === 'MATCHED' ? 'match' : a.type === 'CREATED' ? 'new' : 'search',
              title:
                a.message ||
                (a.type === 'MATCHED'
                  ? '아이폰 12 Pro 매칭 성공'
                  : a.type === 'CREATED'
                  ? '새로운 분실물 등록'
                  : '검색 요청 접수'),
              timeAgo: a.time_ago || a.created_at || '방금 전',
            })),
          )
        } else {
          setActivities([
            { id: 1, icon: 'match', title: '아이폰 12 Pro 매칭 성공', timeAgo: '2시간 전' },
            { id: 2, icon: 'new', title: '새로운 분실물 등록', timeAgo: '4시간 전' },
            { id: 3, icon: 'search', title: '검색 요청 접수', timeAgo: '6시간 전' },
          ])
        }
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
      <main className="lf-container -mt-16 space-y-8">
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

        {/* 실시간 현황 4스탯 */}
        <section aria-labelledby="live-stats">
          <h2 id="live-stats" className="lf-section-title">실시간 현황</h2>
          <div className="lf-grid-4">
            <StatBox label="전체 등록" value={stats.total} />
            <StatBox label="보관 중" value={stats.stored} />
            <StatBox label="반환 완료" value={stats.handed_over} />
            <StatBox label="온라인" value={stats.online} />
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
          <Tab href="/" label="홈" Icon={LayoutDashboard} active />
          <Tab href="/items/new" label="분실물 등록" Icon={PlusCircle} />
          <Tab href="/me/activity" label="내 활동" Icon={ListChecks} badge={unreadCount} />
          <Tab href="/me/profile" label="내 정보" Icon={User} />
          <Tab href="/search" label="검색" Icon={Search} />
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
  return <Search className={cls} />
}

function Tab({
  href, Icon, label, active, badge,
}: { href: string; Icon: any; label: string; active?: boolean; badge?: number }) {
  return (
    <Link href={href} className={`lf-tab ${active ? 'lf-tab-active' : ''}`} aria-label={label}>
      <Icon className="h-5 w-5" />
      <span className="text-[11px] leading-none">{label}</span>
      {badge && badge > 0 && <span className="lf-badge">{badge > 99 ? '99+' : badge}</span>}
    </Link>
  )
}
