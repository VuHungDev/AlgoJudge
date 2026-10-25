'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDialog, useToast } from '@/components/feedback';
import { Badge, Btn, Card, EmptyState, ErrorBox, Field, Guard, Input, LoadingSkeleton, PageHero, Pagination, SectionTitle, Kicker, Select, Stat, Table, type PageMeta } from '@/components/ui';

interface Member { user_id: number; email: string; display_name?: string | null; role: string }
interface ProgressRow { user_id: number; email: string; display_name?: string | null; role: string; subs: number; solved: number; last_submit?: string | null }
interface ClassAssign { id: number; problem_id: number; due_at?: string | null; note?: string | null }

export default function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const { me, loading } = useAuth();
  const dialog = useDialog();
  const toast = useToast();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [memberMeta, setMemberMeta] = useState<PageMeta | null>(null);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [assigns, setAssigns] = useState<ClassAssign[]>([]);
  const [tab, setTab] = useState<'members' | 'progress' | 'assigns'>('members');
  const [q, setQ] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  const loadMembers = async (page = 1) => {
    try {
      const r = await api<{ members: Member[]; meta: PageMeta }>(`/admin/classes/${id}/members?page=${page}&per_page=20`);
      setMembers(r.members || []); setMemberMeta(r.meta || null);
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  };
  const loadProgress = async (page = 1) => {
    try {
      const r = await api<{ rows: ProgressRow[]; meta: PageMeta }>(`/admin/classes/${id}/progress?page=${page}&per_page=20`);
      setProgressRows(r.rows || []);
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  };
  const loadAssigns = async () => {
    try {
      const r = await api<{ assignments: ClassAssign[] }>(`/admin/classes/${id}/assignments?per_page=50`);
      setAssigns(r.assignments || []);
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  };

  useEffect(() => {
    if (!me || !id || (me.role !== 'teacher' && me.role !== 'admin')) return;
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([loadMembers(1), loadProgress(1), loadAssigns()]);
      } catch { /* bo qua */ }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, id]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!me) return <Guard title="Chi tiết lớp" hint="Vui lòng đăng nhập." />;
  if (me.role !== 'teacher' && me.role !== 'admin') return <Guard title="Không có quyền" hint="Chỉ giảng viên mới mở được." />;

  const filtered = members.filter((m) =>
    !q.trim() || m.email.toLowerCase().includes(q.trim().toLowerCase()) || (m.display_name || '').toLowerCase().includes(q.trim().toLowerCase()),
  );

  const addMember = async () => {
    if (!email.trim()) { toast.warning('Thiếu email', 'Nhập email học sinh cần thêm vào lớp.'); return; }
    try {
      await api(`/admin/classes/${id}/members`, { method: 'POST', body: JSON.stringify({ email: email.trim(), role: 'student' }) });
      toast.success('Đã thêm vào lớp', email.trim());
      setEmail(''); loadMembers(1);
    } catch (e: unknown) { toast.error('Không thêm được thành viên', friendlyError(e instanceof Error ? e.message : String(e))); }
  };

  if (busy) return <LoadingSkeleton rows={4} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="teach"
        kicker="Lớp học"
        title={name || `Lớp #${id}`}
        desc="Danh sách học sinh, tiến độ, bài được giao — thêm sinh viên trực tiếp tại đây."
        stat={{ label: 'Sĩ số', value: memberMeta?.total ?? members.length }}
      >
        <Link prefetch={false} className="studio-button w-fit" href="/teacher">← Về khu giảng viên</Link>
      </PageHero>
      {err && <ErrorBox message={err} />}
      <Card>
        <div className="flex gap-1.5">
          {(['members', 'progress', 'assigns'] as const).map((t) => (
            <Btn key={t} variant={tab === t ? 'primary' : 'secondary'} className="!py-1.5 text-sm" onClick={() => setTab(t)}>
              {t === 'members' ? 'Thành viên' : t === 'progress' ? 'Tiến độ' : 'Bài được giao'}
            </Btn>
          ))}
        </div>
        {tab === 'members' && (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Field label="Tìm tên / email"><Input placeholder="vd. sv@oj.local" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
              <Field label="Thêm sinh viên trực tiếp (email)">
                <span className="flex gap-2">
                  <Input placeholder="sv@oj.local" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Btn variant="primary" onClick={addMember}>Thêm</Btn>
                </span>
              </Field>
            </div>
            <Table<Member>
              columns={[
                { head: 'Học sinh', render: (m) => <span><b>{m.display_name || m.email.split('@')[0]}</b><br /><span className="studio-muted text-xs">{m.email}</span></span> },
                {
                  head: 'Vai trò', center: true,
                  render: (m) => (
                    <Select value={m.role} onChange={async (e) => {
                      try { await api(`/admin/classes/${id}/members/${m.user_id}`, { method: 'PUT', body: JSON.stringify({ role: e.target.value }) }); loadMembers(memberMeta?.page || 1); }
                      catch (er: unknown) { toast.error('Không đổi được vai trò', er instanceof Error ? er.message : String(er)); }
                    }}>
                      <option value="student">student</option>
                      <option value="assistant">assistant</option>
                    </Select>
                  ),
                },
                { head: 'Thao tác', center: true, render: (m) => <Btn className="!px-2 !py-1 text-xs" variant="danger" onClick={async () => { if (!await dialog.confirm({ title: 'Xóa thành viên?', message: `Xóa ${m.email} khỏi lớp?`, danger: true })) return; await api(`/admin/classes/${id}/members/${m.user_id}`, { method: 'DELETE' }); loadMembers(memberMeta?.page || 1); }}>Xóa</Btn> },
              ]}
              rows={filtered}
              keyOf={(m) => m.user_id}
              empty="Lớp chưa có thành viên."
            />
            <Pagination meta={memberMeta} onPage={loadMembers} />
          </>
        )}
        {tab === 'progress' && (
          <Table<ProgressRow>
            columns={[
              { head: 'Học sinh', render: (r) => <span><b>{r.display_name || r.email.split('@')[0]}</b><br /><span className="studio-muted text-xs">{r.email}</span></span> },
              { head: 'Bài nộp', center: true, render: (r) => r.subs },
              { head: 'Đã giải', center: true, render: (r) => <b className="text-primary">{r.solved}</b> },
              { head: 'Nộp cuối', render: (r) => <span className="studio-muted text-xs">{r.last_submit || '—'}</span> },
            ]}
            rows={progressRows}
            keyOf={(r) => r.user_id}
            empty="Chưa có dữ liệu tiến độ."
          />
        )}
        {tab === 'assigns' && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {assigns.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-raised p-3">
                <div>
                  <p className="font-extrabold">Bài tập #{a.problem_id}</p>
                  <p className="studio-muted text-xs">{a.due_at ? `Hạn: ${a.due_at}` : 'Không hạn'}{a.note ? ` · ${a.note}` : ''}</p>
                </div>
                <Link prefetch={false} className="studio-button studio-primary w-fit !py-1.5 text-sm" href={`/solve/${a.problem_id}`}>Xem →</Link>
              </div>
            ))}
            {assigns.length === 0 && <EmptyState title="Chưa giao bài nào" hint="Giao bài từ khu giảng viên." />}
          </div>
        )}
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="SĨ SỐ" value={memberMeta?.total ?? members.length} />
        <Stat label="CÓ BÀI NỘP" value={progressRows.filter((r) => Number(r.subs) > 0).length} accent="var(--info)" />
        <Stat label="ĐÃ GIẢI ≥1" value={progressRows.filter((r) => Number(r.solved) > 0).length} accent="var(--success)" />
      </div>
    </div>
  );
}
