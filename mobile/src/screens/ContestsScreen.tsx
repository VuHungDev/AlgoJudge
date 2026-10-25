import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, AccentButton, GhostButton, EmptyState, ErrorBox, LoadingBlock, StatRow, Pagination, type PageMeta } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';

const BOARD_PER = 10;

export default function ContestsScreen({ navigation }: any) {
  const { confirm } = useConfirm();
  const toast = useToast();
  const [contests, setContests] = useState<any[]>([]);
  const [cid, setCid] = useState('');
  const [board, setBoard] = useState<any[]>([]);
  const [streak, setStreak] = useState<any>(null);
  const [rec, setRec] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [problemVersions, setProblemVersions] = useState('1');
  const [createOut, setCreateOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [boardPage, setBoardPage] = useState(1);
  const [editTitle, setEditTitle] = useState<Record<number, string>>({});
  const canCreate = me?.role === 'teacher' || me?.role === 'admin';

  const load = useCallback(async (page = 1) => {
    setLoading(true); setError('');
    try {
      const [m, c, s, r] = await Promise.all([
        api('/me').catch(() => null), api(`/contests?page=${page}&per_page=10`),
        api('/me/streak').catch(() => null), api('/me/recommend').catch(() => null),
      ]);
      setMe(m); setContests(c.contests || []); setMeta(c.meta || null); setStreak(s); setRec(r?.recommend || null);
    } catch (e: any) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const createContest = async () => {
    try {
      const problems = problemVersions.split(',').map((id) => ({ problem_version_id: Number(id.trim()), points: 100 }));
      const r = await api('/admin/contests', { method: 'POST', body: JSON.stringify({ title, description, starts_at: startsAt, ends_at: endsAt, problems }) });
      toast.success('Đã tạo contest', `Contest #${r.contest_id}`);
      load(1);
    } catch (e: any) { toast.error('Tạo thất bại', String(e.message || e)); }
  };

  const loadBoard = async () => {
    if (!cid) return;
    try {
      const r = await api(`/contests/${cid}/leaderboard`);
      setBoard(r.leaderboard || []); setBoardPage(1);
    } catch (e: any) { setError(String(e.message || e)); }
  };

  const renameContest = async (id: number) => {
    const name = (editTitle[id] || '').trim();
    if (!name) { toast.warning('Nhập tên mới cho contest trước.'); return; }
    try {
      await api(`/admin/contests/${id}`, { method: 'PUT', body: JSON.stringify({ title: name }) });
      setEditTitle((p) => ({ ...p, [id]: '' }));
      toast.success('Đã đổi tên', `Contest #${id}`);
      load(meta?.page || 1);
    } catch (e: any) { toast.error('Đổi tên thất bại', String(e.message || e)); }
  };

  const deleteContest = async (c: any) => {
    const ok = await confirm({ title: 'Xóa contest', message: `Xóa contest #${c.id} "${c.title}"?`, danger: true });
    if (!ok) return;
    try {
      await api(`/admin/contests/${c.id}`, { method: 'DELETE' });
      toast.success('Đã xóa', `Contest #${c.id}`);
      load(1);
    } catch (e: any) { toast.error('Xóa thất bại', String(e.message || e)); }
  };

  const boardRows = board.slice((boardPage - 1) * BOARD_PER, boardPage * BOARD_PER);
  const boardMeta: PageMeta = {
    page: boardPage, per_page: BOARD_PER, total: board.length, last_page: Math.max(1, Math.ceil(board.length / BOARD_PER)),
  };

  return (
    <Screen>
      <Hero kicker="COMPETE" title="Contest & xếp hạng" sub="Thi đấu theo mùa, giữ streak và leo bảng xếp hạng." />
      {error ? <ErrorBox message={error} onRetry={() => load(1)} /> : null}
      <StatRow stats={[
        { label: 'STREAK', value: String(streak?.streak ?? '—'), accent: colors.primary },
        { label: 'NGÀY ACTIVE', value: String(streak?.total_days ?? 0) },
        { label: 'GỢI Ý', value: rec ? `#${rec.id}` : '—', accent: colors.accent },
      ]} />
      {canCreate && (
        <Card>
          <SectionTitle>Tổ chức contest mới</SectionTitle>
          <Field label="Tên contest"><AppInput value={title} onChangeText={setTitle} placeholder="Weekly #12" /></Field>
          <Field label="Mô tả"><AppInput value={description} onChangeText={setDescription} placeholder="Mô tả ngắn" /></Field>
          <Field label="Bắt đầu (YYYY-MM-DD HH:mm:ss)"><AppInput value={startsAt} onChangeText={setStartsAt} placeholder="2026-10-20 08:00:00" /></Field>
          <Field label="Kết thúc (YYYY-MM-DD HH:mm:ss)"><AppInput value={endsAt} onChangeText={setEndsAt} placeholder="2026-10-20 10:00:00" /></Field>
          <Field label="problem_version_id, cách nhau dấu phẩy"><AppInput value={problemVersions} onChangeText={setProblemVersions} keyboardType="numeric" /></Field>
          <PrimaryButton title="Tạo contest" onPress={createContest} />
          {!!createOut && <Muted>{createOut}</Muted>}
        </Card>
      )}
      <SectionTitle>Danh sách contest ({meta ? `${meta.total} mùa` : contests.length})</SectionTitle>
      {loading ? <LoadingBlock hint="Đang tải contest…" /> : null}
      {contests.map((c) => (
        <Card key={c.id}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>#{c.id} {c.title}</Text>
              <Text style={s.rowMeta}>{c.starts_at} → {c.ends_at}</Text>
            </View>
          </View>
          <AccentButton title="Mở chi tiết ›" onPress={() => navigation.navigate('ContestDetail', { id: c.id })} />
          {canCreate && (
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field label={`Đổi tên contest #${c.id}`}><AppInput value={editTitle[c.id] ?? ''} onChangeText={(v) => setEditTitle((p) => ({ ...p, [c.id]: v }))} placeholder={c.title} /></Field>
              </View>
            </View>
          )}
          {canCreate && (
            <View style={s.btnRow}>
              <View style={{ flex: 1 }}><GhostButton title="Lưu tên" onPress={() => renameContest(c.id)} /></View>
              <View style={{ flex: 1 }}><GhostButton title="Xóa" onPress={() => deleteContest(c)} /></View>
            </View>
          )}
        </Card>
      ))}
      {!loading && contests.length === 0 && !error && <EmptyState title="Chưa có contest nào" hint="Quay lại sau khi giảng viên tạo mùa giải mới." />}
      <Pagination meta={meta} onPage={load} />
      <Card>
        <SectionTitle>Tra leaderboard nhanh (10 / trang)</SectionTitle>
        <Field label="contest_id"><AppInput value={cid} onChangeText={setCid} keyboardType="numeric" placeholder="vd. 1" /></Field>
        <GhostButton title="Xem leaderboard" onPress={loadBoard} />
      </Card>
      {boardRows.map((b: any, i: number) => {
        const rank = (boardPage - 1) * BOARD_PER + i;
        return (
          <Card key={b.user_id} style={s.rowCard}>
            <Text style={[s.rank, rank === 0 && s.gold, rank === 1 && s.silver, rank === 2 && s.bronze]}>#{rank + 1}</Text>
            <View style={{ flex: 1 }}><Text style={s.rowTitle}>{b.email}</Text><Text style={s.rowMeta}>{b.solved} bài</Text></View>
            <Text style={s.score}>{b.score}</Text>
          </Card>
        );
      })}
      {board.length > 0 && <Pagination meta={boardMeta} onPage={setBoardPage} />}
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rank: { color: colors.muted, fontWeight: '700', fontSize: 16 },
  gold: { color: colors.warning },
  silver: { color: '#cbd5e1' },
  bronze: { color: '#d08a4e' },
  score: { color: colors.primary, fontWeight: '700', fontSize: 18 },
});


