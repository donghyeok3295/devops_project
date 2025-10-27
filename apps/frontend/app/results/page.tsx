'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type ResultItem = {
  id: number | string;
  imageUrl?: string | null;
  name: string;
  brand?: string | null;
  color?: string | null;
  storedPlace?: string | null;
  reasonText?: string | null;
  score?: number | null;
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

  // --- 데모 목데이터 (LLM/BE 붙일 때 fetch로 교체) ---
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const mock: ResultItem[] = [
      { id: 101, imageUrl: '/icons/apple.png', name: '아이폰 12 Pro', brand: 'Apple', color: '실버', storedPlace: '공대 1호관 안내데스크', reasonText: '설명에 “아이폰 12, 실버, 케이스 없음”과 일치', score: 96 },
      { id: 102, imageUrl: null,                 name: '지갑',         brand: 'MCM',   color: '브라운', storedPlace: '도서관 2층 사서실',   reasonText: '브랜드, 색상, 위치가 유사',                  score: 92 },
      { id: 103, imageUrl: '/icons/headset.png', name: '무선 헤드셋',  brand: 'Sony',  color: '블랙',   storedPlace: '체육관 분실물 보관함', reasonText: '카테고리/색상 동일, 시간대 근접',            score: 88 },
      { id: 104, imageUrl: '/icons/bag.png',     name: '크로스백',     brand: 'Nike',  color: '블랙',   storedPlace: '학생회관 안내',        reasonText: '색상 일치, 부속품(스트랩) 언급',            score: 84 },
      { id: 105, imageUrl: '/icons/book.png',    name: '강의노트',     brand: null,    color: '파랑',   storedPlace: '공대 2호관 203호',     reasonText: '제목 키워드, 색상 일부 일치',               score: 80 },
    ];

    const t = setTimeout(() => {
      if (!alive) return;
      setItems(mock);
      setLoading(false);
    }, 300);

    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  // 정렬
  const sorted = useMemo(() => {
    const arr = [...items];
    if (sort === 'score') arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    else arr.sort((a, b) => Number(b.id) - Number(a.id));
    return arr.slice(0, 5);
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
    <main className="lf-bg">
      <div className="lf-wrap">

        {/* 헤더 */}
        <section className="lf-header">
          <p className="lf-kicker">검색어</p>

          <div className="lf-headerRow">
            <h1 className="lf-title">“{q || '키워드 없음'}”의 Top 5 결과</h1>

            <div className="lf-toolbar">
              <label htmlFor="sort" className="lf-sortLabel">정렬</label>
              <select
                id="sort"
                aria-label="정렬 기준 선택"
                className="lf-select"
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
              >
                <option value="score">AI 점수순</option>
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

        {/* 탭바 대비 하단 여백 */}
        <div className="lf-footerPad" />
      </div>
    </main>
  );
}

/* ---------- 내부 Card + Skeleton (글로벌 클래스 사용) ---------- */

function Card({ item }: { item: ResultItem }) {
  const href = `/items/${item.id}`;
  return (
    <article className="lf-card">
      <a href={href} className="lf-cardLink" aria-label={`${item.name} 상세 보기`} />
      <div className="lf-cardRow">
        <div className="lf-media">
          {item.imageUrl
            ? <img src={item.imageUrl} alt={item.name} />
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
            {item.storedPlace && <span className="lf-chip">보관: {item.storedPlace}</span>}
          </div>

          {item.reasonText && (
            <p className="lf-reason">
              <span className="lf-reasonLabel">근거</span>
              <span className="lf-twoLine">{item.reasonText}</span>
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
