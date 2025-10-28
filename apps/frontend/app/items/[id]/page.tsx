// apps/frontend/app/items/[id]/page.tsx
'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Home, PlusCircle, Bell, User, Search, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('lf_token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        
        console.log('Fetching item:', id);
        const res = await fetch(`${API_BASE}/items/${id}`, {
          cache: 'no-store',
          headers,
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
        
        const data = await res.json();
        console.log('Item data received:', data);
        setItem(data);
      } catch (e) {
        console.error('Failed to fetch item:', e);
        setItem({
          id, name: '샘플 아이템', category: '전자기기', brand: 'Apple',
          model: 'iPhone 12 Pro', color: 'Graphite', status: 'STORED',
          stored_place: '학생회관 1층 안내데스크', lat: 35.0, lng: 126.7,
          features: '후면 스티커, 미세 스크래치', accessories: '케이스, 스트랩',
          serial_masked: 'F2***9', photos: [{ url: '/placeholder.svg' }, { url: '/placeholder.svg' }],
          description: '분실물 상세 설명 예시입니다.',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Leaflet 지도 초기화
  useEffect(() => {
    if (!item || !mapRef.current || mapInstanceRef.current) return;
    const lat = item.lat || 35.0;
    const lng = item.lng || 126.7;
    
    const map = L.map(mapRef.current).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    const icon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
      shadowSize: [41, 41],
    });
    const marker = L.marker([lat, lng], { icon }).addTo(map);
    marker.bindPopup(`<b>${item.name}</b><br/>위치: ${lat}, ${lng}`);
    
    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [item]);

  const handleHandOver = async () => {
    if (!confirm('반환 완료 처리하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('lf_token');
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'HANDED_OVER' }),
      });
      if (res.ok) {
        alert('반환 완료 처리되었습니다.');
        if (item) setItem({ ...item, status: 'HANDED_OVER' });
      }
    } catch (e) {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  if (loading || !item) {
    return <div className="lf-page lf-container" style={{ paddingTop: '100px' }}>로딩 중...</div>;
  }

  return (
    <main className="lf-page">
      {/* Hero */}
      <section className="lf-hero">
        <div className="lf-container">
          <p className="lf-hero-sub">분실물 상세</p>
          <h1 className="lf-hero-title">{item.name || '분실물'}</h1>
          <p className="lf-hero-desc">상세 정보를 확인하세요</p>
        </div>
      </section>

      <section className="lf-container" style={{ paddingTop: '20px', paddingBottom: '88px' }}>
        {/* 이미지 영역 */}
        <div className="lf-detail-gallery lf-card">
          {item.photos?.length ? (
            <div className="lf-detail-gallery-grid">
              {item.photos.map((p: any, i: number) => (
                <img key={i} src={p.url} alt={`${item.name} 사진 ${i + 1}`} />
              ))}
            </div>
          ) : (
            <div className="lf-detail-gallery-empty">이미지 없음</div>
          )}
        </div>

        {/* 핵심 속성 */}
        <div className="lf-card lf-detail-attrs">
          <h2 className="lf-section-title">{item.name}</h2>
          <dl className="lf-attrs">
            <div><dt>카테고리</dt><dd>{item.category || '-'}</dd></div>
            <div><dt>브랜드</dt><dd>{item.brand || '-'}</dd></div>
            <div><dt>모델명</dt><dd>{item.model || '-'}</dd></div>
            <div><dt>색상</dt><dd>{item.color || '-'}</dd></div>
            <div><dt>상태</dt><dd>{item.status || '-'}</dd></div>
          </dl>
        </div>

        {/* 위치/보관 */}
        <div className="lf-card lf-detail-place">
          <h3 className="lf-section-title">보관 위치</h3>
          <p className="lf-place-text">{item.stored_place || '미지정'}</p>
          {(item.lat && item.lng) && (
            <>
              <p className="lf-place-text" style={{ fontFamily: 'monospace', fontSize: '12px', color: '#666' }}>
                위도: {item.lat}, 경도: {item.lng}
              </p>
              <div ref={mapRef} style={{ width: '100%', height: '300px', marginTop: '12px', borderRadius: '8px' }} />
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#0066cc' }}
                >
                  Google Maps에서 보기 ↗
                </a>
              </div>
            </>
          )}
        </div>

        {/* 상세 설명 */}
        <div className="lf-card lf-detail-desc">
          <h3 className="lf-section-title">상세 설명</h3>
          <ul className="lf-desc-list">
            <li><strong>특징</strong> {item.features || '-'}</li>
            <li><strong>부속품</strong> {item.accessories || '-'}</li>
            <li><strong>시리얼 일부</strong> {item.serial_masked || '-'}</li>
          </ul>
        </div>

        {/* 반환 완료 버튼 */}
        {item.status === 'STORED' && (
          <div className="lf-card" style={{ marginTop: '16px' }}>
            <button
              onClick={handleHandOver}
              className="lf-btn-primary-full"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              <CheckCircle size={18} /> 반환 완료 처리하기
            </button>
          </div>
        )}
      </section>

      {/* 하단 TabBar */}
      <nav className="lf-tabbar" aria-label="하단 탭바">
        <div className="lf-tabbar-inner">
          <Link href="/" className="lf-tab" aria-label="홈">
            <Home size={18} />
            <span>홈</span>
          </Link>
          <Link href="/items/new" className="lf-tab" aria-label="분실물 등록">
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
    </main>
  );
}
