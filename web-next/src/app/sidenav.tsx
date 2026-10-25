'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  section: string;
}

type NavMap = Record<string, NavItem[]>;

function ZoneIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    book:   <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />,
    chart:  <path d="M4 20V10 M10 20V4 M16 20v-7 M21 20H3" />,
    cup:    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z M7 5H4a1 1 0 0 0-1 1c0 2.5 2 4 4 4 M17 5h3a1 1 0 0 1 1 1c0 2.5-2 4-4 4 M12 14v4 M8 21h8" />,
    user:   <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" />,
    cap:    <path d="M2 9 12 4l10 5-10 5L2 9Z M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5 M22 9v5" />,
    clip:   <path d="M9 4h6v3H9z M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2 M9 12h6 M9 16h6" />,
    gear:   <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4L9.7 5.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z" />,
    pulse:  <path d="M3 12h4l2-6 4 12 2-6h6" />,
    grid:   <path d="M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z" />,
    pen:    <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />,
    check:  <path d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
    users:  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />,
    log:    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />,
    server: <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9z M2 16a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1z M6 12v.01 M6 18v.01" />,
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

// Thanh menu theo từng vai trò — hoàn toàn tách biệt.
const NAV_BY_ROLE: NavMap = {
  student: [
    { href: '/',            label: 'Bài tập',         icon: 'book',  section: 'HỌC TẬP' },
    { href: '/classes',     label: 'Lớp của tôi',     icon: 'users', section: 'HỌC TẬP' },
    { href: '/assignments', label: 'Bài được giao',   icon: 'clip',  section: 'HỌC TẬP' },
    { href: '/progress',    label: 'Tiến độ học tập', icon: 'chart', section: 'HỌC TẬP' },
    { href: '/contests',    label: 'Kỳ thi',          icon: 'cup',   section: 'HỌC TẬP' },
    { href: '/playground',  label: 'Sân tập tự do',    icon: 'pen',   section: 'HỌC TẬP' },
    { href: '/languages',   label: 'Ngôn ngữ & thư viện', icon: 'server', section: 'HỌC TẬP' },
    { href: '/profile',     label: 'Hồ sơ cá nhân',  icon: 'user',  section: 'TÀI KHOẢN' },
  ],
  teacher: [
    { href: '/teacher/problems', label: 'Quản lý bài tập', icon: 'book',  section: 'GIẢNG DẠY' },
    { href: '/teacher/classes',  label: 'Quản lý lớp',     icon: 'users', section: 'GIẢNG DẠY' },
    { href: '/teacher/contests', label: 'Kỳ thi',          icon: 'cup',   section: 'GIẢNG DẠY' },
    { href: '/teacher/grading',  label: 'Chấm bài',        icon: 'check', section: 'GIẢNG DẠY' },
    { href: '/teacher/stats',    label: 'Thống kê lớp',    icon: 'chart', section: 'GIẢNG DẠY' },
    { href: '/profile',          label: 'Hồ sơ cá nhân',  icon: 'user',  section: 'TÀI KHOẢN' },
  ],
  admin: [
    { href: '/ops/problems',    label: 'Bài tập',           icon: 'book',   section: 'QUẢN TRỊ' },
    { href: '/ops/progress',    label: 'Tiến độ & Contest', icon: 'cup',    section: 'QUẢN TRỊ' },
    { href: '/ops/assignments', label: 'Giao bài',          icon: 'clip',   section: 'QUẢN TRỊ' },
    { href: '/ops/users',       label: 'Người dùng',        icon: 'users',  section: 'QUẢN TRỊ' },
    { href: '/ops/system',      label: 'Hệ thống',          icon: 'server', section: 'QUẢN TRỊ' },
    { href: '/ops',             label: 'Hàng đợi / Worker', icon: 'gear',   section: 'QUẢN TRỊ' },
  ],
};

