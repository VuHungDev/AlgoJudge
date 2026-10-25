import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, StatusBadge, EmptyState, ErrorBox, LoadingBlock, AccentButton, GhostButton } from '../components/ui';

export default function ContestDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [contest, setContest] = useState<any>(null);
  const [board, setBoard] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, b] = await Promise.all([api(`/contests/${id}`), api(`/contests/${id}/leaderboard`)]);
      setContest(c); setBoard(b.leaderboard || []); setError('');
    } catch (e: any) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const live = contest ? new Date(contest.starts_at) <= new Date() && new Date() <= new Date(contest.ends_at) : false;

  return (
    <Screen>
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {!contest && !error ? <LoadingBlock hint="Đang tải contest…" /> : null}
      {contest && <>
        <Hero
          kicker={`CONTEST #${contest.id}`}
          title={contest.title || 'Contest'}
          sub={contest.description || ''}
        />
        <View style={s.badgeRow}>
          <StatusBadge value={live ? 'ACCEPTED' : 'PENDING'} />
          <Muted>{live ? 'Đang diễn ra' : 'Đã kết thúc / sắp tới'} · {contest.starts_at} → {contest.ends_at}</Muted>
        </View>
        <Card>
          <SectionTitle>Bài trong contest ({(contest.problems || []).length})</SectionTitle>
          {(contest.problems || []).map((p: any) => (
            <View key={p.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>#{p.problem_version?.problem?.id || p.problem_version_id} · {p.problem_version?.problem?.title || 'Bài tập'}</Text>
                <Text style={s.rowMeta}>{p.points} điểm</Text>
              </View>
              <AccentButton title="Mở ›" onPress={() => navigation.navigate('Detail', { id: p.problem_version?.problem?.id, vid: p.problem_version_id })} />
            </View>
          ))}
          {(contest.problems || []).length === 0 && <EmptyState title="Contest chưa gắn bài nào" />}
        </Card>
        <Card>
          <SectionTitle>Leaderboard ({board.length})</SectionTitle>
          {board.length === 0 ? <EmptyState title="Chưa có ai lên bảng" hint="Hãy là người đầu tiên ghi điểm." /> : board.map((x, i) => (
            <View key={x.user_id} style={s.row}>
              <Text style={[s.rank, i === 0 && s.gold, i === 1 && s.silver, i === 2 && s.bronze]}>#{i + 1}</Text>
              <View style={{ flex: 1 }}><Text style={s.rowTitle}>{x.email}</Text><Text style={s.rowMeta}>{x.solved} bài</Text></View>
              <Text style={s.score}>{x.score}</Text>
            </View>
          ))}
        </Card>
      </>}
      <GhostButton title={loading ? 'Đang tải…' : 'Làm mới'} onPress={load} disabled={loading} />
    </Screen>
  );
}

const s = StyleSheet.create({
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.sm },
  rowTitle: { color: colors.text, fontWeight: '700' },
  rowMeta: { color: colors.muted, fontSize: 12 },
  rank: { color: colors.primary, fontWeight: '700' },
  gold: { color: colors.warning },
  silver: { color: '#cbd5e1' },
  bronze: { color: '#d08a4e' },
  score: { color: colors.primary, fontWeight: '700', fontSize: 16 },
});


