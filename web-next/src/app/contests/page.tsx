'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Btn, Card, EmptyState, Guard, Input, Kicker, PageHero, Pagination, SectionTitle, Stat, Table, type PageMeta } from '@/components/ui';

interface ContestItem { id: number; title: string; description?: string; starts_at: string; ends_at: string }
interface BoardRow { user_id: number; email: string; score: number; solved: number }

const BOARD_PER = 10;

export default function Contests() {
  const { me, loading } = useAuth();
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [contestMeta, setContestMeta] = useState<PageMeta | null>(null);
  const [cid, setCid] = useState('');
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [boardPage, setBoardPage] = useState(1);

  const loadContests = useCallback(async (page = 1) => {
    try {
      const r = await api<{ contests: ContestItem[]; meta: PageMeta }>(`/contests?page=${page}&per_page=10`);
      setContests(r.contests || []); setContestMeta(r.meta || null);
    } catch { /* giu danh sach cu */ }
  }, []);

  useEffect(() => { loadContests(1); }, [loadContests]);

  const loadBoard = async () => {
    if (!cid.trim()) return;
    try {
      const r = await api<{ leaderboard: BoardRow[] }>(`/contests/${cid}/leaderboard`);
      setBoard(r.leaderboard || []); setBoardPage(1);
    } catch { /* giu board cu */ }
  };

  if (loading) return <Guard title="Đang tải contests…" />;

  const boardPages = Math.max(1, Math.ceil(board.length / BOARD_PER));
  const boardRows = board.slice((boardPage - 1) * BOARD_PER, boardPage * BOARD_PER);
  const boardMeta: PageMeta = { page: boardPage, per_page: BOARD_PER, total: board.length, last_page: boardPages };

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="compete"
        kicker="Compete"
        title="Contest & bảng xếp hạng"
        desc="Tham gia kỳ thi, xem lịch thi và leo bảng xếp hạng."
        glow="primary"
      />

      <Card>
        <Kicker>Season</Kicker>
        <SectionTitle sub="10 contest / trang">Danh sách contest</SectionTitle>
        <div className="mt-4 grid gap-2">
          {contests.map((c) => (
            <a
              key={c.id}
              href={`/contests/${c.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised p-4 transition hover:border-primary"
            >
              <div className="min-w-0 flex-1">
                <b>#{c.id} {c.title}</b>
                <p className="studio-muted text-xs">{c.starts_at} → {c.ends_at}</p>
              </div>
              <span className="studio-badge shrink-0">MỞ →</span>
            </a>
          ))}
          {contests.length === 0 && <EmptyState title="Chưa có contest nào" hint="Quay lại sau khi giảng viên tạo mùa giải mới." />}
        </div>
        <Pagination meta={contestMeta} onPage={loadContests} />
        <div className="mt-4 flex gap-2">
          <Input className="w-36" placeholder="contest_id" value={cid} onChange={(e) => setCid(e.target.value)} />
          <Btn onClick={loadBoard}>Xem leaderboard</Btn>
        </div>
      </Card>

      {board.length > 0 && (
        <Card>
          <Kicker>Podium</Kicker>
          <SectionTitle sub={`${board.length} thí sinh · 10 / trang`}>Bảng xếp hạng</SectionTitle>
          <Table<BoardRow>
            columns={[
              {
                head: '#', render: (_, i) => {
                  const rank = (boardPage - 1) * BOARD_PER + i;
                  const color = rank === 0 ? 'var(--warning)' : rank === 1 ? '#cbd5e1' : rank === 2 ? '#d08a4e' : 'var(--muted)';
                  return <b style={{ color }}>#{rank + 1}</b>;
                },
              },
              { head: 'Email', render: (b) => b.email },
              { head: 'Điểm', center: true, render: (b) => <b>{b.score}</b> },
              { head: 'Bài giải', center: true, render: (b) => b.solved },
            ]}
            rows={boardRows}
            keyOf={(b) => b.user_id}
          />
          <Pagination meta={boardMeta} onPage={setBoardPage} />
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Stat label="TOP 1" value={board[0]?.email.split('@')[0] || '—'} sub={`${board[0]?.score ?? 0} điểm`} accent="var(--warning)" />
            <Stat label="THÍ SINH" value={board.length} />
            <Stat label="TỔNG ĐIỂM" value={board.reduce((a, b) => a + b.score, 0)} />
          </div>
        </Card>
      )}

      {me?.role === 'teacher' && (
        <Card>
          <Kicker>Lưu ý</Kicker>
          <SectionTitle>Quản lý contest</SectionTitle>
          <p className="mt-2 text-sm text-muted">Tạo, sửa, xóa contest từ <a href="/teacher#ky-thi" className="text-primary underline">Khu giảng viên → Kỳ thi</a>.</p>
        </Card>
      )}
    </div>
  );
}
