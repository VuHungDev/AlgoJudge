import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, GhostButton, EmptyState, ErrorBox, LoadingBlock, StatusBadge, Chip } from '../components/ui';

interface FeedItem { at: string; kind: 'submit' | 'assign'; title: string; sub: string; link: { route: string; params: object } }

export default function ActivityScreen({ navigation }: any) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [streak, setStreak] = useState<number | null>(null);
  const [solved, setSolved] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [s, a, p, st] = await Promise.all([
        api('/me/submissions').catch(() => ({ submissions: [] })),
        api('/me/assignments').catch(() => ({ assignments: [] })),
        api('/me/progress').catch(() => ({} as { solved?: number; total?: number })),
        api('/me/streak').catch(() => ({} as { streak?: number })),
      ]);
      if (typeof (p as { solved?: number }).solved === 'number') {
        setSolved(`${(p as { solved?: number }).solved}/${(p as { total?: number }).total ?? '?'}`);
      }
      if (typeof (st as { streak?: number }).streak === 'number') setStreak((st as { streak?: number }).streak as number);
      const feed: FeedItem[] = [
        ...((s.submissions || []) as { id: number; language: string; verdict?: string; status?: string; created_at: string }[]).map((x) => ({
          at: x.created_at, kind: 'submit' as const,
          title: `Nộp bài #${x.id} · ${x.language}`,
          sub: `${x.verdict || x.status || 'đang chấm'}`,
          link: { route: 'Result', params: { id: x.id } },
        })),
        ...((a.assignments || []) as { id: number; problem_id: number; class_id?: number | null; due_at?: string | null; created_at?: string }[]).map((x) => ({
          at: x.created_at || '', kind: 'assign' as const,
          title: `Được giao bài #${x.problem_id}`,
          sub: `${x.class_id ? `Lớp #${x.class_id}` : 'Cá nhân'}${x.due_at ? ` · Hạn ${x.due_at}` : ''}`,
          link: { route: 'Detail', params: { id: x.problem_id, vid: x.problem_id } },
        })),
      ];
      feed.sort((x, y) => String(y.at).localeCompare(String(x.at)));
      setItems(feed.slice(0, 50));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen>
      <Hero kicker="QUÁ TRÌNH HỌC TẬP" title="Hoạt động của tôi" sub={`Đã giải ${solved || '…'}${streak != null ? ` · 🔥 ${streak} ngày streak` : ''}`} />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading ? <LoadingBlock hint="Đang tải hoạt động…" /> : null}
      <Card>
        <SectionTitle>Nhật ký ({items.length})</SectionTitle>
        <Muted>Mới nhất trước, tối đa 50 mục.</Muted>
        {items.map((it, i) => (
          <View key={`${it.kind}-${i}`} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{it.title}</Text>
              <Text style={s.meta}>{it.at || ''}</Text>
              {it.kind === 'submit' ? <StatusBadge value={it.sub} /> : <Chip label={it.sub} />}
            </View>
            <GhostButton title="Mở →" onPress={() => navigation.navigate(it.link.route, it.link.params)} />
          </View>
        ))}
        {!loading && items.length === 0 && !error && <EmptyState title="Chưa có hoạt động nào" hint="Làm bài đầu tiên để bắt đầu ghi nhật ký." />}
      </Card>
      <GhostButton title="Làm mới" onPress={load} disabled={loading} />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { borderTopWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
