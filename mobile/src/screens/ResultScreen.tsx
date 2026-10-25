import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, StatusBadge, CodeBlock, EmptyState, ErrorBox, LoadingBlock, GhostButton, LangBadge, StatRow } from '../components/ui';

interface CaseRow { id?: number; verdict: string; time_ms?: number; memory_kb?: number }

export default function ResultScreen({ route }: any) {
  const { id } = route.params;
  const [s, setS] = useState<{ status?: string; verdict?: string; score?: number; attempt?: number; language?: string; current_run?: { verdict?: string }; case_results?: CaseRow[]; caseResults?: CaseRow[]; cases?: CaseRow[] } | null>(null);
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('');
  const [review, setReview] = useState<{ score?: number | null; comment?: string | null } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, source, rv] = await Promise.all([
        api(`/submissions/${id}`),
        api(`/submissions/${id}/code`),
        api(`/submissions/${id}/review`).catch(() => null),
      ]);
      setS(result); setCode(source.source_code || source.code || ''); setLang(source.language || result.language || ''); setReview(rv); setError('');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const verdict = s?.verdict || s?.current_run?.verdict;
  const cases = s?.case_results || s?.caseResults || s?.cases || [];
  const done = !!verdict && verdict !== 'PENDING' && verdict !== 'QUEUED' && verdict !== 'RUNNING';
  const passed = cases.filter((c) => c.verdict === 'ACCEPTED').length;

  return (
    <Screen>
      <Hero kicker={`SUBMISSION #${id}`} title="Kết quả chấm" sub={done ? 'Đã có kết quả cuối cùng.' : 'Worker vẫn đang xử lý — bấm Làm mới để cập nhật.'} />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {!s && !error ? <LoadingBlock hint="Đang tải kết quả…" /> : null}
      {s && <>
        <Card style={st.hero}>
          <StatusBadge value={verdict} />
          <Text style={st.score}>{s.score ?? 0}<Text style={st.scoreUnit}> điểm</Text></Text>
          {lang ? <LangBadge lang={lang} /> : null}
        </Card>
        <StatRow stats={[
          { label: 'CA ĐÚNG', value: `${passed}/${cases.length}`, accent: colors.success },
          { label: 'ATTEMPT', value: String(s.attempt ?? 0) },
          { label: 'STATUS', value: s.status || '—' },
        ]} />
        <Card>
          <SectionTitle>Từng test case ({cases.length})</SectionTitle>
          {cases.length ? cases.map((c, i) => (
            <View key={c.id || i} style={st.caseRow}>
              <Text style={st.caseName}>Ca {i + 1}</Text>
              <StatusBadge value={c.verdict} />
              <Text style={st.caseTime}>{c.time_ms ?? 0} ms</Text>
            </View>
          )) : <Text style={st.meta}>Chưa có dữ liệu — bài có thể đang trong hàng đợi.</Text>}
        </Card>
      </>}
      {code ? <Card><SectionTitle>Mã nguồn</SectionTitle><CodeBlock title={`submission #${id}`} code={code.slice(0, 10000)} /></Card> : null}
      {(review?.score != null || review?.comment) ? (
        <Card>
          <SectionTitle>Nhận xét của giảng viên</SectionTitle>
          <Text style={st.reviewScore}>{review.score ?? '—'}<Text style={st.scoreUnit}>/100 điểm tay</Text></Text>
          {review.comment ? <Text style={st.reviewComment}>“{review.comment}”</Text> : null}
        </Card>
      ) : null}
      {!s && !error ? null : <GhostButton title={loading ? 'Đang tải…' : 'Làm mới kết quả'} onPress={load} disabled={loading} />}
      {s && cases.length === 0 && done ? <EmptyState title="Không có ca chấm" hint="Bài nộp có thể gặp lỗi hệ thống." /> : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { alignItems: 'center', borderColor: colors.primary },
  score: { color: colors.text, fontSize: 24, fontWeight: '700' },
  scoreUnit: { fontSize: 15, color: colors.muted, fontWeight: '400' },
  meta: { color: colors.muted, fontSize: 12 },
  caseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.sm },
  caseName: { color: colors.text, fontWeight: '700', flex: 1 },
  caseTime: { color: colors.muted, fontSize: 12 },
  reviewScore: { color: colors.primary, fontSize: 24, fontWeight: '700' },
  reviewComment: { color: colors.text, fontSize: 14, marginTop: spacing.sm, fontStyle: 'italic' },
});


