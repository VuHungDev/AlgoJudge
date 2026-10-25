'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, EmptyState, ErrorBox, Guard, LoadingSkeleton, PageHero, SectionTitle, Kicker } from '@/components/ui';

interface Assignment {
  id: number; problem_id: number; class_id?: number | null; user_id?: number | null;
  due_at?: string | null; note?: string | null; created_at?: string;
}

interface MyClass {
  id: number; name: string; my_role: string; members_count: number;
  assignments_count: number; next_due_at?: string | null;
}

export default function AssignmentsPage() {
  const { me, loading } = useAuth();
  const [rows, setRows] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<MyClass[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!me) return;
    Promise.all([
      api<{ assignments: Assignment[] }>('/me/assignments'),
      api<{ classes: MyClass[] }>('/me/classes').catch(() => ({ classes: [] as MyClass[] })),
    ])
      .then(([a, c]) => { setRows(a.assignments || []); setClasses(c.classes || []); })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  }, [me]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!me) return <Guard title="Bài được giao" hint="Vui lòng đăng nhập để xem bài tập được giao." />;
  if (busy) return <LoadingSkeleton rows={4} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="learn"
        kicker="Không gian học tập"
        title="Bài được giao"
        desc="Bài tập giáo viên giao riêng cho bạn hoặc cho cả lớp. Bấm vào để mở phòng làm bài."
        stat={{ label: 'Bài được giao', value: rows.length }}
      />
      {err && <ErrorBox message={err} />}
      <Card>
        <Kicker>Lớp học của tôi</Kicker>
        <SectionTitle sub="Bấm vào lớp để xem giáo viên, bạn cùng lớp và bài được giao">Bạn đang học {classes.length} lớp</SectionTitle>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {classes.map((c) => (
            <Link prefetch={false} key={c.id} href={`/classes/${c.id}`} className="flex flex-col gap-1 rounded-xl border border-border bg-surface-raised p-4 transition hover:border-primary">
              <p className="font-extrabold">{c.name}</p>
              <p className="studio-muted text-xs">
                👥 {c.members_count} thành viên · 📝 {c.assignments_count} bài được giao
                {c.next_due_at ? ` · ⏰ Hạn gần nhất: ${c.next_due_at}` : ''}
              </p>
              <span className="text-sm font-bold text-primary">Xem lớp học →</span>
            </Link>
          ))}
          {classes.length === 0 && <div className="sm:col-span-2"><EmptyState title="Chưa tham gia lớp nào" hint="Giáo viên thêm bạn vào lớp bằng email tài khoản." /></div>}
        </div>
      </Card>
      <Card>
        <Kicker>Danh sách</Kicker>
        <SectionTitle sub="Sắp xếp mới nhất trước">Bài tập phải làm ({rows.length})</SectionTitle>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {rows.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface-raised p-4">
              <p className="font-extrabold">Bài tập #{a.problem_id}</p>
              <p className="studio-muted text-xs">
                {a.class_id ? `Giao cả lớp #${a.class_id}` : 'Giao cá nhân'}
                {a.due_at ? ` · Hạn: ${a.due_at}` : ' · Không hạn'}
              </p>
              {a.note && <p className="text-sm">“{a.note}”</p>}
              <Link prefetch={false} className="studio-button studio-primary w-fit !py-2 text-sm" href={`/solve/${a.problem_id}`}>Làm bài →</Link>
            </div>
          ))}
          {rows.length === 0 && <div className="sm:col-span-2"><EmptyState title="Chưa có bài nào được giao" hint="Giáo viên sẽ giao bài riêng hoặc cho cả lớp tại đây." /></div>}
        </div>
      </Card>
    </div>
  );
}
