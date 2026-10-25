'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Card, EmptyState, ErrorBox, Guard, Kicker, LoadingSkeleton, PageHero, SectionTitle } from '@/components/ui';

interface Clazz {
  id: number;
  name: string;
  my_role: string;        // vai trò của tôi trong lớp này (student | teacher | assistant)
  members_count?: number;
  assignments_count?: number;
  next_due_at?: string | null;
}

export default function ClassesPage() {
  const { me, loading } = useAuth();
  const [classes, setClasses] = useState<Clazz[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!me) return;
    api<{ classes: Clazz[] }>('/me/classes')
      .then((r) => setClasses(r.classes || []))
      .catch((e: unknown) => setErr(friendlyError(e instanceof Error ? e.message : String(e))))
      .finally(() => setBusy(false));
  }, [me]);

  if (loading) return <LoadingSkeleton rows={3} />;
  if (!me) return <Guard title="Lớp học" hint="Vui lòng đăng nhập để xem lớp học của bạn." />;

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="learn"
        kicker="HỌC TẬP"
        title="Lớp của tôi"
        desc="Danh sách các lớp bạn đang tham gia."
        stat={{ label: 'Lớp', value: classes.length }}
      />
      {err && <ErrorBox message={err} />}

      {busy ? (
        <LoadingSkeleton rows={3} />
      ) : classes.length === 0 ? (
        <Card>
          <EmptyState
            title="Bạn chưa ở trong lớp nào"
            hint="Giáo viên sẽ thêm bạn vào lớp. Liên hệ giáo viên của bạn để được thêm."
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {classes.map((c) => (
            <Link
              key={c.id}
              href={`/classes/${c.id}`}
              className="group flex flex-col gap-2 rounded-2xl border border-border bg-surface-raised p-5 transition hover:border-primary/60 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Kicker>{c.my_role === 'teacher' ? 'GIẢNG VIÊN' : 'HỌC SINH'}</Kicker>
                  <p className="mt-1 truncate text-lg font-extrabold group-hover:text-primary">{c.name}</p>
                </div>
                <Badge tone={c.my_role === 'teacher' ? 'warn' : 'info'}>{c.my_role}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                {c.members_count != null && <span>👥 {c.members_count} thành viên</span>}
                {c.assignments_count != null && <span>📋 {c.assignments_count} bài giao</span>}
                {c.next_due_at && <span>⏰ hạn gần nhất: {new Date(c.next_due_at).toLocaleDateString('vi-VN')}</span>}
              </div>
              <p className="text-sm font-semibold text-primary opacity-0 transition group-hover:opacity-100">Xem chi tiết →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
