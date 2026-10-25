import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, PrimaryButton, EmptyState, ErrorBox, LoadingBlock, GhostButton } from '../components/ui';

interface Assignment {
  id: number; problem_id: number; class_id?: number | null; user_id?: number | null;
  due_at?: string | null; note?: string | null;
}

interface MyClass {
  id: number; name: string; my_role: string; members_count: number;
  assignments_count: number; next_due_at?: string | null;
}

export default function AssignmentsScreen({ navigation }: any) {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<MyClass[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [a, c] = await Promise.all([
        api('/me/assignments'),
        api('/me/classes').catch(() => ({ classes: [] })),
      ]);
      setRows(a.assignments || []);
      setClasses(c.classes || []);
    } catch (e: any) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen>
      <Hero kicker="KHÔNG GIAN HỌC TẬP" title="Bài được giao" sub="Bài tập giáo viên giao riêng cho bạn hoặc cho cả lớp." />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading ? <LoadingBlock hint="Đang tải bài được giao…" /> : null}
      <SectionTitle>Lớp học của tôi ({classes.length})</SectionTitle>
      {classes.map((c) => (
        <Card key={c.id}>
          <Text style={s.title}>{c.name}</Text>
          <Text style={s.meta}>
            👥 {c.members_count} thành viên · 📝 {c.assignments_count} bài được giao
            {c.next_due_at ? ` · ⏰ Hạn gần nhất: ${c.next_due_at}` : ''}
          </Text>
          <PrimaryButton title="Xem lớp học →" onPress={() => navigation.navigate('ClassDetail', { id: c.id, name: c.name })} />
        </Card>
      ))}
      {!loading && classes.length === 0 && !error && <EmptyState title="Chưa tham gia lớp nào" hint="Giáo viên thêm bạn vào lớp bằng email tài khoản." />}
      <SectionTitle>Bài tập phải làm ({rows.length})</SectionTitle>
      {rows.map((a) => (
        <Card key={a.id}>
          <Text style={s.title}>Bài tập #{a.problem_id}</Text>
          <Text style={s.meta}>
            {a.class_id ? `Giao cả lớp #${a.class_id}` : 'Giao cá nhân'}
            {a.due_at ? ` · Hạn: ${a.due_at}` : ' · Không hạn'}
          </Text>
          {a.note ? <Muted>“{a.note}”</Muted> : null}
          <PrimaryButton title="Làm bài →" onPress={() => navigation.navigate('Detail', { id: a.problem_id, vid: a.problem_id })} />
        </Card>
      ))}
      {!loading && rows.length === 0 && !error && <EmptyState title="Chưa có bài nào được giao" hint="Giáo viên sẽ giao bài riêng hoặc cho cả lớp tại đây." />}
      <GhostButton title="Làm mới" onPress={load} disabled={loading} />
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
