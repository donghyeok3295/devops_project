'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2, Clock3, AlertTriangle, Home, PlusCircle, User, Search } from 'lucide-react';
import { getMyStats, getMyActivities } from '@/lib/api';

type ActivityType = 'ALL' | 'REGISTERED' | 'RETURNED';
type Badge = 'DONE' | 'ONGOING' | 'REJECTED';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  desc?: string;
  ago: string;
  badge: Badge;
  icon: 'BELL' | 'CHECK' | 'CLOCK' | 'WARN';
  status?: string; // 서버에서 내려올 수 있는 상태 필드 (예: STORED / HANDED_OVER)
}

// UI용 더미
const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: 'a1', type: 'REGISTERED', title: '분실물 등록', desc: '지갑 브라운 색상', ago: '2시간 전', badge: 'ONGOING', icon: 'CLOCK' },
  { id: 'a3', type: 'RETURNED', title: '반환 완료 처리', desc: '무선 이어폰 화이트', ago: '오늘', badge: 'DONE', icon: 'CHECK' },
];

function StatusBadge({ status }: { status: Badge }) {
  const label = status === 'DONE' ? '완료' : status === 'ONGOING' ? '진행중' : '거절';
  return (
    <span
      className={
        'lf-badge-chip ' +
        (status === 'DONE'
          ? 'lf-badge-done'
          : status === 'ONGOING'
          ? 'lf-badge-ongoing'
          : 'lf-badge-reject')
      }
      aria-label={`상태: ${label}`}
    >
      {label}
    </span>
  );
}

function RoundIcon({ kind }: { kind: ActivityItem['icon'] }) {
  const common = 'lf-icon-wrap';
  if (kind === 'CHECK') return <span className={common}><CheckCircle2 size={20} aria-hidden /></span>;
  if (kind === 'CLOCK') return <span className={common}><Clock3 size={20} aria-hidden /></span>;
  if (kind === 'WARN')  return <span className={common}><AlertTriangle size={20} aria-hidden /></span>;
  return <span className={common}><Bell size={20} aria-hidden /></span>;
}

// 문자열 정리: enum/중복 라벨 제거
function normalizeActivityText(raw: string) {
  return raw
    .replace(/ItemStatus\.[A-Z_]+/g, '')
    .replace(/반환 완료/g, '반환')
    .replace(/\s+/g, ' ')
    .trim();
}

// 등록/반환 라벨 결정
function pickActionLabel(a: ActivityItem): '등록' | '반환' {
  const s = (a.status || a.badge || '').toString().toUpperCase();
  if (s.includes('STORED') || s.includes('REGISTERED')) return '등록';
  if (s.includes('HANDED_OVER') || s.includes('RETURNED') || s.includes('DONE')) return '반환';
  const raw = `${a.title || ''} ${a.desc || ''}`;
  if (raw.includes('반환')) return '반환';
  return '등록';
}

