// apps/frontend/app/layout.tsx
import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Smart Lost & Found",
  description: "스마트 분실물 관리 서비스",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-[#f5f7fb] text-slate-900">
        {/* 탭바 높이만큼 + 안전영역만큼 기본 패딩 확보 */}
        <main className="min-h-dvh pb-[calc(var(--lf-tabbar-h)+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </body>
    </html>
  );
}