export default function SideNav() {
  const path = usePathname();
  const router = useRouter();
  const { me, loading, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem('oj_nav_collapsed') === '1'); } catch { /**/ }
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (userBox.current && !userBox.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [path]);

  useEffect(() => {
    const onCollapse = () => setCollapsed((c) => {
      try { localStorage.setItem('oj_nav_collapsed', c ? '0' : '1'); } catch { /**/ }
      return !c;
    });
    window.addEventListener('oj:toggle-collapse', onCollapse);
    return () => window.removeEventListener('oj:toggle-collapse', onCollapse);
  }, []);

  useEffect(() => {
    const onToggle = () => setMobileOpen((v) => !v);
    window.addEventListener('oj:toggle-menu', onToggle);
    return () => window.removeEventListener('oj:toggle-menu', onToggle);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const role = me?.role ?? 'student';
  const items: NavItem[] = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.student;

  // Nhóm theo section, giữ thứ tự xuất hiện đầu tiên.
  const sections = [...new Set(items.map((i) => i.section))];

  const active = (href: string) =>
    href === '/'
      ? path === '/'
      : path === href || path.startsWith(href + '/');

  const nav = (
    <div className="flex h-full flex-col">
      <Link href={role === 'admin' ? '/ops' : role === 'teacher' ? '/teacher/problems' : '/'} className="obe-brand">
        <span className="obe-logo">AJ</span>
        {!collapsed && (
          <span className="min-w-0">
            <b className="block leading-tight text-white">AlgoJudge</b>
            <small className="text-[11px] text-white/70">
              {role === 'teacher' ? 'Khu giảng viên' : role === 'admin' ? 'Quản trị hệ thống' : 'Luyện thi lập trình'}
            </small>
          </span>
        )}
      </Link>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3" aria-label="Thanh menu chính">
        {sections.map((sec) => (
          <div key={sec}>
            {!collapsed && <p className="obe-section">{sec}</p>}
            <div className="flex flex-col gap-1">
              {items.filter((i) => i.section === sec).map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={active(i.href) ? 'page' : undefined}
                  title={collapsed ? i.label : undefined}
                  className={`studio-nav-link flex items-center gap-3 !px-3 !py-2.5 text-[15px]${active(i.href) ? ' studio-nav-active' : ''}${collapsed ? ' justify-center' : ''}`}
                >
                  <span aria-hidden className="grid w-6 place-items-center"><ZoneIcon name={i.icon} /></span>
                  {!collapsed && <span className="font-semibold">{i.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-white/15 p-3">
        <button
          onClick={toggle}
          className="w-full rounded-lg bg-white/10 px-3 !py-2 text-left text-sm font-semibold text-white hover:bg-white/20"
          aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          title={collapsed ? (theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối') : undefined}
        >
          {collapsed ? (theme === 'dark' ? '☀' : '☾') : (theme === 'dark' ? '☀ Chế độ sáng' : '☾ Chế độ tối')}
        </button>

        {loading ? (
          !collapsed && <p className="px-2 text-xs text-white/60">Đang tải tài khoản…</p>
        ) : me ? (
          <div ref={userBox} className="relative">
            <button
              onClick={() => setUserOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userOpen}
              title={collapsed ? (me.display_name || me.email) : undefined}
              className="flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-[#0a2f52]">
                {(me.display_name || me.email || 'A')[0].toUpperCase()}
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate text-left">{me.display_name || me.email.split('@')[0]}</span>
                  <span aria-hidden className="text-xs">{userOpen ? '▲' : '▼'}</span>
                </>
              )}
            </button>
            {userOpen && (
              <div role="menu" className="studio-card absolute bottom-full left-0 right-0 z-30 mb-2 min-w-52 !p-2">
                <p className="studio-muted truncate px-3 pt-2 text-xs">{me.email}</p>
                <p className="px-3 pb-1 text-xs"><b className="text-primary">{me.role}</b></p>
                {role === 'admin' ? (
                  <p className="studio-muted px-3 pb-2 text-[11px]">Đổi mật khẩu qua quản trị hệ thống.</p>
                ) : (
                  <Link role="menuitem" className="studio-nav-link block !text-[#14324a]" href="/welcome" onClick={() => setUserOpen(false)}>
                    Quên / đặt lại mật khẩu
                  </Link>
                )}
                <button
                  role="menuitem"
                  className="studio-nav-link block w-full !text-left text-danger"
                  onClick={() => { setUserOpen(false); logout(); router.replace('/welcome'); }}
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          !collapsed && <Link className="studio-button studio-primary w-full !py-2 text-sm" href="/welcome">Đăng nhập</Link>
        )}

        <button
          onClick={() => window.dispatchEvent(new CustomEvent('oj:toggle-collapse'))}
          className="w-full rounded-lg border border-white/25 bg-white/5 px-3 !py-2 text-center text-sm font-semibold text-white hover:bg-white/15"
          aria-label={collapsed ? 'Sổ ra toàn bộ menu' : 'Ẩn thanh menu'}
          title={collapsed ? 'Sổ ra toàn bộ menu' : 'Ẩn thanh menu'}
        >
          {collapsed ? '≡ Sổ menu' : '≡ Ẩn menu'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
      )}
      <aside
        className={`obe-sidebar fixed inset-y-0 left-0 z-30 w-72 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-[92px]' : 'lg:w-72'}`}
        aria-hidden={!mobileOpen}
      >
        {nav}
      </aside>
    </>
  );
}
