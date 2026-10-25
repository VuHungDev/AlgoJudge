'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Btn, Card, EmptyState, Field, Guard, Input, Kicker, PageHero, SectionTitle, Select, Table } from '@/components/ui';
import { useToast, useConfirm } from '@/components/feedback';

const NAV = [
  { href: '/teacher/stats', label: '← Thống kê' },
  { href: '/teacher', label: 'Tổng quan →' },
];

interface Clazz { id: number; name: string; members_count?: number; assignments_count?: number }
interface Member { id: number; email: string; display_name?: string | null; role: string }
interface ProgressRow { user_id: number; email: string; display_name?: string | null; subs: number; solved: number; last_submit?: string | null }
interface Assignment { id: number; problem_slug?: string; problem_title?: string; due_at?: string | null; note?: string | null }

type TabId = 'members' | 'progress' | 'assignments' | 'stats';
const TABS: { id: TabId; label: string }[] = [
  { id: 'members', label: '👥 Thành viên' },
  { id: 'progress', label: '📈 Tiến độ' },
  { id: 'assignments', label: '📝 Bài được giao' },
  { id: 'stats', label: '📊 Thống kê' },
];

export default function TeacherManage() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [classes, setClasses] = useState<Clazz[]>([]);
  const [selectedCid, setSelectedCid] = useState('');
  const [tab, setTab] = useState<TabId>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [addEmail, setAddEmail] = useState('');
  const [removeUid, setRemoveUid] = useState('');
  const [err, setErr] = useState('');

  const loadClasses = useCallback(async () => {
    try {
      const r = await api<{ classes: Clazz[] }>('/teacher/classes');
      setClasses(r.classes || []);
      if (r.classes?.length && !selectedCid) setSelectedCid(String(r.classes[0].id));
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  }, [selectedCid]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const loadTab = useCallback(async (t: TabId, cid: string) => {
    if (!cid) return;
    setErr('');
    try {
      if (t === 'members') {
        const r = await api<{ members: Member[] }>(`/teacher/classes/${cid}/members`);
        setMembers(r.members || []);
      } else if (t === 'progress') {
        const r = await api<{ rows: ProgressRow[] }>(`/admin/classes/${cid}/progress?per_page=100`);
        setProgressRows(r.rows || []);
      } else if (t === 'assignments') {
        const r = await api<{ assignments: Assignment[] }>(`/admin/assignments?class_id=${cid}&per_page=50`);
        setAssignments(r.assignments || []);
      }
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  }, []);

  useEffect(() => { if (selectedCid) loadTab(tab, selectedCid); }, [tab, selectedCid, loadTab]);

  const addMember = async () => {
    if (!addEmail.trim() || !selectedCid) return;
    setErr('');
    try {
      await api(`/teacher/classes/${selectedCid}/members`, { method: 'POST', body: JSON.stringify({ email: addEmail.trim() }) });
      toast.success('Đã thêm thành viên', `${addEmail.trim()} vào lớp #${selectedCid}`);
      setAddEmail('');
      loadTab('members', selectedCid);
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  };

  const removeMember = async () => {
    if (!removeUid.trim() || !selectedCid) return;
    const ok = await confirm({
      title: 'Xóa thành viên',
      message: `Xóa user #${removeUid.trim()} khỏi lớp #${selectedCid}?`,
      confirmLabel: 'Xóa khỏi lớp',
      danger: true,
    });
    if (!ok) return;
    setErr('');
    try {
      await api(`/teacher/classes/${selectedCid}/members/${removeUid.trim()}`, { method: 'DELETE' });
      toast.success('Đã xóa thành viên', `User #${removeUid.trim()} khỏi lớp #${selectedCid}`);
      setRemoveUid('');
      loadTab('members', selectedCid);
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  };

  const deleteAssignment = async (id: number) => {
    const ok = await confirm({
      title: 'Xóa bài được giao',
      message: `Assignment #${id} sẽ bị xóa khỏi lớp. Học sinh sẽ không còn thấy bài này.`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    setErr('');
    try {
      await api(`/admin/assignments/${id}`, { method: 'DELETE' });
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success('Đã xóa assignment', `#${id}`);
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  };

  if (loading) return null;
  if (!me || (me.role !== 'teacher' && me.role !== 'admin'))
    return <Guard title="Không có quyền" hint="Chỉ giảng viên mới vào được trang này." />;

  const selectedClass = classes.find((c) => String(c.id) === selectedCid);

  return (
    <div className="flex flex-col gap-5">
      <PageHero zone="teach" kicker="Khu giảng viên" title="Quản trị lớp"
        desc="Thêm/xóa thành viên, theo dõi tiến độ và quản lý bài được giao theo từng lớp." glow="accent" />

      <nav className="flex flex-wrap gap-2">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-muted transition hover:border-accent hover:text-accent">{n.label}</Link>
        ))}
      </nav>

      {err && <Card><p className="text-sm text-danger">⚠️ {err}</p></Card>}
      {err && <Card><p className="text-sm text-danger">⚠️ {err}</p></Card>}

      {/* Class selector */}
      <Card>
        <Kicker>Lớp học</Kicker>
        <SectionTitle sub="Chọn lớp để quản lý chi tiết">Chọn lớp ({classes.length})</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <button key={c.id} onClick={() => setSelectedCid(String(c.id))}
              className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition ${selectedCid === String(c.id) ? 'border-primary bg-primary/10' : 'border-border bg-surface-raised hover:border-primary/60'}`}>
              <p className="font-extrabold">{c.name}</p>
              <p className="text-xs text-muted">👥 {c.members_count ?? 0} thành viên · 📝 {c.assignments_count ?? 0} bài</p>
            </button>
          ))}
          {classes.length === 0 && <EmptyState title="Chưa có lớp nào" hint="Liên hệ admin để được tạo lớp." />}
        </div>
      </Card>

      {selectedClass && (
        <>
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-2">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`rounded-t-lg px-4 py-2 text-sm font-bold transition ${tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-muted hover:text-primary'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Members */}
          {tab === 'members' && (
            <Card>
              <Kicker>Thành viên · {selectedClass.name}</Kicker>
              <SectionTitle sub="Thêm hoặc xóa học sinh khỏi lớp">Danh sách thành viên ({members.length})</SectionTitle>

              <Table<Member>
                columns={[
                  { head: 'Tên', render: (m) => <span><b>{m.display_name || m.email.split('@')[0]}</b><br /><span className="text-xs text-muted">{m.email}</span></span> },
                  { head: 'Vai trò', render: (m) => <Badge tone={m.role === 'teacher' ? 'warn' : 'info'}>{m.role}</Badge> },
                  { head: 'ID', render: (m) => <span className="text-xs text-muted font-mono">#{m.id}</span> },
                ]}
                rows={members}
                keyOf={(m) => m.id}
                empty="Lớp này chưa có thành viên nào."
              />

              <div className="mt-5 border-t border-border pt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-bold">Thêm thành viên</p>
                  <div className="flex gap-2">
                    <Field label="Email học sinh">
                      <Input placeholder="hocsinh@example.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
                    </Field>
                  </div>
                  <Btn variant="primary" className="mt-2" onClick={addMember}>➕ Thêm vào lớp</Btn>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold">Xóa thành viên</p>
                  <Field label="User ID cần xóa">
                    <Input type="number" placeholder="vd. 5" value={removeUid} onChange={(e) => setRemoveUid(e.target.value)} />
                  </Field>
                  <Btn variant="danger" className="mt-2" onClick={removeMember}>🗑️ Xóa khỏi lớp</Btn>
                </div>
              </div>
            </Card>
          )}

          {/* Tab: Progress */}
          {tab === 'progress' && (
            <Card>
              <Kicker>Tiến độ · {selectedClass.name}</Kicker>
              <SectionTitle sub="Số bài nộp và số bài đã giải của từng học sinh">Tiến độ học sinh</SectionTitle>
              <Table<ProgressRow>
                columns={[
                  { head: 'Học sinh', render: (r) => <span><b>{r.display_name || r.email.split('@')[0]}</b><br /><span className="text-xs text-muted">{r.email}</span></span> },
                  { head: 'Bài nộp', center: true, render: (r) => r.subs },
                  { head: 'Đã giải', center: true, render: (r) => <b className="text-primary">{r.solved}</b> },
                  { head: 'Nộp cuối', render: (r) => <span className="text-xs text-muted">{r.last_submit || '—'}</span> },
                ]}
                rows={progressRows}
                keyOf={(r) => r.user_id}
                empty="Chưa có dữ liệu tiến độ."
              />
              <Btn className="mt-3" onClick={() => loadTab('progress', selectedCid)}>🔄 Làm mới</Btn>
            </Card>
          )}

          {/* Tab: Assignments */}
          {tab === 'assignments' && (
            <Card>
              <Kicker>Bài được giao · {selectedClass.name}</Kicker>
              <SectionTitle sub="Danh sách bài đã giao cho lớp này">Bài được giao ({assignments.length})</SectionTitle>
              <Table<Assignment>
                columns={[
                  { head: '#', render: (a) => <span className="text-xs font-mono text-muted">{a.id}</span> },
                  { head: 'Bài tập', render: (a) => <span><b>{a.problem_title || a.problem_slug || '—'}</b></span> },
                  { head: 'Hạn nộp', render: (a) => <span className="text-xs text-muted">{a.due_at || 'Không có'}</span> },
                  { head: 'Ghi chú', render: (a) => <span className="text-xs text-muted">{a.note || '—'}</span> },
                  { head: '', render: (a) => <Btn variant="danger" onClick={() => deleteAssignment(a.id)}>Xóa</Btn> },
                ]}
                rows={assignments}
                keyOf={(a) => a.id}
                empty="Lớp này chưa có bài nào được giao."
              />
            </Card>
          )}

          {/* Tab: Stats */}
          {tab === 'stats' && (
            <Card>
              <Kicker>Thống kê · {selectedClass.name}</Kicker>
              <SectionTitle sub="Tổng hợp số liệu của lớp">Tổng quan lớp học</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-surface-raised p-4 text-center">
                  <p className="text-3xl font-extrabold text-primary">{selectedClass.members_count ?? 0}</p>
                  <p className="mt-1 text-sm text-muted">Thành viên</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-raised p-4 text-center">
                  <p className="text-3xl font-extrabold text-accent">{selectedClass.assignments_count ?? 0}</p>
                  <p className="mt-1 text-sm text-muted">Bài được giao</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-raised p-4 text-center">
                  <p className="text-3xl font-extrabold text-success">{progressRows.filter((r) => r.solved > 0).length}</p>
                  <p className="mt-1 text-sm text-muted">Học sinh có bài đúng</p>
                </div>
              </div>
              <Btn className="mt-4" onClick={() => loadTab('progress', selectedCid)}>📈 Tải tiến độ để xem thêm</Btn>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
