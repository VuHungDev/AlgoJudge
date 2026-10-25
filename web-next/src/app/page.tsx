'use client';

// Trang chu (Home): chi hien khi da dang nhap.
// Chua login -> chuyen ve /welcome (logo + khung auth giua man hinh).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, Problem } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, DiffBadge, EmptyState, ErrorBox, Field, Input, Kicker, LoadingSkeleton, PageHero, Pagination, SectionTitle, Select, type PageMeta } from '@/components/ui';

export default function Home() {
  const { me, loading } = useAuth();
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [progress, setProgress] = useState<{ solved: number; total: number } | null>(null);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState('');
  const [probMeta, setProbMeta] = useState<PageMeta | null>(null);

  const load = useCallback(async (page = 1) => {
    setListLoading(true); setListErr('');
    try {
      const qs = new URLSearchParams();
      if (topic) qs.set('topic', topic);
      if (difficulty) qs.set('difficulty', difficulty);
      qs.set('page', String(page));
      qs.set('per_page', '10');
      const [p, pr] = await Promise.all([
        api<{ problems: Problem[]; meta: PageMeta }>(`/problems${qs.toString() ? `?${qs}` : ''}`),
        api<{ solved: number; total: number }>('/me/progress'),
      ]);
      setProblems(p.problems || []);
      setProbMeta(p.meta || null);
      setProgress(pr);
    } catch (e: unknown) { setListErr(e instanceof Error ? e.message : String(e)); }
    finally { setListLoading(false); }
  }, [topic, difficulty]);

  useEffect(() => {
    if (!loading && !me) router.replace('/welcome');
  }, [loading, me, router]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { if (me) void load(); }, [me, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const topics = [...new Set(problems.map((p) => p.topic).filter(Boolean))];
  const visibleProblems = problems.filter((x) => `${x.title} ${x.topic} ${x.slug}`.toLowerCase().includes(query.trim().toLowerCase()));

  if (loading) return <LoadingSkeleton rows={4} />;

  // Route guard: chua login thi ve welcome, khong render Home.
  if (!me) return null;

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="learn"
        kicker="Không gian học tập"
        title="Bài tập của tôi"
        desc="Tìm bài theo tên hoặc mã, lọc theo chủ đề và độ khó, bấm vào để mở phòng làm bài riêng."
        stat={{ label: 'Đã giải', value: `${progress?.solved ?? 0}/${progress?.total ?? 0}` }}
      />

      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
          <Field label="Tìm bài tập">
            <Input placeholder="Nhập tên hoặc mã bài tập" value={query} onChange={(e) => setQuery(e.target.value)} />
          </Field>
          <Field label="Chủ đề">
            <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">Mọi chủ đề</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Độ khó">
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">Mọi độ khó</option>
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <Kicker>Danh sách bài tập</Kicker>
        <SectionTitle sub={`${probMeta?.total ?? visibleProblems.length} bài · 10 bài / trang`}>Chọn bài để làm</SectionTitle>
        {listErr && <div className="mt-3"><ErrorBox message={listErr} onRetry={() => load(1)} /></div>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {listLoading ? <div className="sm:col-span-2"><LoadingSkeleton rows={4} /></div> : visibleProblems.map((x) => (
            <Link prefetch={false} key={x.id} href={`/solve/${x.id}`} className="studio-card studio-card-hover flex flex-col gap-2 !p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="studio-title text-lg">{x.title}</p>
                <DiffBadge d={x.difficulty} />
              </div>
              <p className="studio-muted text-sm">Mã bài: {x.slug} · Chủ đề: {x.topic || '—'}</p>
              <span className="studio-button studio-primary mt-2 w-fit !py-2 text-sm">Mở phòng làm bài →</span>
            </Link>
          ))}
        </div>
        {!listLoading && visibleProblems.length === 0 && !listErr && (
          <div className="mt-4"><EmptyState title="Không tìm thấy bài phù hợp" hint="Thử nới lỏng từ khóa hoặc bộ lọc." /></div>
        )}
        <Pagination meta={probMeta} onPage={(p) => load(p)} />
      </Card>
    </div>
  );
}
