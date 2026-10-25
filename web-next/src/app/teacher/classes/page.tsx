'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Btn, Card, EmptyState, Guard, Kicker, PageHero, SectionTitle, Table } from '@/components/ui';

const NAV = [
  { href: '/teacher/contests', label: '← Kỳ thi' },
  { href: '/teacher/stats', label: 'Thống kê →' },
];

interface Clazz { id: number; name: string; members_count?: number; assignments_count?: number }

export default function TeacherClasses() {
  const { me, loading } = useAuth();
  const [classes, setClasses] = useState<Clazz[]>([]);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api<{ classes: Clazz[] }>('/teacher/classes');
      setClasses(r.classes || []);
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return null;
  if (!me || (me.role !== 'teacher' && me.role !== 'admin')) return <Guard title="Không có quyền" hint="Chỉ giảng viên mới vào được trang này." />;

  return (
    <div className="flex flex-col gap-5">
      <PageHero zone="teach" kicker="Khu giảng viên" title="Lớp học" desc="Danh sách lớp bạn đang dạy. Bấm vào lớp để quản lý chi tiết." glow="accent" />

      <nav className="flex flex-wrap gap-2">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-muted transition hover:border-accent hover:text-accent">{n.label}</Link>
        ))}
      </nav>

      {err && <Card><p className="text-sm text-danger">⚠️ {err}</p></Card>}

      <Card>
        <Kicker>Lớp học</Kicker>
        <SectionTitle sub="Bấm vào lớp để xem chi tiết thành viên và tiến độ">Lớp đang dạy ({classes.length})</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {classes.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`}
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface-raised p-4 transition hover:border-accent">
              <p className="font-extrabold text-lg">{c.name}</p>
              <p className="text-sm text-muted">
                👥 {c.members_count ?? 0} thành viên · 📝 {c.assignments_count ?? 0} bài được giao
              </p>
              <span className="text-sm font-bold text-accent">Quản lý lớp →</span>
            </Link>
          ))}
          {classes.length === 0 && <div className="sm:col-span-2"><EmptyState title="Chưa có lớp nào" hint="Liên hệ admin để được tạo lớp và gán giảng viên." /></div>}
        </div>
        <div className="mt-4">
          <Btn onClick={load}>🔄 Làm mới</Btn>
        </div>
      </Card>
    </div>
  );
}
