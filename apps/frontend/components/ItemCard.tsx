'use client';

import Link from 'next/link';

export interface ResultItem {
  id: number;
  name: string;
  brand?: string | null;
  color?: string | null;
  stored_place?: string | null;
  reason_text?: string | null; // (선택) 근거문장
  photos?: { url: string }[];
}

export default function ItemCard({ item }: { item: ResultItem }) {
  const cover = item.photos?.[0]?.url || '/placeholder.svg';

  return (
    <Link href={`/items/${item.id}`} className="lf-result-card" aria-label={`${item.name} 상세 보기`}>
      <div className="lf-result-thumb">
        <img src={cover} alt={item.name} />
      </div>
      <div className="lf-result-body">
        <div className="lf-result-title">
          <strong className="truncate">{item.name}</strong>
        </div>
        <div className="lf-result-meta">
          <span>{item.brand || '브랜드 미상'}</span>
          <span>·</span>
          <span>{item.color || '색상 미상'}</span>
          {item.stored_place ? (
            <>
              <span>·</span>
              <span className="truncate">{item.stored_place}</span>
            </>
          ) : null}
        </div>
        {item.reason_text ? (
          <div className="lf-result-reason" title={item.reason_text}>
            {item.reason_text}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
