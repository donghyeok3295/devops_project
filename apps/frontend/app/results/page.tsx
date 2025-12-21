"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, PlusCircle, Bell, User, Search } from "lucide-react";

const AI_BASE = process.env.NEXT_PUBLIC_AI_BASE || "http://localhost:9000";

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

type SortKey = "score" | "recent";

export default function ResultsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const qRaw = sp.get("q") || "";
  const q = qRaw.trim().replace(/\s+/g, " ");
  const force = sp.get("force") === "1";
  const sortParam = (sp.get("sort") as SortKey) || "score";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [sort, setSort] = useState<SortKey>(sortParam);

  const cacheKey = useMemo(() => `lf_search_cache::${q}`, [q]);

  // AI 서버 호출
  useEffect(() => {
    let alive = true;

    if (!q.trim()) {
      setError(null);
      setItems([]);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setError(null);

        // 캐시 복원 (force가 아닐 때만)
        if (!force && typeof window !== "undefined") {
          try {
            const raw = sessionStorage.getItem(cacheKey);
            if (raw) {
              const parsed = JSON.parse(raw) as { q?: string; results?: unknown; createdAt?: unknown };
              const createdAtRaw = parsed.createdAt;
              let createdAt =
                typeof createdAtRaw === "number"
                  ? createdAtRaw
                  : typeof createdAtRaw === "string"
                    ? Number(createdAtRaw)
                    : NaN;
              if (!Number.isFinite(createdAt)) createdAt = Date.now();
              const notExpired = Date.now() - createdAt <= 20 * 60 * 1000;
              if (notExpired && Array.isArray(parsed.results)) {
                if (!alive) return;
                setItems(parsed.results as ResultItem[]);
                setLoading(false);
                return; // 검색 API 호출 금지
              }
            }
          } catch {
            // 캐시 파싱 실패 시 무시하고 재검색
          }
        }

        setLoading(true);
        const res = await fetch(`${AI_BASE}/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": "dev-internal-secret",
          },
          body: JSON.stringify({ query_text: q }),
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => "Unknown error");
          throw new Error(`AI 서버 오류 ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        if (!alive) return;

        const results = data.results || [];
        const mapped: ResultItem[] = results.map((item: any, index: number) => ({
          id: item.item_id || item.id || index + 1000,
          name: item.name || "이름 없음",
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

        // 캐시 저장
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ q, results: mapped, createdAt: Date.now() }));
          } catch {
            // storage 제한 등은 무시
          }
        }

        setItems(mapped);

        // 재검색(force=1)로 진입한 경우, 검색 성공 후 force를 URL에서 제거(선택)
        if (force) {
          const params = new URLSearchParams(Array.from(sp.entries()));
          params.delete("force");
          params.set("q", q);
          router.replace(`/results?${params.toString()}`);
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "AI 검색 실패");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, force, cacheKey]);

  // 정렬
  const sorted = useMemo(() => {
    const arr = [...items];
    if (sort === "recent") {
      arr.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
    } else {
      arr.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    return arr;
  }, [items, sort]);

  const top = useMemo(() => sorted.slice(0, 5), [sorted]);
  const isEmpty = !loading && !error && sorted.length === 0;

  // 정렬값을 URL에 반영
  useEffect(() => {
    const params = new URLSearchParams(Array.from(sp.entries()));
    params.set("sort", sort);
    if (q) params.set("q", q);
    router.replace(`/results?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  return (
    <main className="lf-page">
      {/* Hero */}
      <section className="lf-hero">
        <div className="lf-container">
          <p className="lf-hero-sub">검색 결과</p>
          <h1 className="lf-hero-title">"{q || "검색어 없음"}"의 결과</h1>
          <p className="lf-hero-desc">검색된 분실물 목록입니다</p>
        </div>
      </section>

      <div className="lf-wrap" style={{ marginTop: "-80px", paddingBottom: "100px" }}>
        {/* 헤더 */}
        <section className="lf-header">
          <div className="lf-headerRow">
            <div className="lf-toolbar">
              <label htmlFor="sort" className="lf-sortLabel">
                정렬
              </label>
              <select
                id="sort"
                aria-label="정렬 기준 선택"
                className="lf-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="score">유사도 점수순</option>
                <option value="recent">최신순</option>
              </select>
              <button
                type="button"
                className="lf-btn ghost"
                onClick={() => {
                  const trimmed = q.trim();
                  if (!trimmed) return;
                  const params = new URLSearchParams(Array.from(sp.entries()));
                  params.set("q", trimmed);
                  params.set("force", "1");
                  router.push(`/results?${params.toString()}`);
                }}
                aria-label="재검색"
              >
                재검색
              </button>
            </div>
          </div>
        </section>

        {/* 리스트 */}
        <section className="lf-list">
          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {error && (
            <div role="alert" className="lf-alert">
              {error}{" "}
              <button className="lf-linkBtn" onClick={() => location.reload()}>
                재시도
              </button>
            </div>
          )}

          {isEmpty && <div className="lf-empty">결과가 없습니다. 검색어를 더 구체화해보세요.</div>}

          {!loading && !error && top.map((it) => <Card key={it.id} item={it} query={q} />)}
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

/* ---------- Card + Skeleton ---------- */

function Card({ item, query }: { item: ResultItem; query: string }) {
  const href = `/items/${item.id}?from=search&q=${encodeURIComponent(query)}`;

  const imageUrl = item.thumb_url || item.photos?.[0]?.url;
  const numericScore = typeof item.score === "number" ? item.score : Number(item.score ?? NaN);
  const hasScore = Number.isFinite(numericScore);
  const displayScore = hasScore ? Math.round(numericScore <= 1 ? numericScore * 100 : numericScore) : null;

  return (
    <article className="lf-card">
      <Link href={href} className="lf-cardLink" aria-label={`${item.name} 상세 보기`} />
      <div className="lf-cardRow">
        <div className="lf-media">
          {imageUrl ? <img src={imageUrl} alt={item.name} /> : <span>No Image</span>}
        </div>

        <div className="lf-cardBody">
          <div className="lf-cardHead">
            <h3 className="lf-cardTitle">{item.name}</h3>
            {hasScore && <span className="lf-score">유사도 {displayScore}%</span>}
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
