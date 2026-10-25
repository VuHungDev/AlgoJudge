'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge, Btn, Card, EmptyState, Kicker, Pagination, SectionTitle, Stat, Table, type PageMeta } from '@/components/ui';
import { useDialog, useToast } from '@/components/feedback';
import { AdminShell, errText } from '../shared';

interface QueueRow { status: string; c: number }
interface WorkerRow { id: number; status: string; lease_expires_at: string; attempt: number }

export default function OpsSystem() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [rid, setRid] = useState('');
  const [error, setError] = useState('');
  const dialog = useDialog();
  const toast = useToast();

  const refresh = useCallback(async () => {
    try {
      const [q, w] = await Promise.all([api<unknown>('/ops/queue'), api<Record<string, unknown>>('/ops/workers')]);
      const rows = (Array.isArray(q) ? q : (q as { queue?: QueueRow[] }).queue || []) as QueueRow[];
      setQueue(rows);
      setWorkers(((w.running || w.workers || []) as WorkerRow[]));
      setError('');
    } catch (e: unknown) { setError(errText(e)); }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const requeue = async () => {
    if (!rid.trim()) { toast.warning('Nhập run_id trước'); return; }
    const ok = await dialog.confirm({ title: `Requeue run #${rid}?`, message: 'Đưa run này vào lại hàng đợi để chấm lại.' });
    if (!ok) return;
    try {
      const r = await api(`/ops/runs/${rid}/requeue`, { method: 'POST' });
      toast.success('Đã requeue', `Run #${rid} đã được đưa vào hàng đợi`);
      refresh();
    } catch (e: unknown) { toast.error('Requeue thất bại', errText(e)); }
  };

  const counts: Record<string, number> = {};
  queue.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + Number(r.c); });

  return (
    <AdminShell title="Vận hành hệ thống" desc="Hàng đợi chấm bài, worker đang chạy và requeue run lỗi.">
      {error && <Card><p className="text-sm text-danger">⚠️ {error}</p></Card>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="QUEUED" value={counts.QUEUED || 0} accent="var(--warning)" sub="Đang chờ" />
        <Stat label="RUNNING" value={counts.RUNNING || 0} accent="var(--primary)" sub="Đang chạy" />
        <Stat label="SYSTEM_ERROR" value={counts.SYSTEM_ERROR || 0} accent="var(--danger)" sub="Lỗi hệ thống" />
        <Stat label="RETRY_PENDING" value={counts.RETRY_PENDING || 0} accent="var(--accent)" sub="Chờ retry" />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div><Kicker>Workers</Kicker><SectionTitle sub="Tự làm mới mỗi 15s">Job đang chạy ({workers.length})</SectionTitle></div>
          <Btn onClick={refresh}>🔄 Làm mới</Btn>
        </div>
        {workers.length === 0 ? (
          <div className="mt-3"><EmptyState title="Hệ thống rảnh" hint="Không có worker nào đang giữ job." /></div>
        ) : (
          <Table<WorkerRow>
            columns={[
              { head: 'Run', render: (w) => <b>#{w.id}</b> },
              { head: 'Trạng thái', render: (w) => <Badge tone="info">{w.status}</Badge> },
              { head: 'Lease hết hạn', render: (w) => <span className="text-xs text-muted">{w.lease_expires_at}</span> },
              { head: 'Attempt', center: true, render: (w) => <Badge tone="neutral">{w.attempt}</Badge> },
            ]}
            rows={workers}
            keyOf={(w) => w.id}
          />
        )}
      </Card>

      <Card>
        <Kicker>Recovery</Kicker>
        <SectionTitle sub="Đưa run lỗi vào lại hàng đợi">Requeue run</SectionTitle>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="run id, vd. 42"
            value={rid}
            onChange={(e) => setRid(e.target.value)}
          />
          <Btn variant="primary" onClick={requeue}>♻️ Requeue</Btn>
        </div>
      </Card>
    </AdminShell>
  );
}
