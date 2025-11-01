'use client';

import Link from 'next/link';
import styles from './result-card.module.css';

export type ResultItem = {
  id: number | string;
  imageUrl?: string | null;
  name: string;
  brand?: string | null;
  color?: string | null;
  storedPlace?: string | null;
  reasonText?: string | null;  // LLM 근거 문장
  score?: number | null;       // LLM 점수(선택)
};

type Props = { item: ResultItem; href?: string; className?: string };

export default function ResultCard({ item, href, className }: Props) {
  const link = href ?? `/items/${item.id}`;

  return (
    <article
      className={[
        styles.card,
        "relative rounded-2xl border border-[hsl(222_14%_90%)] bg-white shadow-sm",
        "transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500",
        className || ""
      ].join(" ")}
    >
      {/* 투명 링크 오버레이 (텍스트는 기본 색 유지, 전체 클릭) */}
      <Link href={link} className="absolute inset-0 z-[1]" aria-label={`${item.name} 상세 보기`} />

      <div className="flex items-stretch gap-4 p-3 md:p-4">
        {/* 썸네일 */}
        <div className="relative w-[112px] h-[96px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs">
              No Image
            </div>
          )}
        </div>

        {/* 본문 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-slate-900 truncate">{item.name}</h3>
            {typeof item.score === 'number' && (
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-[2px] text-[11px] font-semibold text-blue-600">
                {Math.round(item.score)}점
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
            {item.brand && <span className="rounded-full bg-slate-100 px-2 py-[2px] text-slate-700">{item.brand}</span>}
            {item.color && <span className="rounded-full bg-slate-100 px-2 py-[2px] text-slate-700">{item.color}</span>}
            {item.storedPlace && (
              <span className="rounded-full bg-slate-100 px-2 py-[2px] text-slate-700">보관: {item.storedPlace}</span>
            )}
          </div>

          {item.reasonText && (
            <p className="mt-2 text-[12px] text-slate-500">
              <span className="mr-1 rounded-sm bg-slate-100 px-1 py-[1px] text-[10px] text-slate-600">근거</span>
              <span className="lf-two-line">{item.reasonText}</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
