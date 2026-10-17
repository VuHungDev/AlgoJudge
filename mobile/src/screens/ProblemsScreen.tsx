import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import { api } from '../api';

export default function ProblemsScreen({ navigation }: any) {
  const [problems, setProblems] = useState<any[]>([]);

  useEffect(() => {
    api('/problems').then((r) => setProblems(r.problems || []));
  }, []);

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Bài tập</Text>
      {problems.map((p) => (
        <View key={p.id} style={{ marginTop: 8, borderWidth: 1, padding: 8 }}>
          <Text>#{p.id} {p.title} [{p.topic}/{p.difficulty}]</Text>
          <Button title="Mở" onPress={() => navigation.navigate('Detail', { id: p.id, vid: p.current_version_id })} />
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
