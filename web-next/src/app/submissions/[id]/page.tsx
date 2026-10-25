'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Btn, Card, CodeBlock, Guard, Kicker, PageHero, SectionTitle, Stat, Table, VerdictBadge } from '@/components/ui';

interface CaseRow { verdict: string; time_ms?: number; memory_kb?: number }
interface SubmissionResult { status?: string; verdict?: string | null; score?: number; attempt?: number; language?: string }

export default function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [result, setResult] = useState<(SubmissionResult & { cases?: CaseRow[] }) | null>(null);
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('');
  const [review, setReview] = useState<{ score?: number | null; comment?: string | null } | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [r, c, rv] = await Promise.all([
        api<SubmissionResult & { cases?: CaseRow[] }>(`/submissions/${id}`),
        api<{ source_code?: string; language?: string }>(`/submissions/${id}/code`),
        api<{ score?: number | null; comment?: string | null }>(`/submissions/${id}/review`).catch(() => null),
      ]);
      setResult(r); setCode(c.source_code || ''); setLang(c.language || r.language || ''); setReview(rv); setError('');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  }, [id]);
  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  const cases = result?.cases || [];
  const passed = cases.filter((c) => c.verdict === 'ACCEPTED').length;

  if (!result && !error) return <Card><p className="studio-muted">Đang tải kết quả…</p></Card>;
  if (error) return <Guard title="Không mở được bài nộp" hint={error} />;

  // Trang kết quả gọn: verdict lớn, điểm, ca đúng/sai, nhận xét GV, link quay về.
  const isQueued = result?.status === 'QUEUED' || result?.status === 'RUNNING';
  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="learn"
        kicker={`Bài nộp #${id}`}
        title={isQueued ? 'Đang chấm…' : (result?.verdict ?? '—')}
        accent={result?.verdict || '…'}
        glow={result?.verdict === 'ACCEPTED' ? 'primary' : 'danger'}
      >
        <VerdictBadge verdict={result?.verdict} />
        {lang && <span className="studio-badge">{lang}</span>}
        {isQueued && <Btn onClick={load}>Làm mới</Btn>}
      </PageHero>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Điểm tự động" value={result?.score ?? 0} accent="var(--primary)" />
        <Stat label="Ca đúng" value={`${passed} / ${cases.length}`} accent="var(--success)" />
        <Stat label="Trạng thái" value={result?.status || '—'} />
      </div>

      {cases.length > 0 && (
        <Card>
          <Kicker>Chi tiết từng ca</Kicker>
          <SectionTitle sub={`${passed}/${cases.length} ca đúng`}>Kết quả</SectionTitle>
          <Table<CaseRow>
            columns={[
              { head: 'Ca', render: (_, i) => <b>#{i + 1}</b> },
              { head: 'Kết quả', render: (c) => <VerdictBadge verdict={c.verdict} /> },
              { head: 'Thời gian', center: true, render: (c) => <span className="studio-muted">{c.time_ms ?? 0} ms</span> },
              { head: 'Bộ nhớ', center: true, render: (c) => <span className="studio-muted">{c.memory_kb != null ? `${c.memory_kb} KB` : '—'}</span> },
            ]}
            rows={cases}
            keyOf={(_, i) => i}
            empty="Đang chờ kết quả…"
          />
        </Card>
      )}

      {(review?.score != null || review?.comment) && (
        <Card>
          <Kicker>Nhận xét giảng viên</Kicker>
          <SectionTitle>Điểm & phản hồi</SectionTitle>
          <p className="studio-title mt-3 text-3xl text-primary">
            {review.score ?? '—'}<span className="studio-muted text-base"> / 100</span>
          </p>
          {review.comment && (
            <p className="mt-2 rounded-xl border border-border bg-surface-raised p-3 text-sm italic">&ldquo;{review.comment}&rdquo;</p>
          )}
        </Card>
      )}

      <Card>
        <Kicker>Mã nguồn</Kicker>
        <SectionTitle>Code đã nộp</SectionTitle>
        <div className="mt-3"><CodeBlock title={`bài nộp #${id}`} code={code || '…'} lang={lang} /></div>
      </Card>

      <Link prefetch={false} className="studio-button studio-secondary w-fit" href="/">← Về trang bài tập</Link>
    </div>
  );
}
