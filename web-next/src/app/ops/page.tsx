'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Btn, Card, EmptyState, Guard, Kicker, LoadingSkeleton, PageHero, SectionTitle, Stat } from '@/components/ui';

const ADMIN_PAGES = [
  { href: '/ops/users', label: 'Người dùng', icon: '👥', desc: 'Tạo, sửa, đổi vai trò và xóa tài khoản.' },
  { href: '/ops/problems', label: 'Bài tập', icon: '📝', desc: 'Xem danh sách bài tập giáo viên tạo (chỉ xem, xóa để dọn dẹp).' },
  { href: '/ops/assignments', label: 'Giao bài', icon: '📮', desc: 'Xem và xóa các lượt giao bài (không tạo mới).' },
  { href: '/ops/progress', label: 'Tiến độ & Contest', icon: '📈', desc: 'Xem tiến độ lớp và leaderboard kỳ thi (chỉ xem).' },
  { href: '/ops/system', label: 'Vận hành', icon: '⚙️', desc: 'Thống kê queue, worker đang chạy, requeue run lỗi.' },
];

interface Dashboard {
  users_total: number; users_by_role: Record<string, number>;
  classes_total: number; problems_total: number; submissions_total: number;
  queue: { status: string; c: number }[];
  by_verdict: Record<string, number>;
}

export default function OpsOverview() {
  const { me, loading } = useAuth();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [err, setErr] = useState('');

  const loadDash = useCallback(async () => {
    try { setDash(await api<Dashboard>('/admin/dashboard')); }
    catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  }, []);

  useEffect(() => { loadDash(); }, [loadDash]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!me) return <Guard title="Khu quản trị" hint="Vui lòng đăng nhập để mở trang admin." />;
  if (me.role !== 'admin') return <Guard title="Không có quyền" hint="Chỉ tài khoản admin mới vào được khu quản trị hệ thống." />;

  const queuePending = (dash?.queue || []).filter((q) => q.status === 'QUEUED' || q.status === 'RUNNING').reduce((s, q) => s + q.c, 0);
  const systemErrors = (dash?.queue || []).filter((q) => q.status === 'SYSTEM_ERROR').reduce((s, q) => s + q.c, 0);
  const accepted = dash?.by_verdict?.ACCEPTED ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHero zone="ops" kicker="Quản trị hệ thống" title="Tổng quan"
        desc="Admin chỉ quản lý người dùng, xem dữ liệu hệ thống và vận hành. Không tạo bài, giao bài hay chấm điểm."
        stat={{ label: 'Người dùng', value: dash?.users_total ?? '—' }} />

      {err && <Card><p className="text-sm text-danger">⚠️ {err}</p></Card>}

      {dash && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="NGƯỜI DÙNG" value={dash.users_total} accent="var(--accent)" />
          <Stat label="LỚP HỌC" value={dash.classes_total} accent="var(--primary)" />
          <Stat label="BÀI TẬP" value={dash.problems_total} accent="var(--success)" />
          <Stat label="BÀI NỘP" value={dash.submissions_total} accent="var(--warning)" />
        </div>
      )}

      {dash && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="QUEUE CHỜ" value={queuePending} accent="var(--warning)" />
          <Stat label="LỖI HỆ THỐNG" value={systemErrors} accent="var(--danger)" />
          <Stat label="AC (đã giải)" value={accepted} accent="var(--success)" />
          <Stat label="GIẢNG VIÊN" value={dash.users_by_role?.teacher ?? 0} accent="var(--accent)" />
        </div>
      )}

      <Card>
        <Kicker>Chức năng quản trị</Kicker>
        <SectionTitle sub="Mỗi mục là một trang riêng. Bấm để mở chi tiết.">Chọn mục quản trị ({ADMIN_PAGES.length})</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_PAGES.map((p) => (
            <Link key={p.href} href={p.href}
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface-raised p-5 transition hover:border-primary">
              <span className="text-2xl">{p.icon}</span>
              <p className="font-extrabold text-lg">{p.label}</p>
              <p className="text-sm text-muted">{p.desc}</p>
              <span className="text-sm font-bold text-primary">Mở →</span>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <Kicker>Phân quyền rõ ràng</Kicker>
        <SectionTitle sub="Giới hạn trách nhiệm giữa admin và giảng viên">Ai làm gì?</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-raised p-4">
            <p className="mb-2 font-extrabold text-danger">🛡️ Admin — chỉ làm</p>
            <ul className="space-y-1 text-sm text-muted">
              <li>• Quản lý tài khoản người dùng (CRUD, đổi vai trò)</li>
              <li>• Xem dữ liệu hệ thống (bài tập, giao bài, tiến độ, contest)</li>
              <li>• Vận hành hệ thống (queue, worker, requeue run lỗi)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-surface-raised p-4">
            <p className="mb-2 font-extrabold text-success">👨‍🏫 Giảng viên — làm</p>
            <ul className="space-y-1 text-sm text-muted">
              <li>• Tạo và cập nhật đề bài, testset</li>
              <li>• Giao bài cho lớp/cá nhân, chấm tay, rejudge</li>
              <li>• Tạo và quản lý kỳ thi (contest), xem leaderboard</li>
              <li>• Quản lý lớp học, thêm/xóa thành viên, xem thống kê</li>
            </ul>
          </div>
        </div>
        <div className="mt-3">
          <Btn onClick={loadDash}>🔄 Làm mới</Btn>
        </div>
      </Card>
    </div>
  );
}
