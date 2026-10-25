'use client';

// Khung chung cho khu Admin: kiem tra quyen + hero + thanh tab cac trang con
// + nut chuyen trang truoc/sau. Moi chuc nang admin la 1 trang rieng.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Guard, LoadingSkeleton, PageHero } from '@/components/ui';

export const ADMIN_PAGES = [
  { href: '/ops', label: 'Tổng quan' },
  { href: '/ops/users', label: 'Người dùng' },
  { href: '/ops/problems', label: 'Bài tập (xem)' },
  { href: '/ops/assignments', label: 'Giao bài (xem)' },
  { href: '/ops/progress', label: 'Tiến độ & Contest' },
  { href: '/ops/system', label: 'Vận hành' },
];

export const errText = (e: unknown) => friendlyError(e instanceof Error ? e.message : String(e));

export const ROLE_LABEL: Record<string, string> = { student: 'Học sinh', teacher: 'Giáo viên', admin: 'Admin' };

export function AdminShell({ title, desc, stat, actions, children }: {
  title: string; desc?: string; stat?: { label: string; value: React.ReactNode };
  actions?: React.ReactNode; children: React.ReactNode;
}) {
  const { me, loading } = useAuth();
  const path = usePathname();

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!me) return <Guard title="Khu quản trị" hint="Vui lòng đăng nhập để mở trang admin." />;
  if (me.role !== 'admin') return <Guard title="Không có quyền" hint="Chỉ tài khoản admin mới vào được khu quản trị hệ thống." />;

  const idx = ADMIN_PAGES.findIndex((p) => p.href === path);
  const prev = idx > 0 ? ADMIN_PAGES[idx - 1] : null;
  const next = idx >= 0 && idx < ADMIN_PAGES.length - 1 ? ADMIN_PAGES[idx + 1] : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHero zone="ops" kicker="Quản trị hệ thống" title={title} desc={desc} stat={stat}>
        {actions}
      </PageHero>

      <nav aria-label="Các mục quản trị" className="flex flex-wrap gap-2">
        {ADMIN_PAGES.map((p, i) => {
          const on = p.href === path;
          return (
            <Link
              prefetch={false}
              key={p.href}
              href={p.href}
              aria-current={on ? 'page' : undefined}
              className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${on ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:border-primary/60 hover:text-primary'}`}
            >
              {i + 1}. {p.label}
            </Link>
          );
        })}
      </nav>

      {children}

      {(prev || next) && (
        <div className="flex flex-wrap justify-between gap-2">
          {prev ? <Link prefetch={false} className="studio-button studio-secondary w-fit" href={prev.href}>← {prev.label}</Link> : <span />}
          {next && <Link prefetch={false} className="studio-button studio-primary w-fit" href={next.href}>Tiếp tục: {next.label} →</Link>}
        </div>
      )}
    </div>
  );
}
