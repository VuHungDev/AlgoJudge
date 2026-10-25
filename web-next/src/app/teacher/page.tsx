'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Btn, Card, EmptyState, Field, Guard, Input, Kicker, LoadingSkeleton, PageHero, Pagination, SectionTitle, Select, Stat, Table, TextArea, type PageMeta } from '@/components/ui';

const TEACHER_PAGES = [
  { href: '/teacher', label: 'Tổng quan' },
  { href: '/teacher/problems', label: 'Đề thi & testset' },
  { href: '/teacher/grading', label: 'Giao bài & chấm' },
  { href: '/teacher/contests', label: 'Kỳ thi' },
  { href: '/teacher/classes', label: 'Lớp học' },
  { href: '/teacher/stats', label: 'Thống kê' },
  { href: '/teacher/manage', label: 'Quản trị lớp' },
];

interface Overview { classes: number; problems: number; assignments: number; students: number }

export default function TeacherHome() {
  const { me, loading } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!me) return;
    api<Overview>('/teacher/overview').then(setOverview).catch((e: unknown) => setErr(friendlyError(e instanceof Error ? e.message : String(e))));
  }, [me]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!me) return <Guard title="Khu giảng viên" hint="Vui lòng đăng nhập để mở trang giảng viên." />;
  if (me.role !== 'teacher' && me.role !== 'admin') return <Guard title="Không có quyền" hint="Chỉ giảng viên mới vào được khu này." />;

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="teach"
        kicker="Khu giảng viên"
        title="Xin chào, giảng viên!"
        desc="Chọn mục bên dưới để bắt đầu: tạo đề thi, giao bài, quản lý lớp học và xem thống kê."
        glow="accent"
      />

      {err && <Card><p className="text-sm text-danger">⚠️ {err}</p></Card>}

      {overview && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="LỚP ĐANG DẠY" value={overview.classes} accent="var(--accent)" />
          <Stat label="BÀI TẬP" value={overview.problems} accent="var(--primary)" />
          <Stat label="GIAO BÀI" value={overview.assignments} accent="var(--success)" />
          <Stat label="HỌC SINH" value={overview.students} accent="var(--warning)" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEACHER_PAGES.slice(1).map((p, i) => (
          <Link key={p.href} href={p.href} className="flex flex-col gap-2 rounded-xl border border-border bg-surface-raised p-5 transition hover:border-primary">
            <span className="text-2xl">{['📝', '📮', '🏆', '🏫', '📊', '⚙️'][i]}</span>
            <p className="font-extrabold text-lg">{p.label}</p>
            <p className="text-sm text-muted">{[
              'Tạo bài tập mới, cập nhật đề, thêm testset',
              'Giao bài cho lớp/cá nhân, rejudge, chấm tay',
              'Tạo contest, xem leaderboard',
              'Danh sách lớp đang dạy, thành viên',
              'Drill-down tiến độ lớp → bài → học sinh',
              'Thêm/xóa thành viên, theo dõi bài làm',
            ][i]}</p>
            <span className="text-sm font-bold text-primary">Mở →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
