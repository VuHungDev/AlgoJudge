import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, GhostButton, EmptyState } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';

interface Contest { id: number; title: string; starts_at: string; ends_at: string }

export default function TeacherContestsScreen() {
  const { confirm } = useConfirm();
  const toast = useToast();
  const [ctTitle, setCtTitle] = useState('');
  const [ctStart, setCtStart] = useState('');
  const [ctEnd, setCtEnd] = useState('');
  const [ctProblems, setCtProblems] = useState('');
  const [contests, setContests] = useState<Contest[]>([]);

  const loadContests = async () => {
    try {
      const r = await api('/contests');
      setContests(r.contests || []);
    } catch (e: unknown) { toast.error('Lỗi tải contest', e instanceof Error ? e.message : String(e)); }
  };

  useEffect(() => { loadContests(); }, []);

  const createContest = async () => {
    if (!ctTitle.trim() || !ctStart.trim() || !ctEnd.trim() || !ctProblems.trim()) {
      toast.warning('Nhập đủ tiêu đề, thời gian và bài thi.');
      return;
    }
    try {
      const pvs = ctProblems.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
      if (!pvs.length) { toast.warning('Danh sách bài thi không hợp lệ.'); return; }
      const r = await api('/admin/contests', {
        method: 'POST',
        body: JSON.stringify({
          title: ctTitle.trim(),
          starts_at: ctStart.trim(),
          ends_at: ctEnd.trim(),
          problems: pvs.map((problem_version_id) => ({ problem_version_id }))
        }),
      });
      toast.success('Đã tạo contest', `${ctTitle.trim()} (#${(r as { contest_id?: number }).contest_id ?? '?'})`);
      setCtTitle('');
      setCtProblems('');
      loadContests();
    } catch (e: unknown) { toast.error('Tạo thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const deleteContest = async (cid: number) => {
    const ok = await confirm({ title: 'Xóa contest', message: `Xóa contest #${cid}?`, danger: true });
    if (!ok) return;
    try {
      await api(`/admin/contests/${cid}`, { method: 'DELETE' });
      toast.success('Đã xóa', `Contest #${cid}`);
      loadContests();
    } catch (e: unknown) { toast.error('Xóa thất bại', e instanceof Error ? e.message : String(e)); }
  };

  return (
    <Screen>
      <Hero kicker="KỲ THI" title="Quản lý kỳ thi" sub="Tạo, xóa kỳ thi + xem bảng xếp hạng." />

      <Card>
        <SectionTitle>Tạo kỳ thi mới</SectionTitle>
        <Muted>Nhập thông tin kỳ thi và danh sách bài tập thi.</Muted>
        <Field label="Tiêu đề contest"><AppInput value={ctTitle} onChangeText={setCtTitle} placeholder="VD: Thi giữa kỳ" /></Field>
        <Field label="Bắt đầu (YYYY-MM-DD HH:mm:ss)"><AppInput value={ctStart} onChangeText={setCtStart} placeholder="2026-12-01 08:00:00" /></Field>
        <Field label="Kết thúc (YYYY-MM-DD HH:mm:ss)"><AppInput value={ctEnd} onChangeText={setCtEnd} placeholder="2026-12-01 10:00:00" /></Field>
        <Field label="Bài thi (problem_version_id, cách nhau dấu phẩy)">
          <AppInput value={ctProblems} onChangeText={setCtProblems} keyboardType="numbers-and-punctuation" placeholder="VD: 3,4,5" />
        </Field>
        <PrimaryButton title="Tạo kỳ thi" onPress={createContest} />
      </Card>

      <Card>
        <SectionTitle>Kỳ thi của bạn ({contests.length})</SectionTitle>
        <Muted>Danh sách kỳ thi đã tạo. Bấm Xóa để hủy kỳ thi.</Muted>
        {contests.map((c) => (
          <View key={c.id} style={s.contestRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.contestName}>#{c.id} {c.title}</Text>
              <Text style={s.contestMeta}>{c.starts_at} → {c.ends_at}</Text>
            </View>
            <GhostButton title="Xóa" onPress={() => deleteContest(c.id)} />
          </View>
        ))}
        {contests.length === 0 && <EmptyState title="Chưa có kỳ thi nào" hint="Tạo kỳ thi đầu tiên ở trên." />}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  contestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: spacing.sm
  },
  contestName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  contestMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
