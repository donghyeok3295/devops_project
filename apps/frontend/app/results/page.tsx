'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, PlusCircle, Bell, User, Search } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
const AI_BASE = process.env.NEXT_PUBLIC_AI_BASE || 'http://203.234.62.47:9000';

type ResultItem = {
  id: number;
  name: string;
  brand?: string | null;
  color?: string | null;
  category?: string | null;
  stored_place?: string | null;
  photos?: Array<{ url: string }>;
  thumb_url?: string | null;
  created_at?: string | null;
  score?: number;
  reason?: string;
};

type SortKey = 'score' | 'recent';

export default function ResultsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const q = sp.get('q') || '';
  const sortParam = (sp.get('sort') as SortKey) || 'score';

  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [items, setItems]   = useState<ResultItem[]>([]);
  const [sort, setSort]     = useState<SortKey>(sortParam);

  // --- AI 서버 직접 호출 ---
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    if (!q.trim()) {
      setItems([]);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        console.log('🔍 AI 검색 시작:', q);
        
        // 🔹 프론트에서 AI 서버로 직접 전송
        const res = await fetch(`${AI_BASE}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Token': 'dev-internal-secret'
          },
          body: JSON.stringify({
            query_text: q
          })
        });
        
        if (!res.ok) {
          console.error('AI 서버 응답 오류:', res.status);
          throw new Error(`AI 서버 오류: ${res.status}`);
        }

        const data = await res.json();
        console.log('✅ AI 결과:', data);

        if (!alive) return;
        
        // AI 서버 응답 형식: { results: [{item_id, name, brand, color, score, reason, photos, ...}] }
        const items = data.results || [];
        
        // AI 응답을 결과 형식으로 변환
        const mapped: ResultItem[] = items.map((item: any) => ({
          id: item.item_id || item.id,
          name: item.name,
          brand: item.brand,
          color: item.color,
          category: item.category,
          stored_place: item.stored_place,
          photos: item.photos || [],
          thumb_url: item.thumb_url || item.photos?.[0]?.url,
          created_at: item.created_at,
          score: item.score,
          reason: item.reason,
        }));

        setItems(mapped);
        setLoading(false);
      } catch (e) {
        console.error('❌ AI 검색 실패:', e);
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'AI 검색 실패');
        setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [q]);

  // 정렬
  const sorted = useMemo(() => {
    const arr = [...items];
    if (sort === 'recent') {
      arr.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sort === 'score') {
      // 점수 높은 순으로 정렬
      arr.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    return arr;
  }, [items, sort]);

  const isEmpty = !loading && !error && sorted.length === 0;

  // URL 동기화(선택)
  useEffect(() => {
    const params = new URLSearchParams(Array.from(sp.entries()));
    params.set('sort', sort);
    router.replace(`/results?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  return (
    <main className="lf-page">
      {/* Hero */}
      <section className="lf-hero">
        <div className="lf-container">
          <p className="lf-hero-sub">검색 결과</p>
          <h1 className="lf-hero-title">"{q || '키워드 없음'}"의 결과</h1>
          <p className="lf-hero-desc">검색된 분실물 목록입니다</p>
        </div>
      </section>

      <div className="lf-wrap" style={{ marginTop: '-80px', paddingBottom: '100px' }}>

        {/* 헤더 */}
        <section className="lf-header">
          <div className="lf-headerRow">

            <div className="lf-toolbar">
              <label htmlFor="sort" className="lf-sortLabel">정렬</label>
              <select
                id="sort"
                aria-label="정렬 기준 선택"
                className="lf-select"
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
              >
                <option value="score">유사도 점수순</option>
                <option value="recent">최신순</option>
              </select>
            </div>
          </div>
        </section>

        {/* 리스트 */}
        <section className="lf-list">
          {loading && (
            <>
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </>
          )}

          {error && (
            <div role="alert" className="lf-alert">
              {error} <button className="lf-linkBtn" onClick={() => location.reload()}>재시도</button>
            </div>
          )}

          {isEmpty && (
            <div className="lf-empty">
              결과가 없습니다. 검색어를 더 구체화해보세요.
            </div>
          )}

          {!loading && !error && sorted.map(it => (
            <Card key={it.id} item={it} />
          ))}
        </section>

      </div>

      {/* 하단 TabBar */}
      <nav className="lf-tabbar" aria-label="하단 탭바">
        <div className="lf-tabbar-inner">
          <Link href="/" className="lf-tab" aria-label="홈">
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
          <Link href="/search" className="lf-tab lf-tab-active" aria-label="검색">
            <Search size={18} />
            <span>검색</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}

/* ---------- 내부 Card + Skeleton (글로벌 클래스 사용) ---------- */

function Card({ item }: { item: ResultItem }) {
  const href = `/items/${item.id}`;
  
  // 사진 URL 결정
  const imageUrl = item.thumb_url || item.photos?.[0]?.url;
  
  return (
    <article className="lf-card">
      <Link href={href} className="lf-cardLink" aria-label={`${item.name} 상세 보기`} />
      <div className="lf-cardRow">
        <div className="lf-media">
          {imageUrl
            ? <img src={imageUrl} alt={item.name} />
            : <span>No Image</span>}
        </div>

        <div className="lf-cardBody">
          <div className="lf-cardHead">
            <h3 className="lf-cardTitle">{item.name}</h3>
            {typeof item.score === 'number' && (
              <span className="lf-score">{Math.round(item.score)}점</span>
            )}
          </div>

          <div className="lf-chips">
            {item.brand && <span className="lf-chip">{item.brand}</span>}
            {item.color && <span className="lf-chip">{item.color}</span>}
            {item.category && <span className="lf-chip">{item.category}</span>}
            {item.stored_place && <span className="lf-chip">보관: {item.stored_place}</span>}
          </div>

          {item.reason && (
            <p className="lf-reason">
              <span className="lf-reasonLabel">매칭 근거</span>
              <span className="lf-twoLine">{item.reason}</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="lf-skel">
      <div className="lf-skelRow">
        <div className="lf-skelThumb" />
        <div className="lf-skelCol">
          <div className="lf-skelLine lf-big" />
          <div className="lf-skelLine lf-m" />
          <div className="lf-skelLine lf-s" />
          <div className="lf-skelLine" />
        </div>
      </div>
    </div>
  );
}
