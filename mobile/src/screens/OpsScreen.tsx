import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, GhostButton, StatusBadge, EmptyState, ErrorBox, LoadingBlock, StatRow, Chip, Pagination, type PageMeta, RoleBadge } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';

interface AppUser { id: number; email: string; display_name?: string | null; role: string }
interface UserDetail extends AppUser { stats: { submissions: number; classes: number } }
interface AdminProblem {
  id: number; slug: string; title: string; topic: string; difficulty: string;
  author_email?: string | null; author_name?: string | null;
  cases_count: number; submissions_count: number;
}
interface Dashboard {
  users_total: number; users_by_role: Record<string, number>;
  classes_total: number; problems_total: number; submissions_total: number;
  by_verdict: Record<string, number>;
}

const ROLES = ['student', 'teacher', 'admin'];
const FLOW = [
  { id: 'tong-quan', label: 'Tổng quan' },
  { id: 'nguoi-dung', label: 'Người dùng' },
  { id: 'bai-tap', label: 'Bài tập (xem)' },
  { id: 'giao-bai', label: 'Giao bài (xem)' },
  { id: 'tien-do-thi', label: 'Tiến độ & Contest' },
  { id: 'van-hanh', label: 'Vận hành' },
];

export default function OpsScreen() {
  const { confirm } = useConfirm();
  const toast = useToast();
  const scrollRef = useRef(null);
  const anchors = useRef({});
  const go = (id) => { const y = anchors.current[id]; if (y != null && scrollRef.current) scrollRef.current.scrollTo({ y: Math.max(0, y - 8), animated: true }); };
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [queue, setQueue] = useState<{ status: string; c: number }[]>([]);
  const [workers, setWorkers] = useState<{ id: number; status: string; attempt: number }[]>([]);
  const [rid, setRid] = useState('');

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userMeta, setUserMeta] = useState<PageMeta | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editPass, setEditPass] = useState('');
  const [nuEmail, setNuEmail] = useState('');
  const [nuPass, setNuPass] = useState('');
  const [nuName, setNuName] = useState('');
  const [nuRole, setNuRole] = useState('teacher');
  const [problems, setProblems] = useState<AdminProblem[]>([]);
  const [probMeta, setProbMeta] = useState<PageMeta | null>(null);
  const [assigns, setAssigns] = useState<{ id: number; problem_id: number; class_id?: number | null; user_id?: number | null; due_at?: string | null }[]>([]);
  const [assignMeta, setAssignMeta] = useState<PageMeta | null>(null);
  const [fClass, setFClass] = useState('');
  const [fUser, setFUser] = useState('');
  const [fProblem, setFProblem] = useState('');
  const [pgClass, setPgClass] = useState('');
  const [pgRows, setPgRows] = useState<{ user_id: number; email: string; display_name?: string | null; subs: number; solved: number; last_submit?: string | null }[]>([]);
  const [pgMeta, setPgMeta] = useState<PageMeta | null>(null);
  const [contests, setContests] = useState<{ id: number; title: string; starts_at: string; ends_at: string }[]>([]);
  const [lbRows, setLbRows] = useState<{ user_id: number; email: string; score: number; solved: number }[]>([]);
  const [lbCid, setLbCid] = useState('');
  const [actLogs, setActLogs] = useState<{ id: number; action: string; resource_type?: string | null; resource_id?: number | null; detail?: string | null; ip?: string | null; created_at: string; email?: string | null }[]>([]);
  const [actMeta, setActMeta] = useState<PageMeta | null>(null);
  const [actAction, setActAction] = useState('');
  const [actRole, setActRole] = useState('');

  const loadUsers = useCallback(async (page = 1) => {
    try {
      const qs = new URLSearchParams({ page: String(page), per_page: '10' });
      if (roleFilter) qs.set('role', roleFilter);
      if (query.trim()) qs.set('q', query.trim());
      const r = await api(`/users?${qs}`);
      setUsers(r.users || []); setUserMeta(r.meta || null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  }, [roleFilter, query]);

  const loadProblems = useCallback(async (page = 1) => {
    try {
      const r = await api(`/admin/problems?page=${page}&per_page=10`);
      setProblems(r.problems || []); setProbMeta(r.meta || null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);

  const loadAssigns = async (page = 1) => {
    try {
      const qs = new URLSearchParams({ page: String(page), per_page: '10' });
      if (fClass.trim()) qs.set('class_id', fClass.trim());
      if (fUser.trim()) qs.set('user_id', fUser.trim());
      if (fProblem.trim()) qs.set('problem_id', fProblem.trim());
      const r = await api(`/admin/assignments?${qs}`);
      setAssigns(r.assignments || []); setAssignMeta(r.meta || null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const loadClassProgress = async (page = 1) => {
    if (!pgClass.trim()) { setError('Nhập class_id để xem tiến độ.'); return; }
    try {
      const r = await api(`/admin/classes/${pgClass.trim()}/progress?page=${page}&per_page=10`);
      setPgRows(r.rows || []); setPgMeta(r.meta || null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const loadContests = async () => {
    try {
      const r = await api('/contests');
      setContests(r.contests || []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const loadActLogs = async (page = 1) => {
    try {
      const qs = new URLSearchParams({ page: String(page), per_page: '15' });
      if (actAction.trim()) qs.set('action', actAction.trim());
      if (actRole.trim()) qs.set('role', actRole.trim());
      const r = await api(`/admin/activity-logs?${qs}`);
      setActLogs(r.logs || []); setActMeta(r.meta || null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const loadBoard = async (cid: string) => {
    if (!cid.trim()) return;
    setLbCid(cid);
    try {
      const r = await api(`/contests/${cid}/leaderboard`);
      setLbRows(r.leaderboard || []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const account = await api('/me').catch(() => null);
      setMe(account);
      if (account?.role !== 'admin') return;
      const d = await api('/admin/dashboard').catch(() => null);
      if (d) setDash(d);
      const q = await api('/ops/queue').catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }));
      const w = await api('/ops/workers').catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }));
      setQueue(Array.isArray(q) ? q : q.queue || []);
      setWorkers(w.running || w.workers || []);
      await loadUsers(1);
      await loadProblems(1);
      await loadAssigns(1);
      await loadContests();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [loadUsers, loadProblems]);

  useEffect(() => { load(); }, [load]);

  if (!me && !loading) return <Screen><LoadingBlock hint="Đang kiểm tra quyền…" /></Screen>;
  if (me?.role !== 'admin') return <Screen><Card><SectionTitle>Không có quyền</SectionTitle><Muted>Chỉ quản trị viên mới mở được trang admin.</Muted></Card></Screen>;

  const counts: Record<string, number> = {};
  queue.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + Number(r.c); });

  const requeue = async () => {
    if (!rid.trim()) { toast.warning('Nhập run_id trước.'); return; }
    try {
      const r = await api(`/ops/runs/${rid}/requeue`, { method: 'POST' });
      const st = (r as { status?: string })?.status;
      toast.success('Đã đưa vào hàng đợi', `Run #${rid}${st ? ` · ${st}` : ''}`);
      load();
    } catch (e: unknown) { toast.error('Requeue thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const openDetail = async (u: AppUser) => {
    try {
      const d = await api(`/users/${u.id}`);
      setDetail(d); setEditEmail(d.email); setEditName(d.display_name || ''); setEditPass('');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const saveDetail = async () => {
    if (!detail) return;
    const body: Record<string, unknown> = {};
    if (editEmail.trim() && editEmail.trim() !== detail.email) body.email = editEmail.trim();
    if (editName.trim() !== (detail.display_name || '')) body.display_name = editName.trim() || null;
    if (editPass) body.password = editPass;
    if (Object.keys(body).length === 0) { toast.info('Chưa có gì để lưu.'); return; }
    try {
      const r = await api(`/users/${detail.id}`, { method: 'PUT', body: JSON.stringify(body) });
      setDetail({ ...r, stats: detail.stats }); setEditPass('');
      toast.success('Đã lưu', `Tài khoản #${r.id}`);
      loadUsers(userMeta?.page || 1);
    } catch (e: unknown) { toast.error('Lưu thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const setRole = async (u: AppUser, role: string) => {
    const ok = await confirm({ title: 'Phân quyền', message: `Đổi ${u.email} thành ${role}?` });
    if (!ok) return;
    try {
      await api(`/users/${u.id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
      if (detail?.id === u.id) setDetail({ ...detail, role });
      toast.success('Đã phân quyền', `${u.email} → ${role}`);
      loadUsers(userMeta?.page || 1);
    } catch (e: unknown) { toast.error('Phân quyền thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const deleteUser = async (u: AppUser) => {
    const ok = await confirm({ title: 'Xóa tài khoản', message: `Xóa ${u.email} cùng toàn bộ bài nộp?`, danger: true });
    if (!ok) return;
    try {
      await api(`/users/${u.id}`, { method: 'DELETE' });
      if (detail?.id === u.id) setDetail(null);
      toast.success('Đã xóa', `Tài khoản ${u.email}`);
      loadUsers(userMeta?.page || 1);
    } catch (e: unknown) { toast.error('Xóa thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const createUser = async () => {
    if (!nuEmail.trim() || !nuPass) { setError('Nhập email và mật khẩu cho tài khoản mới.'); return; }
    try {
      const body: Record<string, string> = { email: nuEmail.trim(), password: nuPass, role: nuRole };
      if (nuName.trim()) body.display_name = nuName.trim();
      await api('/users', { method: 'POST', body: JSON.stringify(body) });
      setNuEmail(''); setNuPass(''); setNuName('');
      loadUsers(1);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const deleteProblem = async (p: AdminProblem) => {
    const ok = await confirm({ title: 'Xóa bài tập', message: `Xóa bài #${p.id} "${p.title}" cùng testset và bài nộp?`, danger: true });
    if (!ok) return;
    try {
      await api(`/admin/problems/${p.id}`, { method: 'DELETE' });
      toast.success('Đã xóa', `Bài tập #${p.id}`);
      loadProblems(probMeta?.page || 1);
    } catch (e: unknown) { toast.error('Xóa thất bại', e instanceof Error ? e.message : String(e)); }
  };

  return (
    <Screen innerRef={scrollRef}>
      <Hero kicker="ADMIN DASHBOARD" title="Quản trị hệ thống" sub="Chọn từng mục để xem chi tiết — người dùng, bài tập, vận hành." />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      <View style={s.steps}>
        {FLOW.map((f, i) => (
          <Chip key={f.id} label={`${i + 1}. ${f.label} ↓`} onPress={() => go(f.id)} />
        ))}
      </View>

      {true && (
        <View onLayout={(e) => { anchors.current['tong-quan'] = e.nativeEvent.layout.y; }}>
        <>
          <StatRow stats={[
            { label: 'TÀI KHOẢN', value: String(dash?.users_total ?? '…'), accent: colors.primary, onPress: () => go('nguoi-dung') },
            { label: 'LỚP HỌC', value: String(dash?.classes_total ?? '…'), accent: colors.accent, onPress: () => go('van-hanh') },
            { label: 'BÀI TẬP', value: String(dash?.problems_total ?? '…'), accent: colors.success, onPress: () => go('bai-tap') },
            { label: 'BÀI NỘP', value: String(dash?.submissions_total ?? '…'), accent: colors.warning, onPress: () => go('van-hanh') },
          ]} />
          <Card onPress={() => go('nguoi-dung')}>
            <SectionTitle>Theo vai trò — bấm để mở ↓</SectionTitle>
            <View style={s.filters}>
              {Object.entries(dash?.users_by_role || {}).map(([r, c]) => (
                <Chip key={r} label={`${r}: ${c}`} />
              ))}
            </View>
          </Card>
          <Card onPress={() => go('van-hanh')}>
            <SectionTitle>Kết quả chấm — bấm để mở ↓</SectionTitle>
            <View style={s.filters}>
              {Object.entries(dash?.by_verdict || {}).map(([v, c]) => (
                <Chip key={v} label={`${v}: ${c}`} />
              ))}
              {dash && Object.keys(dash.by_verdict || {}).length === 0 && <Muted>Chưa có bài nộp nào.</Muted>}
            </View>
          </Card>
          <Card onPress={() => go('bai-tap')}>
            <SectionTitle>{dash?.problems_total ?? '…'} bài do giáo viên đăng — bấm để duyệt ↓</SectionTitle>
          </Card>
          <Card onPress={() => go('tien-do-thi')}>
            <SectionTitle>Tiến độ & Kỳ thi — bấm để xem ↓</SectionTitle>
          </Card>
        </>
        </View>
      )}

      {true && (
        <View onLayout={(e) => { anchors.current['nguoi-dung'] = e.nativeEvent.layout.y; }}>
        <>
          <Card>
            <SectionTitle>Danh sách tài khoản ({userMeta ? `${userMeta.total}` : '…'})</SectionTitle>
            <Muted>Bấm tên để mở hồ sơ chi tiết: xem, sửa, đặt lại mật khẩu.</Muted>
            <Text style={s.label}>VAI TRÒ</Text>
            <View style={s.filters}>
              {[['', 'Tất cả'], ...ROLES.map((r) => [r, r])].map(([v, l]) => (
                <Chip key={v || 'all'} label={l} active={roleFilter === v} onPress={() => setRoleFilter(v)} />
              ))}
            </View>
            <Field label="Tìm email"><AppInput value={query} onChangeText={setQuery} placeholder="vd. gv@oj.local" autoCapitalize="none" /></Field>
            <GhostButton title="Áp dụng bộ lọc" onPress={() => loadUsers(1)} />
            {users.map((u) => (
              <View key={u.id}>
                <View style={s.userRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName} onPress={() => openDetail(u)}>{u.display_name || u.email.split('@')[0]} <Text style={s.link}>mở →</Text></Text>
                    <Text style={s.userMeta}>{u.email} · #{u.id}</Text>
                  </View>
                  <RoleBadge role={u.role} />
                </View>
                {u.id !== me?.id && (
                  <View style={s.roleBtns}>
                    {ROLES.filter((r) => r !== u.role).map((r) => (
                      <Chip key={r} label={`→ ${r}`} onPress={() => setRole(u, r)} />
                    ))}
                    <Chip label="Xóa" onPress={() => deleteUser(u)} />
                  </View>
                )}
              </View>
            ))}
            {users.length === 0 && <EmptyState title="Chưa có tài khoản nào" hint="Thử đổi bộ lọc hoặc từ khóa." />}
            <Pagination meta={userMeta} onPage={loadUsers} />
          </Card>
          {detail && (
            <Card>
              <SectionTitle>Hồ sơ #{detail.id}</SectionTitle>
              <Muted>{detail.stats.submissions} bài nộp · {detail.stats.classes} lớp</Muted>
              <Field label="Email"><AppInput value={editEmail} onChangeText={setEditEmail} autoCapitalize="none" keyboardType="email-address" /></Field>
              <Field label="Tên hiển thị"><AppInput value={editName} onChangeText={setEditName} placeholder="VD: Nguyễn Văn A" /></Field>
              <Field label="Đặt lại mật khẩu (bỏ trống nếu giữ nguyên)"><AppInput value={editPass} onChangeText={setEditPass} placeholder="VD: Mới@2026" /></Field>
              <Text style={s.label}>VAI TRÒ</Text>
              <View style={s.filters}>
                {ROLES.map((r) => <Chip key={r} label={r} active={detail.role === r} onPress={() => detail.id !== me?.id && setRole(detail, r)} />)}
              </View>
              <PrimaryButton title="Lưu thay đổi" onPress={saveDetail} />
              <GhostButton title="Đóng" onPress={() => setDetail(null)} />
            </Card>
          )}
          <Card>
            <SectionTitle>Tạo tài khoản (chỉ admin)</SectionTitle>
            <Field label="Email"><AppInput value={nuEmail} onChangeText={setNuEmail} autoCapitalize="none" keyboardType="email-address" placeholder="gv2@oj.local" /></Field>
            <Field label="Mật khẩu"><AppInput value={nuPass} onChangeText={setNuPass} placeholder="VD: Gv@2026" /></Field>
            <Field label="Tên hiển thị"><AppInput value={nuName} onChangeText={setNuName} placeholder="VD: Cô Lan" /></Field>
            <Text style={s.label}>VAI TRÒ</Text>
            <View style={s.filters}>
              {ROLES.map((r) => <Chip key={r} label={r} active={nuRole === r} onPress={() => setNuRole(r)} />)}
            </View>
            <PrimaryButton title="Tạo tài khoản" onPress={createUser} />
          </Card>
          <GhostButton title="Tiếp tục: bài tập ↓" onPress={() => go('bai-tap')} />
        </>
        </View>
      )}

      {true && (
        <View onLayout={(e) => { anchors.current['bai-tap'] = e.nativeEvent.layout.y; }}>
        <Card>
          <SectionTitle>Bài tập GV đã đăng ({probMeta ? `${probMeta.total}` : '…'})</SectionTitle>
          <Muted>Admin chỉ xem + xóa — KHÔNG tạo bài (do GV làm).</Muted>
          {problems.map((p) => (
            <View key={p.id} style={s.userRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{p.title}</Text>
                <Text style={s.userMeta}>{p.slug} · #{p.id} · {p.topic} · {p.difficulty}</Text>
                <Text style={s.userMeta}>✍️ {p.author_name || p.author_email || '?'} · 🧪 {p.cases_count} ca · 📝 {p.submissions_count} lượt nộp</Text>
              </View>
              <Chip label="Xóa" onPress={() => deleteProblem(p)} />
            </View>
          ))}
          {problems.length === 0 && <EmptyState title="Chưa có bài tập nào" hint="" />}
          <Pagination meta={probMeta} onPage={loadProblems} />
          <View style={s.twoBtn}>
            <View style={{ flex: 1 }}><GhostButton title="↑ Người dùng" onPress={() => go('nguoi-dung')} /></View>
            <View style={{ flex: 1 }}><PrimaryButton title="Giao bài ↓" onPress={() => go('giao-bai')} /></View>
          </View>
        </Card>
        </View>
      )}

      {true && (
        <View onLayout={(e) => { anchors.current['giao-bai'] = e.nativeEvent.layout.y; }}>
        <Card>
          <SectionTitle>Bài được giao ({assignMeta ? `${assignMeta.total}` : '…'})</SectionTitle>
          <Muted>Admin chỉ xem + xóa — KHÔNG giao bài (do GV làm).</Muted>
          <Field label="Lọc class_id"><AppInput value={fClass} onChangeText={setFClass} keyboardType="numeric" placeholder="VD: 2" /></Field>
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}><Field label="user_id"><AppInput value={fUser} onChangeText={setFUser} keyboardType="numeric" placeholder="VD: 7" /></Field></View>
            <View style={{ flex: 1 }}><Field label="problem_id"><AppInput value={fProblem} onChangeText={setFProblem} keyboardType="numeric" placeholder="VD: 1" /></Field></View>
          </View>
          <GhostButton title="Áp dụng bộ lọc" onPress={() => loadAssigns(1)} />
          {assigns.map((a) => (
            <View key={a.id} style={s.userRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>#{a.id} → bài #{a.problem_id}</Text>
                <Text style={s.userMeta}>{a.class_id ? `Lớp #${a.class_id}` : a.user_id ? `User #${a.user_id}` : '—'}{a.due_at ? ` · Hạn ${a.due_at}` : ''}</Text>
              </View>
              <Chip label="Xóa" onPress={async () => {
                const ok = await confirm({ title: 'Xóa giao bài', message: `Xóa giao bài #${a.id}?`, danger: true });
                if (!ok) return;
                try {
                  await api(`/admin/assignments/${a.id}`, { method: 'DELETE' });
                  toast.success('Đã xóa', `Giao bài #${a.id}`);
                  loadAssigns(assignMeta?.page || 1);
                } catch (e: unknown) { toast.error('Xóa thất bại', e instanceof Error ? e.message : String(e)); }
              }} />
            </View>
          ))}
          {assigns.length === 0 && <EmptyState title="Chưa có giao bài nào" hint="Thử đổi bộ lọc." />}
          <Pagination meta={assignMeta} onPage={loadAssigns} />
          <View style={s.twoBtn}>
            <View style={{ flex: 1 }}><GhostButton title="↑ Bài tập" onPress={() => go('bai-tap')} /></View>
            <View style={{ flex: 1 }}><PrimaryButton title="Tiến độ & Kỳ thi ↓" onPress={() => go('tien-do-thi')} /></View>
          </View>
        </Card>
        </View>
      )}

      {true && (
        <View onLayout={(e) => { anchors.current['tien-do-thi'] = e.nativeEvent.layout.y; }}>
        <Card>
          <SectionTitle>Tiến độ theo lớp (chỉ xem)</SectionTitle>
          <Field label="class_id"><AppInput value={pgClass} onChangeText={setPgClass} keyboardType="numeric" placeholder="vd. 2" /></Field>
          <PrimaryButton title="Xem tiến độ" onPress={() => loadClassProgress(1)} />
          {pgRows.map((r) => (
            <View key={r.user_id} style={s.userRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{r.display_name || r.email.split('@')[0]}</Text>
                <Text style={s.userMeta}>📝 {r.subs} · ✅ {r.solved}{r.last_submit ? ` · 🕐 ${r.last_submit}` : ''}</Text>
              </View>
            </View>
          ))}
          {pgRows.length === 0 && <EmptyState title="Chưa có dữ liệu" hint="Nhập class_id rồi bấm Xem tiến độ." />}
          <Pagination meta={pgMeta} onPage={(p) => loadClassProgress(p)} />
          <View style={s.twoBtn}>
          <View style={{ flex: 1 }}><GhostButton title="↑ Giao bài" onPress={() => go('giao-bai')} /></View>
            <View style={{ flex: 1 }}><PrimaryButton title="Kỳ thi ↓" onPress={() => go('tien-do-thi')} /></View>
          </View>
        </Card>
        </View>
      )}

      {true && (
        <View>
        <Card>
          <SectionTitle>Kỳ thi ({contests.length}) — chỉ xem</SectionTitle>
          <Muted>Admin chỉ xem leaderboard — KHÔNG tạo contest (do GV làm).</Muted>
          {contests.map((c) => (
            <View key={c.id} style={s.userRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{c.title}</Text>
                <Text style={s.userMeta}>#{c.id} · {c.starts_at} → {c.ends_at}</Text>
              </View>
              <Chip label={lbCid === String(c.id) ? 'Đóng' : 'Bảng →'} onPress={() => lbCid === String(c.id) ? setLbCid('') : loadBoard(String(c.id))} />
            </View>
          ))}
          {contests.length === 0 && <EmptyState title="Chưa có kỳ thi nào" hint="Giáo viên tạo contest từ trang giảng viên." />}
          {!!lbCid && lbRows.map((r) => (
            <View key={r.user_id} style={s.userRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{r.email}</Text>
                <Text style={s.userMeta}>Điểm {r.score} · Giải {r.solved}</Text>
              </View>
            </View>
          ))}
          <View style={s.twoBtn}>
            <View style={{ flex: 1 }}><GhostButton title="↑ Tiến độ" onPress={() => go('tien-do-thi')} /></View>
            <View style={{ flex: 1 }}><PrimaryButton title="Vận hành ↓" onPress={() => go('van-hanh')} /></View>
          </View>
        </Card>
        </View>
      )}

      {true && (
        <View onLayout={(e) => { anchors.current['van-hanh'] = e.nativeEvent.layout.y; }}>
        <>
          <StatRow stats={[
            { label: 'QUEUED', value: String(counts.QUEUED || 0), accent: colors.warning },
            { label: 'RUNNING', value: String(counts.RUNNING || 0), accent: colors.primary },
            { label: 'SYS ERROR', value: String(counts.SYSTEM_ERROR || 0), accent: colors.danger },
          ]} />
          <Card>
            <SectionTitle>Worker đang chạy ({workers.length})</SectionTitle>
            {workers.length === 0
              ? <EmptyState title="Hệ thống rảnh" hint="Không có worker nào đang giữ job." />
              : workers.map((w) => (
                <View key={w.id} style={s.worker}>
                  <Text style={s.workerId}>#{w.id}</Text>
                  <StatusBadge value={w.status} />
                  <Text style={s.workerMeta}>attempt {w.attempt}</Text>
                </View>
              ))}
          </Card>
          <Card>
            <SectionTitle>Requeue run lỗi</SectionTitle>
            <Field label="run_id"><AppInput value={rid} onChangeText={setRid} keyboardType="numeric" placeholder="vd. 42" /></Field>
            <PrimaryButton title="Requeue" onPress={requeue} />
          </Card>
          <GhostButton title="↑ Về tổng quan" onPress={() => go('tong-quan')} />
        </>
        </View>
      )}

      {/* Nhật ký hoạt động — thay thế Hồ sơ cho Admin */}
      <View style={{ marginTop: spacing.md }}>
        <Card>
          <SectionTitle>Nhật ký hoạt động</SectionTitle>
          <Muted>Tất cả hành động của user / teacher / admin trên hệ thống.</Muted>
          <Field label="Lọc hành động (bỏ trống = tất cả)">
            <AppInput value={actAction} onChangeText={setActAction} placeholder="vd. login, submit, create_problem" />
          </Field>
          <Field label="Lọc vai trò">
            <AppInput value={actRole} onChangeText={setActRole} placeholder="student | teacher | admin" />
          </Field>
          <PrimaryButton title="Tải nhật ký" onPress={() => loadActLogs(1)} />
          {actLogs.map((l) => (
            <View key={l.id} style={{ paddingVertical: spacing.xs, borderTopWidth: 1, borderColor: colors.borderSoft }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
                <StatusBadge value={l.action} />
                {l.resource_type ? <Muted>{l.resource_type} #{l.resource_id ?? '?'}</Muted> : null}
                <Muted>{new Date(l.created_at).toLocaleString('vi-VN')}</Muted>
              </View>
              {l.email ? <Muted>{l.email}</Muted> : null}
              {l.detail ? <Muted>{l.detail}</Muted> : null}
            </View>
          ))}
          {actLogs.length === 0 && <EmptyState title="Chưa có nhật ký" hint="Bấm Tải nhật ký để xem." />}
          <Pagination meta={actMeta} onPage={loadActLogs} />
        </Card>
      </View>

      <GhostButton title={loading ? 'Đang tải…' : 'Làm mới'} onPress={load} disabled={loading} />
    </Screen>
  );
}

const s = StyleSheet.create({
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  worker: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.sm },
  workerId: { color: colors.text, fontWeight: '700' },
  workerMeta: { color: colors.muted, fontSize: 12 },
  label: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.sm },
  userName: { color: colors.text, fontWeight: '700' },
  link: { color: colors.primary, fontSize: 12 },
  userMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  roleBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  twoBtn: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
