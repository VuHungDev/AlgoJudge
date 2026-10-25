import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, AccentButton, GhostButton, DiffBadge, EmptyState, ErrorBox, StatRow } from '../components/ui';

export default function ProgressScreen({ navigation }: any) {
  const [progress, setProgress] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [recommend, setRecommend] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, s, r] = await Promise.all([api('/me/progress'), api('/me/streak'), api('/me/recommend')]);
      setProgress(p); setStreak(s); setRecommend(r.recommend); setError('');
    } catch (e: any) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const pct = progress && progress.total > 0 ? Math.round((progress.solved / progress.total) * 100) : 0;

  return (
    <Screen>
      <Hero kicker="MY JOURNEY" title="Tiến độ học tập" sub="Nhìn lại hành trình và chọn mục tiêu tiếp theo." />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      <Card style={s.hero}>
        <Text style={s.big}>{progress ? `${progress.solved}/${progress.total}` : '…'}</Text>
        <Muted>bài đã giải · {pct}% hành trình</Muted>
        <View style={s.bar}><View style={[s.fill, { width: `${pct}%` }]} /></View>
      </Card>
      <StatRow stats={[
        { label: 'STREAK', value: String(streak?.streak ?? '—'), accent: colors.primary },
        { label: 'NGÀY ACTIVE', value: String(streak?.total_days ?? 0) },
        { label: 'HOÀN THÀNH', value: `${pct}%`, accent: colors.accent },
      ]} />
      <Card>
        <SectionTitle>Gợi ý tiếp theo</SectionTitle>
        {recommend ? <>
          <Text style={s.rec}>#{recommend.id} {recommend.title}</Text>
          <View style={s.recRow}><DiffBadge d={recommend.difficulty} /><Muted>{recommend.topic}</Muted></View>
          <PrimaryButton title="Mở bài gợi ý →" onPress={() => navigation.navigate('Detail', { id: recommend.id, vid: recommend.current_version_id })} />
        </> : <EmptyState title="Chưa có gợi ý" hint="Hãy giải thêm vài bài để hệ thống học thói quen của bạn." />}
      </Card>
      <GhostButton title={loading ? 'Đang tải…' : 'Làm mới'} onPress={load} disabled={loading} />
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center' },
  big: { color: colors.text, fontSize: 24, fontWeight: '700' },
  bar: { height: 10, borderRadius: 999, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.borderSoft, overflow: 'hidden', alignSelf: 'stretch', marginTop: spacing.sm },
  fill: { height: '100%', backgroundColor: colors.primary },
  rec: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
});


