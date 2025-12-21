"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search as SearchIcon, Home, PlusCircle, Bell, User } from 'lucide-react';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/results?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="lf-page lf-search">
      {/* Hero */}
      <section className="lf-hero">
        <div className="lf-container">
          <p className="lf-hero-sub">검색</p>
          <h1 className="lf-hero-title">분실물 검색</h1>
          <p className="lf-hero-desc">잃어버린 물건을 자세히 설명해 주세요</p>
        </div>
      </section>

      {/* 검색 입력 + 버튼 */}
      <div className="lf-container" style={{ marginTop: '-30px', paddingTop: '24px' }}>
        <form onSubmit={onSubmit} className="lf-search-box" role="search" aria-label="분실물 자연어 검색">
          <div className="input-wrap">
            <SearchIcon aria-hidden className="icon" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input"
              placeholder="예: 하늘색 무늬 케이스의 아이폰 12 Pro"
              aria-label="검색어 입력"
            />
          </div>

          <button
            type="submit"
            className="cta"
            aria-label="AI 검색 실행"
            disabled={!q.trim()}
          >
            분실물 검색
          </button>
        </form>

        {/* 초기 빈 상태 일러스트/카피 */}
        <div className="lf-search-empty" aria-hidden>
          <div className="glass">
            <SearchIcon size={48} />
          </div>
          <div className="text">
            <h3>분실물을 찾아보세요</h3>
            <p>자세한 설명을 입력하면 AI가 가장 유사한 분실물을 찾아드려요</p>
          </div>
        </div>

        {/* 검색 팁 */}
        <section className="lf-search-tips">
          <h4>검색 팁</h4>
          <ul>
            <li>브랜드와 모델명을 포함해 주세요 (예: Apple 아이폰 12 Pro)</li>
            <li>색상과 크기를 구체적으로 적어주세요 (예: 하늘색, 6.1인치)</li>
            <li>특별한 무늬나 손상 부분도 언급해 주세요 (예: 좌측 상단 잔기스)</li>
          </ul>
        </section>
      </div>

      {/* 하단 탭바 */}
      <nav className="lf-tabbar" aria-label="하단 탭바">
        <div className="lf-tabbar-inner">
          <Link href="/home" className="lf-tab" aria-label="홈">
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
            <SearchIcon size={18} />
            <span>검색</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
