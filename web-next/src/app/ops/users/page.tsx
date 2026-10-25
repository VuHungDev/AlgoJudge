'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Btn, Card, EmptyState, Field, Guard, Input, Kicker, Pagination, SectionTitle, Select, Table, type PageMeta } from '@/components/ui';
import { useToast, useConfirm } from '@/components/feedback';
import { AdminShell, errText } from '../shared';

interface AppUser { id: number; email: string; display_name?: string | null; role: string; created_at?: string }
interface UserDetail extends AppUser { stats: { submissions: number; classes: number } }
interface ActivityEntry { id: number; action: string; resource_type?: string | null; resource_id?: number | null; detail?: string | null; ip?: string | null; created_at: string }

const ROLES = ['student', 'teacher', 'admin'] as const;

export default function OpsUsers() {
  const { me } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editPass, setEditPass] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('teacher');
  const [actLogs, setActLogs] = useState<ActivityEntry[]>([]);
  const [actMeta, setActMeta] = useState<PageMeta | null>(null);
  const [actAction, setActAction] = useState('');
  const [actRole, setActRole] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    try {
      const qs = new URLSearchParams({ page: String(page), per_page: '10' });
      if (roleFilter) qs.set('role', roleFilter);
      if (query.trim()) qs.set('q', query.trim());
      const r = await api<{ users: AppUser[]; meta: PageMeta }>(`/users?${qs}`);
      setUsers(r.users || []); setMeta(r.meta || null);
    } catch (e: unknown) { setError(errText(e)); }
  }, [roleFilter, query]);

  // Nhat ky hoat dong toan he thong (admin thay thay cho profile).
  const loadActLogs = useCallback(async (page = 1) => {
    try {
      const qs = new URLSearchParams({ page: String(page), per_page: '15' });
      if (actAction) qs.set('action', actAction);
      if (actRole) qs.set('role', actRole);
      const r = await api<{ logs: ActivityEntry[]; meta: PageMeta }>(`/admin/activity-logs?${qs}`);
      setActLogs(r.logs || []); setActMeta(r.meta || null);
    } catch (e: unknown) { setError(errText(e)); }
  }, [actAction, actRole]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => { loadActLogs(1); }, [loadActLogs]);

  const openDetail = async (u: AppUser) => {
    try {
      const d = await api<UserDetail>(`/users/${u.id}`);
      setDetail(d);
      setEditEmail(d.email); setEditName(d.display_name || ''); setEditPass('');
    } catch (e: unknown) { setError(errText(e)); }
  };

  const saveDetail = async () => {
    if (!detail) return;
    try {
      const body: Record<string, unknown> = {};
      if (editEmail.trim() && editEmail.trim() !== detail.email) body.email = editEmail.trim();
      if (editName.trim() !== (detail.display_name || '')) body.display_name = editName.trim() || null;
      if (editPass) body.password = editPass;
      if (Object.keys(body).length === 0) { toast.info('Chưa có gì để lưu', 'Bạn chưa thay đổi trường nào.'); return; }
      const r = await api<UserDetail>(`/users/${detail.id}`, { method: 'PUT', body: JSON.stringify(body) });
      setDetail({ ...r, stats: detail.stats });
      setEditPass('');
      toast.success('Đã lưu tài khoản', `#${r.id} · ${r.email}`);
      load(meta?.page || 1);
    } catch (e: unknown) { toast.error('Lưu thất bại', friendlyError(e instanceof Error ? e.message : String(e))); }
  };

  const setRole = async (u: AppUser, role: string) => {
    const ok = await confirm({
      title: 'Đổi vai trò tài khoản',
      message: `${u.email} → ${role}`,
      confirmLabel: `Đổi thành ${role}`,
    });
    if (!ok) return;
    try {
      await api(`/users/${u.id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
      toast.success('Đã đổi vai trò', `${u.email} → ${role}`);
      load(meta?.page || 1);
    } catch (e: unknown) { setError(errText(e)); }
  };

  const createUser = async () => {
    try {
      const r = await api<{ user_id: number }>('/users', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail.trim(), password: newPass, role: newRole, display_name: newName.trim() || undefined }),
      });
      toast.success('Đã tạo tài khoản', `#${r.user_id} · ${newEmail.trim()} · ${newRole}`);
      setNewEmail(''); setNewPass(''); setNewName('');
      load(1);
    } catch (e: unknown) { setError(errText(e)); }
  };

  const deleteUser = async (u: AppUser) => {
    const ok = await confirm({
      title: 'Xóa tài khoản',
      message: `Xóa ${u.email} cùng toàn bộ bài nộp? Thao tác này không thể hoàn tác.`,
      confirmLabel: 'Xóa vĩnh viễn',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/users/${u.id}`, { method: 'DELETE' });
      toast.success('Đã xóa tài khoản', u.email);
      if (detail?.id === u.id) setDetail(null);
      load(meta?.page || 1);
    } catch (e: unknown) { setError(errText(e)); }
  };

  return (
    <AdminShell title="Quản lý người dùng" desc="Tạo / sửa / xóa / phân quyền — tính năng duy nhất admin tạo + sửa.">
      {error && <Card><p className="text-sm text-danger">⚠️ {error}</p></Card>}

      <Card>
        <Kicker>Danh sách</Kicker>
        <SectionTitle sub="Tìm kiếm + lọc vai trò — bấm tên để mở hồ sơ chi tiết">User list ({meta?.total ?? '…'})</SectionTitle>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Field label="Vai trò">
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="student">Học sinh</option>
              <option value="teacher">Giáo viên</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Tìm email"><Input placeholder="vd. gv@oj.local" value={query} onChange={(e) => setQuery(e.target.value)} /></Field>
          </div>
        </div>
        <Btn className="mt-2" onClick={() => load(1)}>Áp dụng bộ lọc</Btn>

        <Table<AppUser>
          columns={[
            {
              head: 'Tài khoản', render: (u) => (
                <button className="text-left transition hover:opacity-70" onClick={() => openDetail(u)}>
                  <b className="text-primary underline">{u.display_name || u.email.split('@')[0]}</b>
                  <br /><span className="text-xs text-muted">{u.email} · #{u.id}</span>
                </button>
              ),
            },
            { head: 'Vai trò', center: true, render: (u) => <Badge tone={u.role === 'admin' ? 'bad' : u.role === 'teacher' ? 'warn' : 'info'}>{u.role}</Badge> },
            {
              head: 'Phân quyền', center: true,
              render: (u) => (
                <span className="flex justify-center gap-1">
                  {ROLES.filter((r) => r !== u.role).map((r) => (
                    <Btn key={r} className="!px-2 !py-1 text-xs" onClick={() => setRole(u, r)} disabled={u.id === me?.id}>→ {r}</Btn>
                  ))}
                </span>
              ),
            },
            { head: 'Xóa', center: true, render: (u) => <Btn className="!px-2 !py-1 text-xs" variant="danger" onClick={() => deleteUser(u)} disabled={u.id === me?.id}>Xóa</Btn> },
          ]}
          rows={users}
          keyOf={(u) => u.id}
          empty="Chưa có user nào phù hợp bộ lọc."
        />
        <Pagination meta={meta} onPage={load} />
      </Card>

      {detail && (
        <Card>
          <Kicker>Hồ sơ #{detail.id}</Kicker>
          <SectionTitle sub={`${detail.stats.submissions} bài nộp · ${detail.stats.classes} lớp`}>Chi tiết tài khoản</SectionTitle>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Field label="Email"><Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></Field>
            <Field label="Tên hiển thị"><Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="VD: Nguyễn Văn A" /></Field>
            <Field label="Đặt lại mật khẩu (bỏ trống = giữ nguyên)"><Input value={editPass} onChange={(e) => setEditPass(e.target.value)} placeholder="≥8 ký tự" /></Field>
            <Field label="Vai trò">
              <Select value={detail.role} onChange={(e) => setRole(detail, e.target.value)} disabled={detail.id === me?.id}>
                <option value="student">Học sinh</option>
                <option value="teacher">Giáo viên</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn variant="primary" onClick={saveDetail}>💾 Lưu</Btn>
            <Btn variant="danger" onClick={() => deleteUser(detail)} disabled={detail.id === me?.id}>🗑️ Xóa</Btn>
            <Btn onClick={() => setDetail(null)}>Đóng</Btn>
          </div>
        </Card>
      )}

      <Card>
        <Kicker>Tạo mới</Kicker>
        <SectionTitle sub="Admin có thể tạo tài khoản student / teacher / admin khác">Tạo tài khoản mới</SectionTitle>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <Field label="Email"><Input placeholder="gv2@oj.local" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></Field>
          <Field label="Mật khẩu"><Input placeholder="≥8 ký tự" value={newPass} onChange={(e) => setNewPass(e.target.value)} /></Field>
          <Field label="Tên hiển thị"><Input placeholder="VD: Cô Lan" value={newName} onChange={(e) => setNewName(e.target.value)} /></Field>
          <Field label="Vai trò">
            <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="teacher">Giảng viên</option>
              <option value="student">Học sinh</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <Btn variant="primary" onClick={createUser}>➕ Tạo tài khoản</Btn>
        </div>
      </Card>

      {/* Nhật ký hoạt động — thay thế trang Hồ sơ cho Admin */}
      <Card>
        <Kicker>Nhật ký</Kicker>
        <SectionTitle sub="Tất cả hành động của user / teacher / admin trên hệ thống">Nhật ký hoạt động</SectionTitle>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Field label="Lọc theo hành động">
            <Input placeholder="vd. login, submit, create_problem…" value={actAction} onChange={(e) => setActAction(e.target.value)} />
          </Field>
          <Field label="Lọc theo vai trò">
            <Select value={actRole} onChange={(e) => setActRole(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="student">Học sinh</option>
              <option value="teacher">Giảng viên</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <div className="flex items-end"><Btn onClick={() => loadActLogs(1)}>Áp dụng</Btn></div>
        </div>
        <Table<ActivityEntry>
          columns={[
            { head: 'Thời gian', render: (l) => <span className="text-xs text-muted">{new Date(l.created_at).toLocaleString('vi-VN')}</span> },
            { head: 'Hành động', render: (l) => <Badge tone="info">{l.action}</Badge> },
            { head: 'Đối tượng', render: (l) => <span className="text-xs">{l.resource_type ? `${l.resource_type} #${l.resource_id ?? '?'}` : '—'}</span> },
            { head: 'Chi tiết', render: (l) => <span className="text-xs text-muted">{l.detail ?? '—'}</span> },
            { head: 'IP', render: (l) => <span className="text-xs text-muted">{l.ip ?? '—'}</span> },
          ]}
          rows={actLogs}
          keyOf={(l) => l.id}
          empty="Chưa có nhật ký nào."
        />
        <Pagination meta={actMeta} onPage={loadActLogs} />
      </Card>
    </AdminShell>
  );
}
