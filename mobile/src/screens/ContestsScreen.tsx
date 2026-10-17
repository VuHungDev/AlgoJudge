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

  useEffect(() => {
    api('/contests').then((r) => setContests(r.contests || [])).catch(() => {});
    api('/me/streak').then(setStreak).catch(() => {});
    api('/me/recommend').then((r: any) => setRec(r.recommend)).catch(() => {});
  }, []);

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
