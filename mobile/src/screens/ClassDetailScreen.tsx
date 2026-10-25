import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, PrimaryButton, EmptyState, ErrorBox, LoadingBlock, GhostButton, RoleBadge } from '../components/ui';

interface ClassDetail {
  class: { id: number; name: string };
  teachers: { user_id: number; email: string; display_name?: string | null; role: string }[];
  mates: { user_id: number; email: string; display_name?: string | null; role: string }[];
  members_total: number;
  assignments: { id: number; problem_id: number; due_at?: string | null; note?: string | null }[];
}

export default function ClassDetailScreen({ route, navigation }: any) {
  const { id, name } = route.params || {};
  const [data, setData] = useState<ClassDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const r = await api(`/classes/${id}`);
      setData(r);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen>
      <Hero kicker="LỚP HỌC" title={data?.class.name || name || `Lớp #${id}`} sub={`Sĩ số ${data?.members_total ?? '…'} · ${data?.assignments.length ?? '…'} bài được giao`} />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading ? <LoadingBlock hint="Đang tải thông tin lớp…" /> : null}
      <Card>
        <SectionTitle>Giáo viên phụ trách ({data?.teachers.length ?? 0})</SectionTitle>
        {(data?.teachers || []).map((t) => (
          <View key={t.user_id} style={s.row}>
            <View style={s.avatar}><Text style={s.avatarText}>{((t.display_name || t.email)[0] || '?').toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{t.display_name || t.email.split('@')[0]}</Text>
              <Text style={s.meta}>{t.email}</Text>
            </View>
            <RoleBadge role={t.role} />
          </View>
        ))}
        {data && data.teachers.length === 0 && <EmptyState title="Chưa có giáo viên" hint="Liên hệ quản trị viên để được hỗ trợ." />}
      </Card>
      <Card>
        <SectionTitle>Bài được giao cho lớp ({data?.assignments.length ?? 0})</SectionTitle>
        {(data?.assignments || []).map((a) => (
          <View key={a.id} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>Bài tập #{a.problem_id}</Text>
              <Text style={s.meta}>{a.due_at ? `Hạn: ${a.due_at}` : 'Không hạn'}{a.note ? ` · ${a.note}` : ''}</Text>
            </View>
            <GhostButton title="Làm →" onPress={() => navigation.navigate('Detail', { id: a.problem_id, vid: a.problem_id })} />
          </View>
        ))}
        {data && data.assignments.length === 0 && <EmptyState title="Chưa có bài nào" hint="Giáo viên sẽ giao bài tại đây." />}
      </Card>
      <Card>
        <SectionTitle>Bạn cùng lớp ({data?.members_total ?? 0})</SectionTitle>
        {(data?.mates || []).map((m) => (
          <View key={m.user_id} style={s.row}>
            <View style={s.avatarSm}><Text style={s.avatarSmText}>{((m.display_name || m.email)[0] || '?').toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{m.display_name || m.email.split('@')[0]}</Text>
              <Text style={s.meta}>{m.email}</Text>
            </View>
            <RoleBadge role={m.role} />
          </View>
        ))}
        {data && data.mates.length === 0 && <EmptyState title="Chưa có thành viên" hint="" />}
      </Card>
      <GhostButton title={loading ? 'Đang tải…' : 'Làm mới'} onPress={load} disabled={loading} />
      <PrimaryButton title="← Về bài được giao" onPress={() => navigation.navigate('Assignments')} />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontWeight: '700', fontSize: 18 },
  avatarSm: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
