'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Card, EmptyState, ErrorBox, Guard, LoadingSkeleton, PageHero, SectionTitle, Kicker } from '@/components/ui';

interface Mate { user_id: number; email: string; display_name?: string | null; role: string }
interface ClassAssign { id: number; problem_id: number; due_at?: string | null; note?: string | null }
interface ClassDetail {
  class: { id: number; name: string };
  teachers: Mate[];
  mates: Mate[];
  members_total: number;
  assignments: ClassAssign[];
}

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const { me, loading } = useAuth();
  const [data, setData] = useState<ClassDetail | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);
  useEffect(() => {
    if (!me || !id) return;
    api<ClassDetail>(`/classes/${id}`)
      .then(setData)
      .catch((e: unknown) => setErr(friendlyError(e instanceof Error ? e.message : String(e))))
      .finally(() => setBusy(false));
  }, [me, id]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!me) return <Guard title="Lớp học" hint="Vui lòng đăng nhập để xem thông tin lớp." />;
  if (busy) return <LoadingSkeleton rows={4} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="learn"
        kicker="Lớp học"
        title={data?.class.name || `Lớp #${id}`}
        desc={`Sĩ số ${data?.members_total ?? '…'} · ${data?.assignments.length ?? '…'} bài được giao`}
        stat={{ label: 'Thành viên', value: data?.members_total ?? 0 }}
      />
      {err && <ErrorBox message={err} />}
      <Card>
        <Kicker>Giáo viên</Kicker>
        <SectionTitle>Người phụ trách ({data?.teachers.length ?? 0})</SectionTitle>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(data?.teachers || []).map((t) => (
            <div key={t.user_id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-3">
              <span className="obe-logo !h-10 !w-10 !text-base">{((t.display_name || t.email)[0] || '?').toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{t.display_name || t.email.split('@')[0]}</p>
                <p className="studio-muted truncate text-xs">{t.email}</p>
              </div>
              <Badge tone="warn">{t.role}</Badge>
            </div>
          ))}
          {data && data.teachers.length === 0 && <div className="sm:col-span-2"><EmptyState title="Chưa có giáo viên" hint="Liên hệ quản trị viên để được hỗ trợ." /></div>}
        </div>
      </Card>
      <Card>
        <Kicker>Bài tập</Kicker>
        <SectionTitle>Được giao cho lớp ({data?.assignments.length ?? 0})</SectionTitle>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(data?.assignments || []).map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-raised p-3">
              <div>
                <p className="font-extrabold">Bài tập #{a.problem_id}</p>
                <p className="studio-muted text-xs">{a.due_at ? `Hạn: ${a.due_at}` : 'Không hạn'}{a.note ? ` · ${a.note}` : ''}</p>
              </div>
              <Link prefetch={false} className="studio-button studio-primary w-fit !py-1.5 text-sm" href={`/solve/${a.problem_id}`}>Làm →</Link>
            </div>
          ))}
          {data && data.assignments.length === 0 && <div className="sm:col-span-2"><EmptyState title="Chưa có bài nào" hint="Giáo viên sẽ giao bài tại đây." /></div>}
        </div>
      </Card>
      <Card>
        <Kicker>Thành viên</Kicker>
        <SectionTitle sub="Hiển thị tối đa 50 bạn">Bạn cùng lớp ({data?.members_total ?? 0})</SectionTitle>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(data?.mates || []).map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-3">
              <span className="obe-logo !h-10 !w-10 !text-base !bg-accent">{((m.display_name || m.email)[0] || '?').toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{m.display_name || m.email.split('@')[0]}</p>
                <p className="studio-muted truncate text-xs">{m.email}</p>
              </div>
              <Badge tone={m.role === 'student' ? 'info' : 'warn'}>{m.role}</Badge>
            </div>
          ))}
          {data && data.mates.length === 0 && <div className="sm:col-span-2"><EmptyState title="Chưa có thành viên" hint="" /></div>}
        </div>
        <Link prefetch={false} className="studio-button mt-4 w-fit !py-2 text-sm" href="/assignments">← Về bài được giao</Link>
      </Card>
    </div>
  );
}
