'use client';

// Header tren: chi render khi da co khung (SiteChrome da loai /welcome chua login).
// Gi ngu laden de sau nay tai su dung.

import HeaderButtons from './menubutton';

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <span className="studio-title text-lg">Luyện thi lập trình</span>
        <HeaderButtons />
      </div>
    </header>
  );
}
