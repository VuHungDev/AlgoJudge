import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, AppInput, Chip, DiffBadge, EmptyState, ErrorBox, LoadingBlock, PrimaryButton, GhostButton, Pagination, type PageMeta } from '../components/ui';
import { api } from '../api';

interface Problem { id: number; title: string; topic?: string; difficulty?: string; slug?: string; current_version_id: number }

const QUICK_NAV: { label: string; route: string; admin?: boolean; teacher?: boolean }[] = [
  { label: 'Bài được giao', route: 'Assignments' },
  { label: 'Hoạt động', route: 'Activity' },
  { label: 'Lịch sử', route: 'History' },
  { label: 'Tiến độ', route: 'Progress' },
  { label: 'Kỳ thi', route: 'Contests' },
  { label: 'Hồ sơ', route: 'Profile' },
  { label: 'Giảng viên', route: 'Teacher', teacher: true },
  { label: 'Quản trị', route: 'Ops', admin: true },
];

export default function ProblemsScreen({ navigation }: any) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [progress, setProgress] = useState<{ solved: number; total: number } | null>(null);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [meta, setMeta] = useState<PageMeta | null>(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams();
      if (topic) qs.set('topic', topic);
      if (difficulty) qs.set('difficulty', difficulty);
      qs.set('page', String(page));
      qs.set('per_page', '10');
      const [r, account, pr] = await Promise.all([
        api(`/problems?${qs.toString()}`), api('/me'), api('/me/progress'),
      ]);
      setProblems(r.problems || []);
      setMeta(r.meta || null);
      setMe(account);
      setProgress(pr);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [topic, difficulty]);

  useEffect(() => { load(1); }, [load]);

  const topics = useMemo(() => [...new Set(problems.map((p) => p.topic).filter(Boolean))], [problems]);
  const filtered = useMemo(() => problems.filter((p) => {
    const text = `${p.title} ${p.topic} ${p.slug}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (!topic || p.topic === topic) && (!difficulty || p.difficulty === difficulty);
  }), [problems, query, topic, difficulty]);

  const isTeacher = me?.role === 'teacher' || me?.role === 'admin';
  const isAdmin = me?.role === 'admin';

  return (
    <Screen>
      <Hero
        kicker="KHÔNG GIAN HỌC TẬP"
        title="Bài tập của tôi"
        sub={progress ? `Đã giải ${progress.solved}/${progress.total} bài — chọn bài tiếp theo.` : 'Tìm bài theo tên, lọc theo chủ đề và độ khó.'}
      />

      <Card>
        <SectionTitle>Tìm bài tập</SectionTitle>
        <AppInput placeholder="Nhập tên hoặc mã bài tập" value={query} onChangeText={setQuery} />
        <Text style={s.label}>ĐỘ KHÓ</Text>
        <View style={s.filters}>
          {[['', 'Tất cả'], ['easy', 'Dễ'], ['medium', 'Trung bình'], ['hard', 'Khó']].map(([v, l]) => (
            <Chip key={v || 'all'} label={l} active={difficulty === v} onPress={() => setDifficulty(v)} />
          ))}
        </View>
        {topics.length > 0 ? (
          <>
            <Text style={s.label}>CHỦ ĐỀ</Text>
            <View style={s.filters}>
              <Chip label="Tất cả" active={topic === ''} onPress={() => setTopic('')} />
              {topics.map((t) => <Chip key={t} label={t || ''} active={topic === t} onPress={() => setTopic(t || '')} />)}
            </View>
          </>
        ) : null}
      </Card>

      <SectionTitle>Danh sách bài tập ({meta ? `${meta.total} bài` : filtered.length})</SectionTitle>
      {error ? <ErrorBox message={error} onRetry={() => load(1)} /> : null}
      {loading ? <LoadingBlock hint="Đang tải thư viện bài…" /> : null}
      {!loading && !error && filtered.length === 0 && <EmptyState title="Không tìm thấy bài phù hợp" hint="Thử nới lỏng từ khóa hoặc bộ lọc." />}
      {filtered.map((p) => (
        <Card key={p.id}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.problemTitle}>{p.title}</Text>
              <Text style={s.meta}>Mã bài: {p.slug} · Chủ đề: {p.topic}</Text>
            </View>
            <DiffBadge d={p.difficulty} />
          </View>
          <PrimaryButton title="Mở phòng làm bài →" onPress={() => navigation.navigate('Detail', { id: p.id, vid: p.current_version_id })} />
        </Card>
      ))}
      <Pagination meta={meta} onPage={load} />

      <Card>
        <SectionTitle>Chức năng</SectionTitle>
        <View style={s.navGrid}>
          {QUICK_NAV.filter((n) => (!n.admin || isAdmin) && (!n.teacher || isTeacher)).map((n) => (
            <Pressable key={n.route} style={s.navCell} onPress={() => navigation.navigate(n.route)}>
              <Text style={s.navCellText}>{n.label}</Text>
            </Pressable>
          ))}
        </View>
        <GhostButton title={loading ? 'Đang tải…' : 'Làm mới thư viện'} onPress={() => load(1)} disabled={loading} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  label: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: spacing.xs },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  problemTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.muted, marginTop: 4, fontSize: 12 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  navCell: { flexBasis: '31%', flexGrow: 1, backgroundColor: colors.raised, borderColor: colors.borderSoft, borderWidth: 1, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  navCellText: { color: colors.text, fontWeight: '700' },
});