// 최종 타이틀 포맷: "<정리된 제목> — 등록/반환"
function formatActivityTitle(a: ActivityItem) {
  const base = a.desc ? a.desc.split(' ·')[0] : a.title || '';
  const cleaned = normalizeActivityText(base);
  const action = pickActionLabel(a);
  const deduped = cleaned
    .replace(/등록/g, '')
    .replace(/반환/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return deduped ? `${deduped} — ${action}` : action;
}

export default function ActivityPage() {
  const [tab, setTab] = useState<ActivityType>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [activitiesData, setActivitiesData] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [stats, activities] = await Promise.all([
          getMyStats().catch(() => null),
          getMyActivities().catch(() => []),
        ]);
        if (!mounted) return;
        setStatsData(stats);
        setActivitiesData(activities || []);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : '활동을 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => {
    if (statsData) {
      return {
        total: statsData.total || 0,
        done: statsData.handed_over || 0,
        ongoing: statsData.stored || 0,
      };
    }
    return { total: MOCK_ACTIVITIES.length, done: 0, ongoing: 0 };
  }, [statsData]);

  const filtered = useMemo(() => {
    const data = activitiesData.length > 0 ? activitiesData : MOCK_ACTIVITIES;
    if (tab === 'ALL') return data;

    if (tab === 'REGISTERED') {
      return data.filter((a: any) => a.badge === 'ONGOING' || a.status === 'STORED');
    }
    if (tab === 'RETURNED') {
      return data.filter((a: any) => a.badge === 'DONE' || a.status === 'HANDED_OVER');
    }
    return data.filter(a => a.type === tab);
  }, [tab, activitiesData]);

  return (
    <main className="lf-page lf-activity">
      {/* Hero */}
      <section className="lf-hero">
        <div className="lf-container">
          <p className="lf-hero-sub">내 정보 &gt; 내 활동</p>
          <h1 className="lf-hero-title">내 활동</h1>
          <p className="lf-hero-desc">등록한 분실물의 활동 기록을 확인하세요.</p>
        </div>
      </section>

      {/* 요약 3칸 */}
      <section className="lf-container" aria-label="활동 요약" style={{ marginTop: '-20px', paddingTop: '20px' }}>
        <div className="lf-grid-3">
          <div className="lf-stat" role="status" aria-label={`전체 ${stats.total}건`}>
            <div className="lf-stat-value">{loading ? '···' : stats.total}</div>
            <div className="lf-stat-label">전체 등록</div>
          </div>
          <div className="lf-stat" role="status" aria-label={`등록 ${stats.ongoing}건`}>
            <div className="lf-stat-value">{loading ? '···' : stats.ongoing}</div>
            <div className="lf-stat-label">보관 중</div>
          </div>
          <div className="lf-stat" role="status" aria-label={`반환 ${stats.done}건`}>
            <div className="lf-stat-value">{loading ? '···' : stats.done}</div>
            <div className="lf-stat-label">반환 완료</div>
          </div>
        </div>
      </section>

      {/* 활동 리스트 */}
      <section className="lf-container lf-card" aria-live="polite" style={{ marginTop: 8, marginBottom: 88 }}>
        <div className="lf-list-head">
          <nav className="lf-activity-tabs" aria-label="활동 필터">
            {(['ALL', 'REGISTERED', 'RETURNED'] as ActivityType[]).map(k => (
              <button
                key={k}
                className={'lf-activity-tab' + (tab === k ? ' is-active' : '')}
                onClick={() => setTab(k)}
                aria-pressed={tab === k}
                aria-label={k === 'ALL' ? '전체' : k === 'REGISTERED' ? '등록' : '반환'}
              >
                {k === 'ALL' ? '전체' : k === 'REGISTERED' ? '등록' : '반환'}
              </button>
            ))}
          </nav>
        </div>

        {/* 로딩 */}
        {loading && (
          <ul className="lf-activity-list" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="lf-activity-item skel">
                <div className="skel-ico" />
                <div className="skel-col">
                  <div className="skel-line w1" />
                  <div className="skel-line w2" />
                </div>
                <div className="skel-badge" />
              </li>
            ))}
          </ul>
        )}

        {/* 오류 */}
        {!loading && error && (
          <div className="lf-alert" role="alert">
            <span>활동을 불러오지 못했습니다.</span>
            <button
              className="lf-alert-btn"
              onClick={() => {
                setLoading(true);
                setError(null);
                setTimeout(() => setLoading(false), 650);
              }}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 비어있음 */}
        {!loading && !error && filtered.length === 0 && (
          <div className="lf-empty" role="status">
            <div className="lf-empty-ico" aria-hidden />
            <p>활동이 없습니다.</p>
            <Link className="lf-empty-link" href="/items/new" aria-label="분실물 등록하러 가기">
              분실물 등록하러 가기
            </Link>
          </div>
        )}

        {/* 리스트 */}
        {!loading && !error && filtered.length > 0 && (
          <ul className="lf-activity-list" role="list">
            {filtered.map(a => (
              <li key={a.id} className="lf-activity-item">
                <RoundIcon kind={a.icon} />
                <div className="lf-activity-main">
                  <div className="lf-activity-title">{formatActivityTitle(a)}</div>
                  {a.desc && <div className="lf-activity-desc">{a.desc}</div>}
                  <div className="lf-activity-time" aria-label={`발생 시점 ${a.ago}`}>{a.ago}</div>
                </div>
                <StatusBadge status={a.badge} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 하단 TabBar */}
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
          <Link href="/me/activity" className="lf-tab lf-tab-active" aria-current="page" aria-label="내 활동">
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
      </footer>
    </main>
  );
}
