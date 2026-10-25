'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Btn, Card, EmptyState, ErrorBox, Field, Guard, Input, Kicker, PageHero, SectionTitle } from '@/components/ui';
import { useToast, useConfirm } from '@/components/feedback';

interface Clazz { id: number; name: string; members_count?: number; assignments_count?: number }

export default function TeacherClasses() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [classes, setClasses] = useState<Clazz[]>([]);
  const [err, setErr] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ classes: Clazz[] }>('/teacher/classes');
      setClasses(r.classes || []);
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return null;
  if (!me || (me.role !== 'teacher' && me.role !== 'admin')) return <Guard title="Không có quyền" hint="Chỉ giảng viên mới vào được trang này." />;

  const createClass = async () => {
    if (!newName.trim()) { toast.warning('Thiếu tên lớp', 'Nhập tên lớp trước khi tạo.'); return; }
    setBusy(true);
    try {
      const r = await api<{ class_id: number }>('/admin/classes', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim() }),
      });
      toast.success('Đã tạo lớp', `${newName.trim()} · #${r.class_id}`);
      setNewName('');
      load();
    } catch (e: unknown) { toast.error('Tạo lớp thất bại', friendlyError(e instanceof Error ? e.message : String(e))); }
    finally { setBusy(false); }
  };

  const deleteClass = async (c: Clazz) => {
    const ok = await confirm({
      title: 'Xóa lớp',
      message: `Xóa lớp "${c.name}" (#${c.id}) cùng toàn bộ thành viên?`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/admin/classes/${c.id}`, { method: 'DELETE' });
      toast.success('Đã xóa lớp', c.name);
      load();
    } catch (e: unknown) { toast.error('Xóa thất bại', friendlyError(e instanceof Error ? e.message : String(e))); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHero zone="teach" kicker="Khu giảng viên" title="Quản lý lớp" desc="Tạo lớp mới, thêm học sinh và quản lý tiến độ." glow="accent" />

      {err && <ErrorBox message={err} onRetry={load} />}

      <Card>
        <Kicker>Tạo lớp mới</Kicker>
        <SectionTitle sub="Sau khi tạo, bạn sẽ được tự động gán làm giảng viên phụ trách lớp">Tạo lớp học</SectionTitle>
        <div className="mt-4 flex gap-2">
          <Field label="Tên lớp">
            <Input
              placeholder="VD: 10A1 - Tin học 2026"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createClass()}
            />
          </Field>
          <div className="flex items-end">
            <Btn variant="primary" onClick={createClass} disabled={busy}>
              {busy ? 'Đang tạo…' : '➕ Tạo lớp'}
            </Btn>
          </div>
        </div>
      </Card>

      <Card>
        <Kicker>Lớp học</Kicker>
        <SectionTitle sub="Bấm vào lớp để thêm học sinh, xem tiến độ và chấm bài">
          Lớp đang phụ trách ({classes.length})
        </SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {classes.map((c) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface-raised p-4 transition hover:border-accent">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold text-lg">#{c.id} {c.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    👥 {c.members_count ?? 0} thành viên · 📝 {c.assignments_count ?? 0} bài giao
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/teacher/classes/${c.id}`}
                  className="studio-button studio-primary flex-1 text-center text-sm"
                >
                  Quản lý lớp →
                </Link>
                <Btn variant="ghost" className="text-danger" onClick={() => deleteClass(c)}>Xóa</Btn>
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="sm:col-span-2">
              <EmptyState title="Chưa có lớp nào" hint="Tạo lớp đầu tiên ở trên. Bạn sẽ được tự động gán làm giảng viên phụ trách." />
            </div>
          )}
        </div>
        <div className="mt-4"><Btn onClick={load}>🔄 Làm mới</Btn></div>
      </Card>
    </div>
  );
}
