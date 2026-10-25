import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing, LANG_COLORS } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, StatusBadge, ErrorBox, LoadingBlock, GhostButton } from '../components/ui';

export default function LanguagesStatusScreen() {
  const [languages, setLanguages] = useState<{ id: number; name: string; source_file: string }[]>([]);
  const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { const [l, s] = await Promise.all([api('/languages'), api('/statuses')]); setLanguages(l.languages || []); setStatuses(s.statuses || []); setError(''); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  return (
    <Screen>
      <Hero kicker="REFERENCE" title="Ngôn ngữ & trạng thái" sub="Tra cứu nhanh 6 ngôn ngữ chấm và mọi verdict của hệ thống." />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading ? <LoadingBlock hint="Đang tải danh mục…" /> : null}
      <Card>
        <SectionTitle>6 ngôn ngữ được chấm</SectionTitle>
        {languages.map((x) => (
          <View key={x.id} style={s.langRow}>
            <Text style={[s.dot, { color: (LANG_COLORS as Record<string, string>)[x.name] || colors.primary }]}>●</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{x.name}</Text>
              <Muted>{x.source_file}</Muted>
            </View>
          </View>
        ))}
      </Card>
      <Card>
        <SectionTitle>Trạng thái chấm ({statuses.length})</SectionTitle>
        <View style={s.badgeWrap}>
          {statuses.map((x) => <StatusBadge key={x.id} value={x.name} />)}
        </View>
      </Card>
      <GhostButton title={loading ? 'Đang tải…' : 'Làm mới'} onPress={load} disabled={loading} />
    </Screen>
  );
}

const s = StyleSheet.create({
  langRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.sm },
  dot: { fontSize: 18 },
  name: { color: colors.text, fontWeight: '700', fontSize: 16 },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
});


