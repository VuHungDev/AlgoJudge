import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, Pressable } from 'react-native';
import { api } from '../api';

export default function HistoryScreen({ navigation }: any) {
  const [hist, setHist] = useState<any[]>([]);
  const [prog, setProg] = useState<any>(null);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [h, p] = await Promise.all([api('/me/submissions'), api('/me/progress')]);
      setHist(h.submissions || []);
      setProg(p);
    } catch (e: any) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = hist.filter((s) => filter === 'ALL' || (s.verdict || s.current_run?.verdict || 'PENDING') === filter);
  const verdicts = ['ALL', 'ACCEPTED', 'WRONG_ANSWER', 'COMPILE_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'PENDING'];

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Tiến độ</Text>
      <Text>{prog ? `Đã giải ${prog.solved}/${prog.total} bài` : loading ? 'Đang tải…' : 'Chưa có dữ liệu'}</Text>
      <Button title="Làm mới" onPress={load} disabled={loading} />
      {!!error && <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text>}
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>Lịch sử</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {verdicts.map((v) => (
            <Pressable key={v} onPress={() => setFilter(v)} style={{ borderWidth: filter === v ? 2 : 1, borderColor: filter === v ? '#2563eb' : '#aaa', padding: 6 }}>
              <Text>{v === 'ALL' ? 'Tất cả' : v}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {visible.map((s: any) => {
        const run = s.current_run || s.currentRun || s;
        return (
          <View key={s.id} style={{ borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 8 }}>
            <Text>#{s.id} · {s.language} · {run.verdict || run.status || 'Đang chờ'} · {run.score ?? 0} điểm</Text>
            <Button title="Xem kết quả" onPress={() => navigation.navigate('Result', { id: s.id })} />
          </View>
        );
      })}
      {!loading && visible.length === 0 && <Text>Không có bài nộp phù hợp.</Text>}
    </ScrollView>
  );
}
