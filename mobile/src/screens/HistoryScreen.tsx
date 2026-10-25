import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, StatusBadge, Chip, ProgressBar, EmptyState, ErrorBox, LoadingBlock, PrimaryButton, GhostButton, LangBadge, Pagination, type PageMeta } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';

interface HistItem { id: number; language: string; verdict?: string; score?: number; current_run?: { verdict?: string; status?: string; score?: number } }

const FILTERS = ['ALL', 'ACCEPTED', 'WRONG_ANSWER', 'COMPILE_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'SYSTEM_ERROR'];

export default function HistoryScreen({ navigation }: any) {
  const { confirm } = useConfirm();
  const toast = useToast();
  const [hist, setHist] = useState<HistItem[]>([]);
  const [prog, setProg] = useState<{ solved: number; total: number } | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<PageMeta | null>(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true); setError('');
    try {
      const [h, p] = await Promise.all([api(`/me/submissions?page=${page}&per_page=20`), api('/me/progress')]);
      setHist(h.submissions || []); setMeta(h.meta || null); setProg(p);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(1); }, [load]);

  const visible = hist.filter((x) => filter === 'ALL' || (x.verdict || x.current_run?.verdict || 'PENDING') === filter);
  const pct = prog && prog.total > 0 ? Math.round((prog.solved / prog.total) * 100) : 0;
  const [page, setPage] = useState(1);

  const removeOne = async (id: number) => {
    const ok = await confirm({ title: 'Xóa bài nộp', message: `Xóa bài nộp #${id}?`, danger: true });
    if (!ok) return;
    try {
      await api(`/submissions/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa', `Bài nộp #${id}`);
      load(page);
    } catch (e: unknown) { toast.error('Xóa thất bại', e instanceof Error ? e.message : String(e)); }
  };

  return (
    <Screen>
      <Hero kicker="MY JOURNEY" title="Lịch sử & tiến độ" sub={prog ? `Đã giải ${prog.solved}/${prog.total} bài (${pct}%).` : 'Mọi bài nộp của bạn ở một nơi.'} />
      <Card>
        <Text style={s.big}>{prog ? `${prog.solved}/${prog.total}` : '…'}</Text>
        <Muted>bài đã giải</Muted>
        <ProgressBar pct={pct} />
        <PrimaryButton title={loading ? 'Đang tải…' : 'Làm mới'} onPress={() => load(1)} disabled={loading} />
      </Card>
      {error ? <ErrorBox message={error} onRetry={() => load(1)} /> : null}
      <SectionTitle>Bộ lọc verdict</SectionTitle>
      <View style={s.filters}>
        {['ALL', ...FILTERS].map((v) => (
          <Chip key={v} label={v === 'ALL' ? 'Tất cả' : v.replace(/_/g, ' ')} active={filter === v} onPress={() => setFilter(v)} />
        ))}
      </View>
      {loading ? <LoadingBlock hint="Đang tải lịch sử…" /> : null}
      {visible.map((x) => {
        const verdict = x.verdict || x.current_run?.verdict || 'PENDING';
        const score = x.score ?? x.current_run?.score ?? 0;
        return (
          <Card key={x.id}>
            <Pressable onPress={() => navigation.navigate('Result', { id: x.id })}>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>#{x.id}</Text>
                  <View style={s.tagRow}><LangBadge lang={x.language} /><Text style={s.rowMeta}>{score} điểm</Text></View>
                </View>
                <StatusBadge value={verdict} />
              </View>
            </Pressable>
            <GhostButton title="Xóa bài này" onPress={() => removeOne(x.id)} />
          </Card>
        );
      })}
      {!loading && visible.length === 0 && !error && <EmptyState title="Không có bài nộp phù hợp" hint="Thử đổi bộ lọc hoặc nộp bài mới." />}
      <Pagination meta={meta} onPage={(p) => { setPage(p); load(p); }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  big: { color: colors.text, fontSize: 26, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 17 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  rowMeta: { color: colors.muted, fontSize: 12 },
});


