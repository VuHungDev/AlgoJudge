import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Button, ScrollView, TextInput, Pressable } from 'react-native';
import { api } from '../api';

export default function ProblemsScreen({ navigation }: any) {
  const [problems, setProblems] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api('/problems');
      setProblems(r.problems || []);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const topics = useMemo(() => [...new Set(problems.map((p) => p.topic).filter(Boolean))], [problems]);
  const filtered = useMemo(() => problems.filter((p) => {
    const text = `${p.title} ${p.topic} ${p.slug}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (!topic || p.topic === topic) && (!difficulty || p.difficulty === difficulty);
  }), [problems, query, topic, difficulty]);

  return (
    <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Bài tập</Text>
      <TextInput placeholder="Tìm tên bài hoặc chủ đề" value={query} onChangeText={setQuery} style={{ borderWidth: 1, padding: 8, marginTop: 8 }} />
      <Text style={{ marginTop: 8 }}>Chủ đề (nhập tên, bỏ trống để xem tất cả)</Text>
      <TextInput placeholder={topics.slice(0, 4).join(', ') || 'Tất cả'} value={topic} onChangeText={setTopic} style={{ borderWidth: 1, padding: 8, marginTop: 4 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 }}>
        {['', 'easy', 'medium', 'hard'].map((d) => (
          <Pressable key={d || 'all'} onPress={() => setDifficulty(d)} style={{ padding: 8, borderWidth: difficulty === d ? 2 : 1, borderColor: difficulty === d ? '#2563eb' : '#aaa' }}>
            <Text>{d || 'Tất cả'}</Text>
          </Pressable>
        ))}
      </View>
      <Button title={loading ? 'Đang tải…' : 'Làm mới'} onPress={load} disabled={loading} />
      {!!error && <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text>}
      {!loading && !error && filtered.length === 0 && <Text style={{ marginTop: 12 }}>Không tìm thấy bài phù hợp.</Text>}
      {filtered.map((p) => (
        <View key={p.id} style={{ marginTop: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10 }}>
          <Text style={{ fontWeight: 'bold' }}>#{p.id} {p.title}</Text>
          <Text>{p.topic} · {p.difficulty}</Text>
          <Button title="Mở bài" onPress={() => navigation.navigate('Detail', { id: p.id, vid: p.current_version_id })} />
        </View>
      ))}
      <View style={{ marginTop: 16, gap: 8 }}>
        <Button title="Lịch sử & Tiến độ" onPress={() => navigation.navigate('History')} />
        <Button title="Contest & Streak" onPress={() => navigation.navigate('Contests')} />
        <Button title="Hồ sơ" onPress={() => navigation.navigate('Profile')} />
        <Button title="Giảng viên" onPress={() => navigation.navigate('Teacher')} />
        <Button title="Ops" onPress={() => navigation.navigate('Ops')} />
      </View>
    </ScrollView>
  );
}
