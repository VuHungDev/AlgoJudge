'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Btn, Card, EmptyState, Field, Input, Kicker, Pagination, SectionTitle, Table, type PageMeta } from '@/components/ui';
import { AdminShell, errText } from '../shared';

interface ProgressRow { user_id: number; email: string; display_name?: string | null; subs: number; solved: number; last_submit?: string | null }
interface Contest { id: number; title: string; starts_at: string; ends_at: string; is_public: boolean }
interface BoardRow { user_id: number; email: string; score: number; solved: number }

export default function OpsProgress() {
  const [pgClass, setPgClass] = useState('');
  const [pgRows, setPgRows] = useState<ProgressRow[]>([]);
  const [pgMeta, setPgMeta] = useState<PageMeta | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [lbRows, setLbRows] = useState<BoardRow[]>([]);
  const [lbCid, setLbCid] = useState('');
  const [editAccessCid, setEditAccessCid] = useState<number | null>(null);
  const [accessPublic, setAccessPublic] = useState(false);
  const [accessUserIds, setAccessUserIds] = useState('');
  const [error, setError] = useState('');

  const loadContests = useCallback(async () => {
    try {
      const r = await api<{ contests: Contest[] }>('/contests');
      setContests(r.contests || []);
    } catch (e: unknown) { setError(errText(e)); }
  }, []);

  useEffect(() => { loadContests(); }, [loadContests]);

  const loadProgress = async (page = 1) => {
    if (!pgClass.trim()) { setError('Nhập class_id để xem tiến độ.'); return; }
    try {
      const r = await api<{ rows: ProgressRow[]; meta: PageMeta }>(`/admin/classes/${pgClass.trim()}/progress?page=${page}&per_page=15`);
      setPgRows(r.rows || []); setPgMeta(r.meta || null); setError('');
    } catch (e: unknown) { setError(errText(e)); }
  };

  const loadBoard = async (cid: string) => {
    setLbCid(cid);
    try {
      const r = await api<{ leaderboard: BoardRow[] }>(`/contests/${cid}/leaderboard`);
      setLbRows(r.leaderboard || []);
    } catch (e: unknown) { setError(errText(e)); }
  };

  return (
    <AdminShell title="Tiến độ & Contest (chỉ xem)" desc="Admin xem tiến độ lớp và leaderboard — KHÔNG chấm điểm.">
      {error && <Card><p className="text-sm text-danger">⚠️ {error}</p></Card>}

      <Card>
        <Kicker>Progress · view-only</Kicker>
        <SectionTitle sub="Nhập class_id để xem bảng tiến độ học sinh">Tiến độ theo lớp</SectionTitle>
        <p className="mt-2 text-sm text-muted">⚠️ Chấm điểm và feedback do giáo viên thực hiện.</p>
        <div className="mt-4 flex gap-2">
          <Input placeholder="class_id, vd. 2" value={pgClass} onChange={(e) => setPgClass(e.target.value)} className="!w-40" />
          <Btn variant="primary" onClick={() => loadProgress(1)}>Xem tiến độ</Btn>
        </div>
        <Table<ProgressRow>
          columns={[
            { head: 'Học sinh', render: (r) => <span><b>{r.display_name || r.email.split('@')[0]}</b><br /><span className="text-xs text-muted">{r.email}</span></span> },
            { head: 'Bài nộp', center: true, render: (r) => r.subs },
            { head: 'Đã giải', center: true, render: (r) => <b className="text-primary">{r.solved}</b> },
            { head: 'Nộp cuối', render: (r) => <span className="text-xs text-muted">{r.last_submit || '—'}</span> },
          ]}
          rows={pgRows}
          keyOf={(r) => r.user_id}
          empty="Nhập class_id rồi bấm Xem tiến độ."
        />
        <Pagination meta={pgMeta} onPage={loadProgress} />
      </Card>

      <Card>
        <Kicker>Contests · view-only</Kicker>
        <SectionTitle sub="Bấm vào contest để xem leaderboard">Kỳ thi ({contests.length})</SectionTitle>
        <p className="mt-2 text-sm text-muted">⚠️ Tạo / quản lý contest do giáo viên thực hiện.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {contests.map((c) => (
            <button key={c.id} onClick={() => loadBoard(String(c.id))}
              className={`rounded-xl border p-4 text-left transition ${lbCid === String(c.id) ? 'border-primary bg-primary/10' : 'border-border bg-surface-raised hover:border-primary/60'}`}>
              <p className="font-extrabold">{c.title}</p>
              <p className="mt-1 text-xs text-muted">#{c.id} · {c.starts_at} → {c.ends_at}</p>
            </button>
          ))}
          {contests.length === 0 && <div className="sm:col-span-2"><EmptyState title="Chưa có kỳ thi nào" hint="Giáo viên tạo contest từ khu giảng viên." /></div>}
        </div>
        {lbCid && (
          <Table<BoardRow>
            columns={[
              { head: 'Thí sinh', render: (r) => <span className="text-xs">{r.email} · #{r.user_id}</span> },
              { head: 'Điểm', center: true, render: (r) => <b className="text-primary">{r.score}</b> },
              { head: 'Đã giải', center: true, render: (r) => r.solved },
            ]}
            rows={lbRows}
            keyOf={(r) => r.user_id}
            empty="Contest này chưa có bảng xếp hạng."
          />
        )}
      </Card>
    </AdminShell>
  );
}
