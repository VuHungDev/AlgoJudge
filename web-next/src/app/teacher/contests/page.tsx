'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Btn, Card, EmptyState, Field, Guard, Input, Kicker, PageHero, SectionTitle, Table } from '@/components/ui';
import { useToast, useConfirm } from '@/components/feedback';

const NAV = [
  { href: '/teacher/grading', label: '← Giao bài & chấm' },
  { href: '/teacher/classes', label: 'Lớp học →' },
];

interface Contest { id: number; title: string; starts_at: string; ends_at: string; is_public: boolean; state?: string }
interface BoardRow { user_id: number; email: string; score: number; solved: number }

export default function TeacherContests() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [contests, setContests] = useState<Contest[]>([]);
  const [ctTitle, setCtTitle] = useState('');
  const [ctStart, setCtStart] = useState('');
  const [ctEnd, setCtEnd] = useState('');
  const [ctProblems, setCtProblems] = useState('');
  const [ctPublic, setCtPublic] = useState(false);
  const [ctUserIds, setCtUserIds] = useState('');
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [selectedCid, setSelectedCid] = useState<number | null>(null);

  const err = (e: unknown) => friendlyError(e instanceof Error ? e.message : String(e));

  const load = useCallback(async () => {
    try {
      const r = await api<{ contests: Contest[] }>('/contests');
      setContests(r.contests || []);
    } catch (e: unknown) { toast.error('Không tải được danh sách kỳ thi', err(e)); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return null;
  if (!me || (me.role !== 'teacher' && me.role !== 'admin')) return <Guard title="Không có quyền" hint="Chỉ giảng viên mới vào được trang này." />;

  const create = async () => {
    if (!ctTitle.trim() || !ctStart || !ctEnd || !ctProblems.trim()) { toast.warning('Thiếu thông tin', 'Nhập đủ tiêu đề, thời gian và danh sách bài.'); return; }
    try {
      const pvs = ctProblems.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
      if (!pvs.length) { toast.error('Danh sách bài không hợp lệ', 'Cần ít nhất một problem_version_id dương.'); return; }
      // Danh sach user_ids khi contest khong cong khai (chi teacher, admin moi set public).
      const userIds = ctPublic ? [] : ctUserIds.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
      const r = await api<{ contest_id: number }>('/admin/contests', {
        method: 'POST',
        body: JSON.stringify({
          title: ctTitle.trim(),
          starts_at: new Date(ctStart).toISOString().slice(0, 19).replace('T', ' '),
          ends_at: new Date(ctEnd).toISOString().slice(0, 19).replace('T', ' '),
          is_public: me.role === 'admin' ? ctPublic : false,
          user_ids: userIds.length ? userIds : undefined,
          problems: pvs.map((problem_version_id) => ({ problem_version_id })),
        }),
      });
      toast.success('Đã tạo kỳ thi', `Contest #${r.contest_id} · ${ctTitle.trim()}`);
      setCtTitle(''); setCtProblems(''); setCtUserIds(''); setCtPublic(false);
      load();
    } catch (e: unknown) { toast.error('Không tạo được kỳ thi', err(e)); }
  };

  const del = async (c: Contest) => {
    const ok = await confirm({
      title: 'Xóa kỳ thi',
      message: `Contest #${c.id} "${c.title}" và bảng điểm sẽ bị xóa.`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/admin/contests/${c.id}`, { method: 'DELETE' });
      toast.success('Đã xóa kỳ thi', `${c.title} · #${c.id}`);
      load();
    } catch (e: unknown) { toast.error('Không xóa được', err(e)); }
  };

  const loadBoard = async (cid: number) => {
    setSelectedCid(cid);
    try {
      const r = await api<{ leaderboard: BoardRow[] }>(`/contests/${cid}/leaderboard`);
      setBoard(r.leaderboard || []);
    } catch (e: unknown) { toast.error('Không tải được bảng xếp hạng', err(e)); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHero zone="teach" kicker="Khu giảng viên" title="Kỳ thi" desc="Tạo contest, quản lý và xem bảng xếp hạng." glow="accent" />

      <nav className="flex flex-wrap gap-2">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-muted transition hover:border-accent hover:text-accent">{n.label}</Link>
        ))}
      </nav>

      <Card>
        <Kicker>Tạo contest</Kicker>
        <SectionTitle sub="Điền đầy đủ thông tin để tạo kỳ thi mới">Contest mới</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Tên contest"><Input placeholder="Weekly #12" value={ctTitle} onChange={(e) => setCtTitle(e.target.value)} /></Field>
          <Field label="Problem version IDs (cách nhau dấu phẩy)"><Input placeholder="1, 2, 3" value={ctProblems} onChange={(e) => setCtProblems(e.target.value)} /></Field>
          <Field label="Bắt đầu"><Input type="datetime-local" value={ctStart} onChange={(e) => setCtStart(e.target.value)} /></Field>
          <Field label="Kết thúc"><Input type="datetime-local" value={ctEnd} onChange={(e) => setCtEnd(e.target.value)} /></Field>
          {me.role === 'admin' && (
            <Field label="Quyền truy cập">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={ctPublic} onChange={(e) => setCtPublic(e.target.checked)} className="h-4 w-4 rounded" />
                <span>Công khai (ai cũng tham gia được)</span>
              </label>
            </Field>
          )}
          {!ctPublic && (
            <Field label="Danh sách user_id được phép (cách nhau dấu phẩy, bỏ trống = không giới hạn nội bộ)">
              <Input placeholder="101, 202, 303" value={ctUserIds} onChange={(e) => setCtUserIds(e.target.value)} />
            </Field>
          )}
        </div>
        <Btn variant="primary" className="mt-3" onClick={create}>🏆 Tạo contest</Btn>
      </Card>

      <Card>
        <Kicker>Danh sách</Kicker>
        <SectionTitle sub="Bấm Bảng để xem leaderboard">Contest ({contests.length})</SectionTitle>
        <div className="mt-4 grid gap-2">
          {contests.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised p-4">
              <div className="min-w-0 flex-1">
                <b>#{c.id} {c.title}</b>
                <p className="mt-1 text-xs text-muted">{c.starts_at} → {c.ends_at}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${c.is_public ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                  {c.is_public ? 'Công khai' : 'Giới hạn'}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Btn className="!px-2 !py-1 text-xs" onClick={() => loadBoard(c.id)}>
                  {selectedCid === c.id ? '▲ Đóng' : '▼ Bảng'}
                </Btn>
                <Btn className="!px-2 !py-1 text-xs" variant="danger" onClick={() => del(c)}>Xóa</Btn>
              </div>
            </div>
          ))}
          {contests.length === 0 && <EmptyState title="Chưa có contest nào" hint="Tạo contest đầu tiên bên trên." />}
        </div>
        {selectedCid && board.length > 0 && (
          <div className="mt-4">
            <SectionTitle sub={`Bảng xếp hạng contest #${selectedCid}`}>Leaderboard</SectionTitle>
            <Table<BoardRow>
              columns={[
                { head: '#', render: (_, i) => <b className="text-muted">#{i + 1}</b> },
                { head: 'Email', render: (r) => <span className="text-sm">{r.email}</span> },
                { head: 'Điểm', center: true, render: (r) => <b className="text-primary">{r.score}</b> },
                { head: 'Bài giải', center: true, render: (r) => r.solved },
              ]}
              rows={board}
              keyOf={(r) => r.user_id}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
