'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Card, EmptyState, ErrorBox, Guard, LoadingSkeleton, PageHero, Pagination, SectionTitle, Kicker, VerdictBadge } from '@/components/ui';

interface Sub { id: number; problem_version_id: number; language: string; created_at: string; verdict?: string | null; status?: string }
interface Assign { id: number; problem_id: number; class_id?: number | null; due_at?: string | null; note?: string | null; created_at?: string }
interface FeedItem { at: string; kind: 'submit' | 'assign' | 'streak'; title: string; sub: string; link: string }

export default function ActivityPage() {
  const { me, loading } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [streak, setStreak] = useState<number | null>(null);
  const [solved, setSolved] = useState<string>('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);
  const [page, setPage] = useState(1);
  const PER = 20;

  useEffect(() => {
    if (!me) return;
    Promise.all([
      api<{ submissions: Sub[] }>('/me/submissions').catch(() => ({ submissions: [] as Sub[] })),
      api<{ assignments: Assign[] }>('/me/assignments').catch(() => ({ assignments: [] as Assign[] })),
      api<{ solved?: number; total?: number }>('/me/progress').catch(() => ({}) as { solved?: number; total?: number }),
      api<{ streak?: number }>('/me/streak').catch(() => ({}) as { streak?: number }),    ])
      .then(([s, a, p, st]) => {
        if (typeof p.solved === 'number') setSolved(`${p.solved}/${p.total ?? '?'}`);
        if (typeof st.streak === 'number') setStreak(st.streak);
        const feed: FeedItem[] = [
          ...(s.submissions || []).map((x) => ({
            at: x.created_at, kind: 'submit' as const,
            title: `Nộp bài #${x.id} · ${x.language}`,
            sub: `${x.verdict || x.status || 'đang chấm'}`,
            link: `/submissions/${x.id}`,
          })),
          ...(a.assignments || []).map((x) => ({
            at: x.created_at || '', kind: 'assign' as const,
            title: `Được giao bài #${x.problem_id}`,
            sub: `${x.class_id ? `Lớp #${x.class_id}` : 'Cá nhân'}${x.due_at ? ` · Hạn ${x.due_at}` : ''}${x.note ? ` · ${x.note}` : ''}`,
            link: `/solve/${x.problem_id}`,
          })),
        ];
        feed.sort((x, y) => String(y.at).localeCompare(String(x.at)));
        setItems(feed);
      })
      .catch((e: unknown) => setErr(friendlyError(e instanceof Error ? e.message : String(e))))
      .finally(() => setBusy(false));
  }, [me]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!me) return <Guard title="Hoạt động của tôi" hint="Vui lòng đăng nhập để xem quá trình học tập." />;
  if (busy) return <LoadingSkeleton rows={4} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="learn"
        kicker="Quá trình học tập"
        title="Hoạt động của tôi"
        desc="Mọi bài nộp, bài được giao và tiến độ của bạn — mới nhất trước."
        stat={{ label: 'Đã giải', value: solved || '…' }}
      />
      {err && <ErrorBox message={err} />}
      {(streak != null) && (
        <Card>
          <Kicker>Streak</Kicker>
          <SectionTitle sub="Số ngày liên tiếp có bài nộp">🔥 {streak} ngày</SectionTitle>
        </Card>
      )}
      <Card>
        <Kicker>Dòng thời gian</Kicker>
        <SectionTitle sub={`${items.length} mục · ${PER} mục / trang`}>Nhật ký hoạt động</SectionTitle>
        <div className="mt-4 flex flex-col gap-2">
          {items.slice((page - 1) * PER, page * PER).map((it, i) => (
            <Link prefetch={false} key={`${it.kind}-${(page - 1) * PER + i}`} href={it.link} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised p-3 transition hover:border-primary">
              <div className="min-w-0">
                <p className="truncate font-bold">{it.title}</p>
                <p className="studio-muted truncate text-xs">{it.kind === 'submit' ? <VerdictBadge verdict={it.sub} /> : it.sub}{it.at ? ` · ${it.at}` : ''}</p>
              </div>
              <Badge tone={it.kind === 'submit' ? 'info' : 'warn'}>{it.kind === 'submit' ? 'Bài nộp' : 'Được giao'}</Badge>
            </Link>
          ))}
          {items.length === 0 && <EmptyState title="Chưa có hoạt động nào" hint="Làm bài đầu tiên để bắt đầu ghi nhật ký." />}
        </div>
        {items.length > PER && (
          <Pagination meta={{ page, per_page: PER, total: items.length, last_page: Math.max(1, Math.ceil(items.length / PER)) }} onPage={setPage} />
        )}
      </Card>
    </div>
  );
}
