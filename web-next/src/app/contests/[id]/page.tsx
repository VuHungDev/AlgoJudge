'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge, Card, EmptyState, ErrorBox, Kicker, LoadingSkeleton, PageHero, Pagination, SectionTitle, Table, type PageMeta } from '@/components/ui';

interface ContestDetail { id: number; title: string; description?: string; starts_at: string; ends_at: string; problems?: { id: number; problem_version_id: number; points: number }[] }
interface BoardRow { user_id: number; email: string; score: number; solved: number }

const BOARD_PER = 10;

export default function ContestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [boardPage, setBoardPage] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);
  useEffect(() => {
    if (!id) return;
    Promise.all([
      api<ContestDetail>(`/contests/${id}`),
      api<{ leaderboard: BoardRow[] }>(`/contests/${id}/leaderboard`),
    ]).then(([c, b]) => { setContest(c); setBoard(b.leaderboard || []); setBoardPage(1); setError(''); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  const live = contest ? new Date(contest.starts_at) <= new Date() && new Date() <= new Date(contest.ends_at) : false;
  const boardRows = board.slice((boardPage - 1) * BOARD_PER, boardPage * BOARD_PER);
  const boardMeta: PageMeta = {
    page: boardPage, per_page: BOARD_PER, total: board.length, last_page: Math.max(1, Math.ceil(board.length / BOARD_PER)),
  };

  return <div className="flex flex-col gap-5">
    {error && <ErrorBox message={error} />}
    {!contest && !error ? <LoadingSkeleton rows={4} /> : null}
    {contest && <>
      <PageHero
        zone="compete"
        kicker={`Kỳ thi số ${contest.id}`}
        title={contest.title}
        desc={`${contest.description || ''} Thời gian: ${contest.starts_at} → ${contest.ends_at}`}
        stat={{ label: live ? 'Đang diễn ra' : 'Trạng thái', value: live ? 'LIVE' : `${board.length}` }}
      >
        <Badge tone={live ? 'ok' : 'warn'}>{live ? 'ĐANG DIỄN RA' : 'ĐÃ KẾT THÚC / SẮP TỚI'}</Badge>
      </PageHero>
      <Link prefetch={false} className="studio-button studio-secondary w-fit text-sm" href="/contests">← Về danh sách kỳ thi</Link>
      <Card>
        <Kicker>Danh sách bài thi</Kicker>
        <SectionTitle sub="Bấm vào để mở phòng làm bài riêng">Bài trong kỳ thi ({contest.problems?.length || 0})</SectionTitle>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(contest.problems || []).map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised p-4">
              <div>
                <p className="font-extrabold">Bài {idx + 1} · {p.points} điểm</p>
                <p className="studio-muted text-xs">Phiên bản đề #{p.problem_version_id}</p>
              </div>
              <Link prefetch={false} className="studio-button studio-primary text-sm" href={`/solve/${p.problem_version_id}`}>Làm bài →</Link>
            </div>
          ))}
          {(contest.problems || []).length === 0 && <div className="sm:col-span-2"><EmptyState title="Kỳ thi chưa gắn bài nào" /></div>}
        </div>
      </Card>
      <Card>
        <Kicker>Bảng xếp hạng</Kicker>
        <SectionTitle sub={`${board.length} thí sinh · 10 / trang`}>Kết quả kỳ thi</SectionTitle>
        {board.length === 0 ? <div className="mt-3"><EmptyState title="Chưa có ai lên bảng" hint="Hãy là người đầu tiên ghi điểm." /></div> : (
          <>
            <Table<BoardRow>
              columns={[
                { head: 'Hạng', render: (_, i) => <b className="text-primary">#{(boardPage - 1) * BOARD_PER + i + 1}</b> },
                { head: 'Thí sinh', render: (x) => x.email },
                { head: 'Điểm', center: true, render: (x) => <b>{x.score}</b> },
                { head: 'Bài giải', center: true, render: (x) => x.solved },
              ]}
              rows={boardRows}
              keyOf={(x) => x.user_id}
            />
            <Pagination meta={boardMeta} onPage={setBoardPage} />
          </>
        )}
      </Card>
    </>}
  </div>;
}
