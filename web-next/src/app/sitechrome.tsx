'use client';

// Khung giao dien chung: o /welcome khi chua dang nhap thi KHONG render
// menu trai + header tren (bo han khoi cay render, khong phai an CSS).
// Dang nhap xong (co me) thi render khung day du.

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import SideNav from './sidenav';
import SiteHeader from './siteheader';

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { me, loading } = useAuth();

  // Trang chao mung chua login: chi noi dung trang, khong khung.
  if (!loading && !me && path === '/welcome') {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 py-6 lg:px-8 lg:py-8">
        {children}
      </main>
    );
  }

  // Da login: khung day du (menu trai + header tren + noi dung).
  return (
    <div className="mx-auto flex min-h-screen max-w-[1500px]">
      <Suspense>
        <SideNav />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
