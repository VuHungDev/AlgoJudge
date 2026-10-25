'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Btn, Card, Kicker } from '@/components/ui';

interface Progress { solved: number; total: number }
interface Streak { streak: number; total_days: number }
interface Recommend { id: number; title: string; topic?: string; difficulty?: string }

export default function ProgressPage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [recommend, setRecommend] = useState<Recommend | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, s, r] = await Promise.all([
        api<Progress>('/me/progress'),
        api<Streak>('/me/streak'),
        api<{ recommend: Recommend }>('/me/recommend'),
      ]);
      setProgress(p); setStreak(s); setRecommend(r.recommend);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const pct = progress && progress.total > 0 ? Math.round((progress.solved / progress.total) * 100) : 0;

  return <div className="flex flex-col gap-5">
    <section className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-7 sm:px-8">
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <Kicker>HÀNH TRÌNH</Kicker>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Tiến độ học tập</h1>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {loading ? <p className="studio-muted mt-3">Đang tải…</p> : (
        <>
          <p className="mt-3 text-3xl font-bold"><span className="text-primary">{progress?.solved ?? 0}</span><span className="studio-muted text-xl">/{progress?.total ?? 0} bài</span></p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="studio-muted mt-2 text-sm">{pct}% hành trình · Streak <b className="text-primary">{streak?.streak ?? 0}</b> ngày liên tiếp · tổng <b>{streak?.total_days ?? 0}</b> ngày có bài</p>
        </>
      )}
      <Btn className="mt-4" onClick={load} disabled={loading}>Làm mới</Btn>
    </section>
    <Card>
      <Kicker>GỢI Ý BÀI TIẾP THEO</Kicker>
      <h2 className="mt-2 text-2xl font-black">Gợi ý bài tiếp theo</h2>
      {recommend ? <>
        <p className="mt-3 text-lg font-bold">#{recommend.id} {recommend.title}</p>
        <p className="studio-muted text-sm">{recommend.topic} · {recommend.difficulty}</p>
        <Link prefetch={false} className="studio-button studio-primary mt-4 inline-block" href={`/?problem=${recommend.id}`}>Mở bài ngay →</Link>
      </> : <p className="studio-muted mt-3">Chưa có gợi ý — hãy giải thêm vài bài.</p>}
    </Card>
  </div>;
}

