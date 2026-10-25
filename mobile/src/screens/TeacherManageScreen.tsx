import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, AccentButton, GhostButton, Chip, EmptyState, Pagination, type PageMeta } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';

interface Member { user_id: number; email: string; display_name?: string | null; role: string }
interface ProgressRow { user_id: number; email: string; display_name?: string | null; subs: number; solved: number; last_submit?: string | null }
interface Assign { id: number; problem_id: number; problem_title?: string; due_at?: string; note?: string }

export default function TeacherManageScreen({ navigation }: any) {
  const { confirm } = useConfirm();
  const toast = useToast();
  const [cid, setCid] = useState('');
  const [tab, setTab] = useState<'members' | 'progress' | 'assigns' | 'stats'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [memberMeta, setMemberMeta] = useState<PageMeta | null>(null);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [progressMeta, setProgressMeta] = useState<PageMeta | null>(null);
  const [assigns, setAssigns] = useState<Assign[]>([]);
  const [email, setEmail] = useState('');

  const loadMembers = async (page = 1) => {
    if (!cid.trim()) { toast.warning('Nhập class_id trước.'); return; }
    try {
      const r = await api(`/admin/classes/${cid}/members?page=${page}&per_page=20`);
      setMembers(r.members || []);
      setMemberMeta(r.meta || null);
    } catch (e: unknown) { toast.error('Lỗi tải thành viên', e instanceof Error ? e.message : String(e)); }
  };

  const loadProgress = async (page = 1) => {
    if (!cid.trim()) { toast.warning('Nhập class_id trước.'); return; }
    try {
      const r = await api(`/admin/classes/${cid}/progress?page=${page}&per_page=20`);
      setProgressRows(r.rows || []);
      setProgressMeta(r.meta || null);
    } catch (e: unknown) { toast.error('Lỗi tải tiến độ', e instanceof Error ? e.message : String(e)); }
  };

  const loadAssigns = async () => {
    if (!cid.trim()) { toast.warning('Nhập class_id trước.'); return; }
    try {
      const r = await api(`/admin/classes/${cid}/assignments?per_page=50`);
      setAssigns(r.assignments || []);
    } catch (e: unknown) { toast.error('Lỗi tải bài giao', e instanceof Error ? e.message : String(e)); }
  };

  const addMember = async () => {
    if (!email.trim()) { toast.warning('Nhập email học sinh.'); return; }
    try {
      await api(`/admin/classes/${cid}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role: 'student' }),
      });
      toast.success('Đã thêm', `${email.trim()} vào lớp`);
      setEmail('');
      loadMembers(1);
    } catch (e: unknown) { toast.error('Thêm thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const cycleRole = async (m: Member) => {
    const next = m.role === 'assistant' ? 'student' : 'assistant';
    const ok = await confirm({ title: 'Đổi vai trò', message: `Chuyển ${m.email} thành ${next}?` });
    if (!ok) return;
    try {
      await api(`/admin/classes/${cid}/members/${m.user_id}`, {
        method: 'PUT',
        body: JSON.stringify({ role: next }),
      });
      toast.success('Đã đổi vai trò', `${m.email} → ${next}`);
      loadMembers(memberMeta?.page || 1);
    } catch (e: unknown) { toast.error('Lỗi đổi vai trò', e instanceof Error ? e.message : String(e)); }
  };

  const removeMember = async (m: Member) => {
    const ok = await confirm({ title: 'Xóa khỏi lớp', message: `Xóa ${m.email} khỏi lớp #${cid}?`, danger: true });
    if (!ok) return;
    try {
      await api(`/admin/classes/${cid}/members/${m.user_id}`, { method: 'DELETE' });
      toast.success('Đã xóa', `${m.email} khỏi lớp`);
      loadMembers(memberMeta?.page || 1);
    } catch (e: unknown) { toast.error('Xóa thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const deleteAssign = async (aid: number) => {
    const ok = await confirm({ title: 'Thu hồi bài giao', message: `Thu hồi bài giao #${aid}?`, danger: true });
    if (!ok) return;
    try {
      await api(`/admin/assignments/${aid}`, { method: 'DELETE' });
      toast.success('Đã thu hồi', `Bài giao #${aid}`);
      loadAssigns();
    } catch (e: unknown) { toast.error('Thu hồi thất bại', e instanceof Error ? e.message : String(e)); }
  };

  return (
    <Screen>
      <Hero kicker="QUẢN TRỊ LỚP" title="Chi tiết lớp học" sub="4 tab: Thành viên · Tiến độ · Bài đã giao · Thống kê." />

      <Card>
        <SectionTitle>Chọn lớp và tab</SectionTitle>
        <Field label="class_id">
          <AppInput value={cid} onChangeText={setCid} keyboardType="numeric" />
        </Field>
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Chip label="Thành viên" active={tab === 'members'} onPress={() => { setTab('members'); loadMembers(1); }} />
          </View>
          <View style={{ flex: 1 }}>
            <Chip label="Tiến độ" active={tab === 'progress'} onPress={() => { setTab('progress'); loadProgress(1); }} />
          </View>
        </View>
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Chip label="Bài đã giao" active={tab === 'assigns'} onPress={() => { setTab('assigns'); loadAssigns(); }} />
          </View>
          <View style={{ flex: 1 }}>
            <Chip label="Thống kê" active={tab === 'stats'} onPress={() => { setTab('stats'); loadProgress(1); }} />
          </View>
        </View>
      </Card>

      {tab === 'members' && (
        <Card>
          <SectionTitle>Thành viên lớp #{cid || '—'}</SectionTitle>
          <Field label="Email học sinh mới">
            <AppInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </Field>
          <AccentButton title="Thêm vào lớp" onPress={addMember} />
          {members.map((m) => (
            <View key={m.user_id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{m.display_name || m.email.split('@')[0]}</Text>
                <Text style={s.meta}>{m.email} · {m.role}</Text>
              </View>
              <GhostButton title="Đổi vai trò" onPress={() => cycleRole(m)} />
              <GhostButton title="Xóa" onPress={() => removeMember(m)} />
            </View>
          ))}
          {members.length === 0 && <EmptyState title="Chưa tải danh sách" hint="Nhập class_id rồi bấm tab Thành viên." />}
          <Pagination meta={memberMeta} onPage={loadMembers} />
        </Card>
      )}

      {tab === 'progress' && (
        <Card>
          <SectionTitle>Tiến độ lớp #{cid || '—'}</SectionTitle>
          {progressRows.map((r) => (
            <View key={r.user_id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{r.display_name || r.email.split('@')[0]}</Text>
                <Text style={s.meta}>{r.email}</Text>
                <Text style={s.meta}>📝 {r.subs} bài nộp · ✅ {r.solved} đã giải{r.last_submit ? ` · 🕐 ${r.last_submit}` : ''}</Text>
              </View>
            </View>
          ))}
          {progressRows.length === 0 && <EmptyState title="Chưa có dữ liệu tiến độ" hint="Bấm tab Tiến độ để tải." />}
          <Pagination meta={progressMeta} onPage={loadProgress} />
        </Card>
      )}

      {tab === 'assigns' && (
        <Card>
          <SectionTitle>Bài đã giao cho lớp #{cid || '—'}</SectionTitle>
          {assigns.map((a) => (
            <View key={a.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>Bài #{a.problem_id}{a.problem_title ? ` · ${a.problem_title}` : ''}</Text>
                <Text style={s.meta}>{a.due_at ? `Hạn: ${a.due_at}` : 'Không hạn'}{a.note ? ` · ${a.note}` : ''}</Text>
              </View>
              <GhostButton title="Thu hồi" onPress={() => deleteAssign(a.id)} />
            </View>
          ))}
          {assigns.length === 0 && <EmptyState title="Chưa có bài được giao" hint="Bấm tab Bài đã giao để tải." />}
        </Card>
      )}

      {tab === 'stats' && (
        <Card>
          <SectionTitle>Thống kê lớp #{cid || '—'}</SectionTitle>
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{memberMeta?.total ?? members.length}</Text>
              <Text style={s.meta}>Sĩ số</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{progressRows.filter((r) => Number(r.subs) > 0).length}</Text>
              <Text style={s.meta}>Có bài nộp</Text>
            </View>
          </View>
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{progressRows.filter((r) => Number(r.solved) > 0).length}</Text>
              <Text style={s.meta}>Đã giải ≥1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{assigns.length}</Text>
              <Text style={s.meta}>Bài đã giao</Text>
            </View>
          </View>
          <Muted>Bấm tab Tiến độ / Bài đã giao để tải dữ liệu mới nhất.</Muted>
        </Card>
      )}

    </Screen>
  );
}

const s = StyleSheet.create({
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: spacing.sm
  },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
