'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge, Btn, Card, EmptyState, Kicker, Pagination, SectionTitle, Table, type PageMeta } from '@/components/ui';
import { useToast, useConfirm } from '@/components/feedback';
import { AdminShell, errText } from '../shared';

interface AdminProblem {
  id: number; slug: string; title: string; topic: string; difficulty: string;
  author_email?: string | null; author_name?: string | null;
  cases_count: number; submissions_count: number; created_at?: string;
}

export default function OpsProblems() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [problems, setProblems] = useState<AdminProblem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    try {
      const r = await api<{ problems: AdminProblem[]; meta: PageMeta }>(`/admin/problems?page=${page}&per_page=15`);
      setProblems(r.problems || []); setMeta(r.meta || null);
    } catch (e: unknown) { setError(errText(e)); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const del = async (p: AdminProblem) => {
    const ok = await confirm({
      title: 'Xóa bài tập',
      message: `Xóa "${p.title}" (#${p.id}) cùng toàn bộ testset và bài nộp? Không thể hoàn tác.`,
      confirmLabel: 'Xóa vĩnh viễn',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/admin/problems/${p.id}`, { method: 'DELETE' });
      toast.success('Đã xóa bài tập', `${p.title} · #${p.id}`);
      load(meta?.page || 1);
    } catch (e: unknown) { setError(errText(e)); }
  };

  return (
    <AdminShell title="Bài tập (chỉ xem)" desc="Admin xem danh sách bài GV đăng, xóa nếu cần dọn dẹp — KHÔNG tạo bài.">
      {error && <Card><p className="text-sm text-danger">⚠️ {error}</p></Card>}
      <Card>
        <Kicker>Problems · view-only</Kicker>
        <SectionTitle sub="Toàn bộ bài do giáo viên đăng lên hệ thống">Danh sách bài tập ({meta?.total ?? '…'})</SectionTitle>
        <p className="mt-2 text-sm text-muted">⚠️ Tạo bài tập do giáo viên thực hiện tại khu giảng viên.</p>
        <Table<AdminProblem>
          columns={[
            { head: 'Bài', render: (p) => <span><b>{p.title}</b><br /><span className="text-xs text-muted">{p.slug} · #{p.id} · {p.topic} · {p.difficulty}</span></span> },
            { head: 'Người đăng', render: (p) => <span className="text-xs">{p.author_name || p.author_email || `#${p.id}`}</span> },
            { head: 'Ca chấm', center: true, render: (p) => <Badge tone="neutral">{p.cases_count}</Badge> },
            { head: 'Lượt nộp', center: true, render: (p) => <Badge tone="info">{p.submissions_count}</Badge> },
            { head: 'Xóa', center: true, render: (p) => <Btn className="!px-2 !py-1 text-xs" variant="danger" onClick={() => del(p)}>Xóa</Btn> },
          ]}
          rows={problems}
          keyOf={(p) => p.id}
          empty="Chưa có bài tập nào."
        />
        <Pagination meta={meta} onPage={load} />
      </Card>
    </AdminShell>
  );
}
