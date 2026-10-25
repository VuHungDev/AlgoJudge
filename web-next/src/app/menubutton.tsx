'use client';

// Nut header: chi mo/dong menu + hien badge user.
// Dang nhap/dang ky/quen mat khau chi nam o /welcome — khong popup rieng o header nua.

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

function IconBtn({ label, title, onClick, children, hideMobile }: {
  label: string; title: string; onClick?: () => void; children: React.ReactNode; hideMobile?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={title}
      className={`grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface text-lg transition hover:border-primary hover:text-primary${hideMobile ? ' hidden lg:grid' : ''}`}
    >
      {children}
    </button>
  );
}

export default function HeaderButtons() {
  const { me, loading } = useAuth();

  const toggleMenu = () => window.dispatchEvent(new CustomEvent('oj:toggle-menu'));
  const toggleCollapse = () => window.dispatchEvent(new CustomEvent('oj:toggle-collapse'));

  return (
    <div className="flex items-center gap-2">
      <div className="lg:hidden">
        <IconBtn label="Mở menu" title="Mở menu" onClick={toggleMenu}>☰</IconBtn>
      </div>
      <div className="hidden lg:block">
        <IconBtn label="Ẩn/hiện menu" title="Ẩn/hiện thanh menu bên trái" onClick={toggleCollapse} hideMobile>⇔</IconBtn>
      </div>
      {loading ? null : me ? (
        <span className="studio-badge hidden sm:inline-flex">{me.display_name || me.email.split('@')[0]} · {me.role}</span>
      ) : (
        <Link href="/welcome" className="studio-button studio-primary !py-2 text-sm">
          Đăng nhập
        </Link>
      )}
    </div>
  );
}
