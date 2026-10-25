import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, GhostButton, Chip, EmptyState, ErrorBox, LoadingBlock, Pagination, type PageMeta, RoleBadge } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';

interface Member { user_id: number; email: string; display_name?: string | null; role: string }
interface ProgressRow { user_id: number; email: string; display_name?: string | null; subs: number; solved: number; last_submit?: string | null }

export default function TeacherClassDetailScreen({ route, navigation }: any) {
  const { confirm } = useConfirm();
  const toast = useToast();
  const { id } = route.params || {};
  const [tab, setTab] = useState<'members' | 'progress'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [memberMeta, setMemberMeta] = useState<PageMeta | null>(null);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [progressMeta, setProgressMeta] = useState<PageMeta | null>(null);
  const [q, setQ] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(async (page = 1) => {
    if (!id) return;
    try {
      const r = await api(`/admin/classes/${id}/members?page=${page}&per_page=20`);
      setMembers(r.members || []); setMemberMeta(r.meta || null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  }, [id]);

  const loadProgress = useCallback(async (page = 1) => {
    if (!id) return;
    try {
      const r = await api(`/admin/classes/${id}/progress?page=${page}&per_page=20`);
      setProgressRows(r.rows || []); setProgressMeta(r.meta || null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    await Promise.all([loadMembers(1), loadProgress(1)]);
    setLoading(false);
  }, [loadMembers, loadProgress]);

  useEffect(() => { load(); }, [load]);

  const addMember = async () => {
    if (!email.trim()) { toast.warning('Nhập email học sinh.'); return; }
    try {
      await api(`/admin/classes/${id}/members`, { method: 'POST', body: JSON.stringify({ email: email.trim(), role: 'student' }) });
      toast.success('Đã thêm', `${email.trim()} vào lớp`);
      setEmail('');
      loadMembers(1);
    } catch (e: unknown) { toast.error('Thêm thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const removeMember = async (m: Member) => {
    const ok = await confirm({ title: 'Xóa khỏi lớp', message: `Xóa ${m.email} khỏi lớp #${id}?`, danger: true });
    if (!ok) return;
    try {
      await api(`/admin/classes/${id}/members/${m.user_id}`, { method: 'DELETE' });
      toast.success('Đã xóa', `${m.email} khỏi lớp`);
      loadMembers(memberMeta?.page || 1);
    } catch (e: unknown) { toast.error('Xóa thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const filtered = members.filter((m) =>
    !q.trim() || m.email.toLowerCase().includes(q.trim().toLowerCase()) || (m.display_name || '').toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <Screen>
      <Hero kicker="LỚP HỌC" title={`Lớp #${id ?? '—'}`} sub="Danh sách học sinh, tiến độ — thêm sinh viên trực tiếp tại đây." />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading ? <LoadingBlock hint="Đang tải lớp…" /> : null}
      <View style={s.tabs}>
        <View style={{ flex: 1 }}><Chip label="Thành viên" active={tab === 'members'} onPress={() => setTab('members')} /></View>
        <View style={{ flex: 1 }}><Chip label="Tiến độ" active={tab === 'progress'} onPress={() => { setTab('progress'); loadProgress(1); }} /></View>
      </View>
      {tab === 'members' ? (
        <Card>
          <SectionTitle>Thành viên ({memberMeta ? `${memberMeta.total}` : '…'})</SectionTitle>
          <Field label="Tìm tên / email"><AppInput value={q} onChangeText={setQ} placeholder="vd. sv@oj.local" autoCapitalize="none" /></Field>
          <Field label="Thêm sinh viên trực tiếp (email)"><AppInput value={email} onChangeText={setEmail} placeholder="sv@oj.local" autoCapitalize="none" keyboardType="email-address" /></Field>
          <PrimaryButton title="Thêm vào lớp" onPress={addMember} />
          {filtered.map((m) => (
            <View key={m.user_id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{m.display_name || m.email.split('@')[0]}</Text>
                <Text style={s.meta}>{m.email}</Text>
              </View>
              <RoleBadge role={m.role} />
              <GhostButton title="Xóa" onPress={() => removeMember(m)} />
            </View>
          ))}
          {filtered.length === 0 && <EmptyState title="Chưa có thành viên" hint="Thêm email học sinh ở trên." />}
          <Pagination meta={memberMeta} onPage={loadMembers} />
        </Card>
      ) : (
        <Card>
          <SectionTitle>Tiến độ lớp</SectionTitle>
          {progressRows.map((r) => (
            <View key={r.user_id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{r.display_name || r.email.split('@')[0]}</Text>
                <Text style={s.meta}>{r.email}</Text>
                <Text style={s.meta}>📝 {r.subs} bài · ✅ {r.solved} đã giải{r.last_submit ? ` · 🕐 ${r.last_submit}` : ''}</Text>
              </View>
            </View>
          ))}
          {progressRows.length === 0 && <EmptyState title="Chưa có dữ liệu" hint="Bấm tab Tiến độ để tải." />}
          <Pagination meta={progressMeta} onPage={loadProgress} />
        </Card>
      )}
      <GhostButton title="← Về khu giảng viên" onPress={() => navigation.navigate('Teacher')} />
    </Screen>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.sm },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
