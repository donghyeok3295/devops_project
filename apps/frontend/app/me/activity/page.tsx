'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2, Clock3, AlertTriangle, Home, PlusCircle, User, Search } from 'lucide-react';

/**
 * Smart Lost&Found — 내 활동(/me/activity) — UI Only
 * - 상단 통계 3~4칸
 * - 중앙 탭(전체/등록/클레임)
 * - 활동 카드 리스트(아이콘/제목/시간/설명/상태 배지)
 * - 로딩/빈/오류 상태 가짜 시뮬레이터 포함
 */

type ActivityType = 'ALL' | 'FOUND' | 'CLAIM';
type Badge = 'DONE' | 'ONGOING' | 'REJECTED';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  desc?: string;
  ago: string;            // 예: "2시간 전"
  badge: Badge;
  icon: 'BELL' | 'CHECK' | 'CLOCK' | 'WARN';
}

// ---- 가짜 데이터 (UI 전용) ----
const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: 'a1', type: 'FOUND', title: '새 분실물 등록', desc: '지갑(브라운) — 보관 중', ago: '2시간 전', badge: 'ONGOING', icon: 'CLOCK' },
  { id: 'a2', type: 'CLAIM', title: '클레임 접수', desc: '아이폰 12 Pro 일치 검토', ago: '4시간 전', badge: 'ONGOING', icon: 'BELL' },
  { id: 'a3', type: 'FOUND', title: '반환 완료 처리', desc: '무선 이어폰 세트', ago: '어제', badge: 'DONE', icon: 'CHECK' },
  { id: 'a4', type: 'CLAIM', title: '클레임 거부', desc: '시리얼 불일치', ago: '2일 전', badge: 'REJECTED', icon: 'WARN' },
];

// ---- 배지 렌더 ----
function StatusBadge({ status }: { status: Badge }) {
  const label =
    status === 'DONE' ? '완료' :
    status === 'ONGOING' ? '진행중' : '거부';

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

// ---- 아이콘 렌더 ----
function RoundIcon({ kind }: { kind: ActivityItem['icon'] }) {
  const common = 'lf-icon-wrap';
  if (kind === 'CHECK') return <span className={common}><CheckCircle2 size={20} aria-hidden /></span>;
  if (kind === 'CLOCK') return <span className={common}><Clock3 size={20} aria-hidden /></span>;
  if (kind === 'WARN')  return <span className={common}><AlertTriangle size={20} aria-hidden /></span>;
  return <span className={common}><Bell size={20} aria-hidden /></span>;
}

export default function ActivityPage() {
  // 탭/상태
  const [tab, setTab] = useState<ActivityType>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  // UI 데모용 로딩 시뮬레이션
  useEffect(() => {
    const t = setTimeout(() => {
      // error를 보고 싶으면 아래 주석 해제
      // setError('활동을 불러오지 못했습니다.');
      setLoading(false);
    }, 650);
    return () => clearTimeout(t);
  }, []);

  const stats = useMemo(() => {
    // 간단 합산(실제 연결 시 API 응답 사용)
    const total = MOCK_ACTIVITIES.length;
    const done = MOCK_ACTIVITIES.filter(a => a.badge === 'DONE').length;
    const ongoing = MOCK_ACTIVITIES.filter(a => a.badge === 'ONGOING').length;
    const claimed = MOCK_ACTIVITIES.filter(a => a.type === 'CLAIM').length;
    return { total, done, ongoing, claimed };
  }, []);

  const filtered = useMemo(() => {
    if (tab === 'ALL') return MOCK_ACTIVITIES;
    return MOCK_ACTIVITIES.filter(a => a.type === tab);
  }, [tab]);

  return (
    <main className="lf-page lf-activity">
      {/* 헤더(간단) */}
      <header className="lf-container" style={{ paddingTop: 20, paddingBottom: 4 }}>
        <h1 className="lf-section-title" aria-label="내 활동 페이지 제목">내 활동</h1>
      </header>

      {/* 통계 4칸 */}
      <section className="lf-container" aria-label="활동 통계">
        <div className="lf-grid-4">
          <div className="lf-stat" role="status" aria-label={`전체 ${stats.total}건`}>
            <div className="lf-stat-value">{loading ? '—' : stats.total}</div>
            <div className="lf-stat-label">전체</div>
          </div>
          <div className="lf-stat" role="status" aria-label={`완료 ${stats.done}건`}>
            <div className="lf-stat-value">{loading ? '—' : stats.done}</div>
            <div className="lf-stat-label">완료</div>
          </div>
          <div className="lf-stat" role="status" aria-label={`진행중 ${stats.ongoing}건`}>
            <div className="lf-stat-value">{loading ? '—' : stats.ongoing}</div>
            <div className="lf-stat-label">진행중</div>
          </div>
          <div className="lf-stat" role="status" aria-label={`클레임 ${stats.claimed}건`}>
            <div className="lf-stat-value">{loading ? '—' : stats.claimed}</div>
            <div className="lf-stat-label">클레임</div>
          </div>
        </div>
      </section>

      {/* 탭 */}
      

      {/* 콘텐츠 영역 */}
      <section className="lf-container lf-card" aria-live="polite" style={{ marginTop: 8, marginBottom: 88 }}>

        

          <div className="lf-list-head">
    <nav className="lf-activity-tabs" aria-label="활동 유형 탭">
      {(['ALL', 'FOUND', 'CLAIM'] as ActivityType[]).map(k => (
        <button
          key={k}
          className={'lf-activity-tab' + (tab === k ? ' is-active' : '')}
          onClick={() => setTab(k)}
          aria-pressed={tab === k}
          aria-label={k === 'ALL' ? '전체' : k === 'FOUND' ? '등록' : '클레임'}
        >
          {k === 'ALL' ? '전체' : k === 'FOUND' ? '등록' : '클레임'}
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
            <button className="lf-alert-btn" onClick={() => { setLoading(true); setError(null); setTimeout(()=>setLoading(false), 650); }}>
              재시도
            </button>
          </div>
        )}

        {/* 빈 상태 */}
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
                  <div className="lf-activity-title">{a.title}</div>
                  {a.desc && <div className="lf-activity-desc">{a.desc}</div>}
                  <div className="lf-activity-time" aria-label={`발생 시각 ${a.ago}`}>{a.ago}</div>
                </div>
                <StatusBadge status={a.badge} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 하단 TabBar (단독 페이지에서도 보이도록 내부 포함) */}
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
