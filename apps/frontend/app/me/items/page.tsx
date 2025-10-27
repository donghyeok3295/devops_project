'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ItemStatus = 'STORED' | 'CLAIMED' | 'HANDED_OVER';
interface ItemSummary {
  id: number;
  status: ItemStatus;
  created_at: string;
  thumb_url?: string | null;
  attributes: {
    category: string;
    brand?: string | null;
    color?: string | null;
  };
}

interface Pagination {
  page: number;
  size: number;
  total: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default function MyItemsPage() {
  const router = useRouter();

  const [items, setItems] = useState<ItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<'ALL' | ItemStatus>('ALL');
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // ✅ 토큰 키 통일: lf_token 사용
  const token = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem('lf_token') : null),
    []
  );

  // 공통 fetch wrapper
  async function apiGet(url: string) {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    return res.json();
  }

  // ✅ /me/items 우선 → 없으면 /items?mine=true 로 폴백
  const fetchItems = async (page = 1) => {
    if (!token) {
      setErr('로그인이 필요합니다.');
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);

    const params = new URLSearchParams({ page: String(page), size: '9' });
    if (status !== 'ALL') params.append('status', status);

    const primary = `${API_BASE}/me/items?${params.toString()}`;
    const fallback = `${API_BASE}/items?mine=true&${params.toString()}`;

    try {
      // 1) /me/items 시도
      let json: any;
      try {
        json = await apiGet(primary);
      } catch (e: any) {
        if (String(e?.message || '').startsWith('HTTP_404')) {
          // 2) /items?mine=true 로 폴백
          json = await apiGet(fallback);
        } else {
          throw e;
        }
      }

      // ✅ 다양한 응답 형태 방어적으로 처리
      //  - { data: { items, pagination } }
      //  - { items, pagination }
      //  - 직접 배열
      const dataLayer = json?.data ?? json;
      const array = Array.isArray(dataLayer) ? dataLayer : dataLayer?.items ?? [];
      const pageInfo = dataLayer?.pagination ?? null;

      setItems(array as ItemSummary[]);
      setPagination(pageInfo);
    } catch (e: any) {
      setItems([]);
      setErr(e?.message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : '목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, token]);

  // 삭제 처리 (있는 경우)
  const onDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('삭제 실패');
      // 낙관적 업데이트
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <main className="lf-page lf-me">
      {/* Hero */}
      <section className="lf-hero">
        <div className="lf-container">
          <p className="lf-hero-sub">내 정보 &gt; 등록 목록</p>
          <h1 className="lf-hero-title">내가 등록한 분실물</h1>
          <p className="lf-hero-desc">상태별로 내 등록 항목을 확인하세요.</p>
        </div>
      </section>

      {/* Body */}
      <div className="lf-container lf-me-body">
        {/* 필터 + 새로 등록 */}
        <div className="lf-card lf-me-filters" role="group" aria-label="상태 필터">
          <div className="lf-filter-pills">
            {(['ALL', 'STORED', 'CLAIMED', 'HANDED_OVER'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`lf-pill ${status === s ? 'is-active' : ''}`}
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                aria-label={`상태: ${s}`}
              >
                {s === 'ALL' && '전체'}
                {s === 'STORED' && '보관 중'}
                {s === 'CLAIMED' && '클레임 중'}
                {s === 'HANDED_OVER' && '반환 완료'}
              </button>
            ))}
          </div>
          <Link href="/items/new" className="lf-btn-primary" aria-label="새 분실물 등록">
            + 새로 등록
          </Link>
        </div>

        {/* 컨텐츠 상태별 렌더 */}
        {loading ? (
          <div className="lf-skeleton-grid" aria-busy="true" aria-live="polite">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="lf-skeleton-card" />
            ))}
          </div>
        ) : err ? (
          <div className="lf-card lf-empty" role="alert">
            <p>{err === 'UNAUTHORIZED' ? '로그인이 필요합니다.' : err}</p>
            {err === 'UNAUTHORIZED' && (
              <button className="lf-btn-primary" onClick={() => router.push('/auth')}>
                로그인 하러가기
              </button>
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="lf-card lf-empty">
            <p>등록된 분실물이 없습니다.</p>
            <Link className="lf-btn-primary" href="/items/new">
              첫 등록하기
            </Link>
          </div>
        ) : (
          <>
            <ul className="lf-item-grid">
              {items.map((item) => (
                <li key={item.id} className="lf-item-card">
                  <Link href={`/items/${item.id}`} className="lf-item-thumb" aria-label="상세 보기">
                    {item.thumb_url ? (
                      <img src={item.thumb_url} alt={item.attributes.category || '분실물'} />
                    ) : (
                      <div className="lf-thumb-empty" aria-hidden>
                        No Image
                      </div>
                    )}
                  </Link>

                  <div className="lf-item-body">
                    <div className="lf-item-title">
                      <Link href={`/items/${item.id}`}>{item.attributes.category}</Link>
                    </div>

                    <div className="lf-item-meta">
                      <span className={`lf-badge-chip status-${item.status.toLowerCase()}`}>
                        {item.status === 'STORED' && '보관 중'}
                        {item.status === 'CLAIMED' && '클레임 중'}
                        {item.status === 'HANDED_OVER' && '반환 완료'}
                      </span>
                      <span className="lf-meta-dot" />
                      <span className="lf-item-sub">
                        {item.attributes.brand ?? '기타'}
                        {item.attributes.color ? ` · ${item.attributes.color}` : ''}
                      </span>
                    </div>

                    <div className="lf-card-actions">
                      <Link href={`/items/${item.id}`} className="lf-btn-ghost" aria-label="상세 보기">
                        상세 보기
                      </Link>
                      <Link href={`/items/${item.id}?edit=1`} className="lf-btn-ghost" aria-label="수정하기">
                        수정
                      </Link>
                      <button
                        type="button"
                        className="lf-btn-danger"
                        onClick={() => onDelete(item.id)}
                        aria-label="삭제하기"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {pagination && pagination.total > pagination.size && (
              <nav className="lf-pagination" aria-label="페이지네이션">
                {Array.from({ length: Math.ceil(pagination.total / pagination.size) }).map((_, i) => (
                  <button
                    key={i + 1}
                    className={`lf-page-btn ${pagination.page === i + 1 ? 'is-active' : ''}`}
                    onClick={() => fetchItems(i + 1)}
                    aria-current={pagination.page === i + 1 ? 'page' : undefined}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}
      </div>

      {/* 하단 TabBar */}
      <nav className="lf-tabbar" aria-label="하단 탭">
        <div className="lf-tabbar-inner">
          <Link href="/" className="lf-tab">🏠<span>홈</span></Link>
          <Link href="/items/new" className="lf-tab">➕<span>등록</span></Link>
          <Link href="/me/activity" className="lf-tab">📋<span>내 활동</span></Link>
          <Link href="/me/items" className="lf-tab lf-tab-active">👤<span>내 정보</span></Link>
          <Link href="/search" className="lf-tab">🔎<span>검색</span></Link>
        </div>
      </nav>
    </main>
  );
}
