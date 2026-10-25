import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, CodeBlock, ErrorBox, LoadingBlock, GhostButton, StatRow } from '../components/ui';

export default function AboutDiagnostics() {
  const [info, setInfo] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const [about, version, system] = await Promise.all([
        api('/about'),
        api('/version', { headers: { Accept: 'text/plain' } }).catch(() => 'unknown'),
        api('/system_info'),
      ]);
      setInfo({ about, version, system }); setError('');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  return (
    <Screen>
      <Hero kicker="SYSTEM" title="About & chẩn đoán" sub="Thông tin phiên bản và sức khỏe backend phục vụ bàn giao." />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading ? <LoadingBlock hint="Đang kiểm tra hệ thống…" /> : null}
      <Card>
        <SectionTitle>AlgoJudge · coding studio</SectionTitle>
        <Muted>Backend PHP 8.2 + Laravel · MySQL 8 · 6 ngôn ngữ · Docker sandbox cách ly</Muted>
        <StatRow stats={[
          { label: 'NGÔN NGỮ', value: '6', accent: colors.primary },
          { label: 'CLIENT', value: 'Web+App', accent: colors.accent },
          { label: 'MODE', value: 'Docker', accent: colors.success },
        ]} />
      </Card>
      <View style={s.brandRow}>
        {[['Web', 'Next.js + Monaco'], ['Mobile', 'Expo RN'], ['API', 'PHP · JWT']].map(([a, b]) => (
          <View key={a} style={s.brandCell}>
            <Text style={s.brandValue}>{a}</Text>
            <Text style={s.brandLabel}>{b}</Text>
          </View>
        ))}
      </View>
      {info !== null && <Card><SectionTitle>Diagnostics</SectionTitle><CodeBlock title="system" code={JSON.stringify(info, null, 2)} /></Card>}
      <GhostButton title={loading ? 'Đang kiểm tra…' : 'Kiểm tra lại'} onPress={load} disabled={loading} />
    </Screen>
  );
}

const s = StyleSheet.create({
  brandRow: { flexDirection: 'row', gap: spacing.sm },
  brandCell: { flex: 1, backgroundColor: colors.raised, borderColor: colors.borderSoft, borderWidth: 1, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  brandValue: { color: colors.text, fontWeight: '700', fontSize: 16 },
  brandLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
});


