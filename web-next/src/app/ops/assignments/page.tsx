'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Btn, Card, EmptyState, Field, Input, Kicker, Pagination, SectionTitle, Table, type PageMeta } from '@/components/ui';
import { useToast, useConfirm } from '@/components/feedback';
import { AdminShell, errText } from '../shared';

interface Assignment {
  id: number; problem_id: number; class_id?: number | null;
  user_id?: number | null; due_at?: string | null; note?: string | null;
}

export default function OpsAssignments() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [assigns, setAssigns] = useState<Assignment[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [fClass, setFClass] = useState('');
  const [fUser, setFUser] = useState('');
  const [fProblem, setFProblem] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    try {
      const qs = new URLSearchParams({ page: String(page), per_page: '15' });
      if (fClass.trim()) qs.set('class_id', fClass.trim());
      if (fUser.trim()) qs.set('user_id', fUser.trim());
      if (fProblem.trim()) qs.set('problem_id', fProblem.trim());
      const r = await api<{ assignments: Assignment[]; meta: PageMeta }>(`/admin/assignments?${qs}`);
      setAssigns(r.assignments || []); setMeta(r.meta || null);
    } catch (e: unknown) { setError(errText(e)); }
  }, [fClass, fUser, fProblem]);

  useEffect(() => { load(1); }, [load]);

  const del = async (a: Assignment) => {
    const ok = await confirm({
      title: 'Xóa giao bài',
      message: `Giao bài #${a.id} (bài #${a.problem_id}) sẽ bị xóa khỏi lớp/học sinh.`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/admin/assignments/${a.id}`, { method: 'DELETE' });
      toast.success('Đã xóa giao bài', `#${a.id}`);
      load(meta?.page || 1);
    } catch (e: unknown) { setError(errText(e)); }
  };

  return (
    <AdminShell title="Giao bài (chỉ xem)" desc="Admin xem + xóa giao bài — KHÔNG giao bài mới (do GV làm).">
      {error && <Card><p className="text-sm text-danger">⚠️ {error}</p></Card>}
      <Card>
        <Kicker>Assignments · view-only</Kicker>
        <SectionTitle sub="Lọc theo lớp / user / bài">Danh sách giao bài ({meta?.total ?? '…'})</SectionTitle>
        <p className="mt-2 text-sm text-muted">⚠️ Giao bài mới do giáo viên thực hiện tại khu giảng viên.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <Field label="class_id"><Input placeholder="VD: 2" value={fClass} onChange={(e) => setFClass(e.target.value)} /></Field>
          <Field label="user_id"><Input placeholder="VD: 7" value={fUser} onChange={(e) => setFUser(e.target.value)} /></Field>
          <Field label="problem_id"><Input placeholder="VD: 1" value={fProblem} onChange={(e) => setFProblem(e.target.value)} /></Field>
          <div className="flex items-end"><Btn variant="primary" onClick={() => load(1)}>Lọc</Btn></div>
        </div>
        <Table<Assignment>
          columns={[
            { head: 'Giao', render: (a) => <span><b>#{a.id}</b> → bài #{a.problem_id}<br /><span className="text-xs text-muted">{a.class_id ? `Lớp #${a.class_id}` : a.user_id ? `User #${a.user_id}` : '—'}{a.due_at ? ` · Hạn ${a.due_at}` : ''}</span></span> },
            { head: 'Ghi chú', render: (a) => <span className="text-xs text-muted">{a.note || '—'}</span> },
            { head: 'Xem bài', center: true, render: (a) => <a className="rounded border border-border bg-surface px-2 py-1 text-xs transition hover:border-primary hover:text-primary" href={`/solve/${a.problem_id}`}>Mở</a> },
            { head: 'Xóa', center: true, render: (a) => <Btn className="!px-2 !py-1 text-xs" variant="danger" onClick={() => del(a)}>Xóa</Btn> },
          ]}
          rows={assigns}
          keyOf={(a) => a.id}
          empty="Chưa có giao bài nào phù hợp bộ lọc."
        />
        <Pagination meta={meta} onPage={load} />
      </Card>
    </AdminShell>
  );
}
