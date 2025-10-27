// apps/frontend/app/items/[id]/page.tsx
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic'; // 프리렌더 간섭 방지(선택이지만 권장)

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

async function fetchItem(id: string) {
  try {
    const res = await fetch(`${API_BASE}/items/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    // ✅ 폴백 목데이터(백엔드 미연결/오류 시에도 UI 확인 가능)
    return {
      id,
      name: '샘플 아이템',
      category: '전자기기',
      brand: 'Apple',
      model: 'iPhone 12 Pro',
      color: 'Graphite',
      status: 'STORED',
      stored_place: '학생회관 1층 안내데스크',
      lat: 35.0,
      lng: 126.7,
      features: '후면 스티커, 미세 스크래치',
      accessories: '케이스, 스트랩',
      serial_masked: 'F2***9',
      photos: [{ url: '/placeholder.svg' }, { url: '/placeholder.svg' }],
      description: '분실물 상세 설명 예시입니다.',
    };
  }
}

/** ✅ Next 최신 스펙: params 가 Promise일 수 있으므로 반드시 await */
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  return { title: `분실물 상세 #${id} | Smart Lost&Found` };
}

/** ✅ 페이지 컴포넌트에서도 params 를 await */
export default async function ItemDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await fetchItem(id);

  return (
    <main className="lf-page">
      <section className="lf-container lf-detail" style={{ paddingTop: 16, paddingBottom: 88 }}>
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
          {/* (추후) 지도 연결 */}
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
      </section>
    </main>
  );
}
