import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, TextInput } from 'react-native';
import { api } from '../api';

// Contest + leaderboard + streak + goi y bai (Phase 4), ban mobile.
export default function ContestsScreen() {
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
  const canCreate = me?.role === 'teacher' || me?.role === 'admin';

  useEffect(() => {
    api('/me').then(setMe).catch(() => {});
    api('/contests').then((r) => setContests(r.contests || [])).catch(() => {});
    api('/me/streak').then(setStreak).catch(() => {});
    api('/me/recommend').then((r: any) => setRec(r.recommend)).catch(() => {});
  }, []);

  const createContest = async () => {
    try {
      const problems = problemVersions.split(',').map((id) => ({ problem_version_id: Number(id.trim()), points: 100 }));
      const r = await api('/admin/contests', { method: 'POST', body: JSON.stringify({ title, description, starts_at: startsAt, ends_at: endsAt, problems }) });
      setCreateOut(`Đã tạo contest #${r.contest_id}`);
      const next = await api('/contests');
      setContests(next.contests || []);
    } catch (e: any) { setCreateOut(String(e.message || e)); }
  };

  const loadBoard = async () => {
    if (!cid) return;
    const r = await api(`/contests/${cid}/leaderboard`);
    setBoard(r.leaderboard || []);
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Streak & Gợi ý</Text>
      {streak && <Text>Streak: {streak.streak} ngày (tổng {streak.total_days} ngày có bài đúng)</Text>}
      {rec && <Text>Gợi ý: #{rec.id} {rec.title} [{rec.topic}/{rec.difficulty}]</Text>}
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>Contests</Text>
      {canCreate && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: 'bold' }}>Tạo contest (giảng viên)</Text>
          <TextInput placeholder="Tên contest" value={title} onChangeText={setTitle} style={{ borderWidth: 1, marginTop: 6 }} />
          <TextInput placeholder="Mô tả" value={description} onChangeText={setDescription} style={{ borderWidth: 1, marginTop: 6 }} />
          <TextInput placeholder="Bắt đầu: YYYY-MM-DD HH:mm:ss" value={startsAt} onChangeText={setStartsAt} style={{ borderWidth: 1, marginTop: 6 }} />
          <TextInput placeholder="Kết thúc: YYYY-MM-DD HH:mm:ss" value={endsAt} onChangeText={setEndsAt} style={{ borderWidth: 1, marginTop: 6 }} />
          <TextInput placeholder="problem_version_id, phân tách dấu phẩy" value={problemVersions} onChangeText={setProblemVersions} style={{ borderWidth: 1, marginTop: 6 }} keyboardType="numeric" />
          <Button title="Tạo contest" onPress={createContest} />
          {!!createOut && <Text>{createOut}</Text>}
        </View>
      )}
      {contests.map((c) => (
        <Text key={c.id}>#{c.id} {c.title} ({c.starts_at} → {c.ends_at})</Text>
      ))}
      <View style={{ marginTop: 8 }}>
        <TextInput placeholder="contest_id" value={cid} onChangeText={setCid} style={{ borderWidth: 1 }} keyboardType="numeric" />
        <Button title="Xem leaderboard" onPress={loadBoard} />
      </View>
      {board.map((b: any) => (
        <Text key={b.user_id}>{b.email}: {b.score} điểm / {b.solved} bài</Text>
      ))}
    </ScrollView>
  );
}
