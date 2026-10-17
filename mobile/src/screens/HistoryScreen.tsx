import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import { api } from '../api';

export default function HistoryScreen({ navigation }: any) {
  const [hist, setHist] = useState<any[]>([]);
  const [prog, setProg] = useState<any>(null);

  useEffect(() => {
    api('/me/submissions').then((r) => setHist(r.submissions || []));
    api('/me/progress').then(setProg);
  }, []);

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Tiến độ</Text>
      <Text>{prog ? `Đã giải ${prog.solved}/${prog.total} bài` : '...'}</Text>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>Lịch sử</Text>
      {hist.map((s: any, i: number) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text>#{s.id} {s.language} {s.verdict || '...'} {s.score}</Text>
          <Button title="Xem" onPress={() => navigation.navigate('Result', { id: s.id })} />
        </View>
      ))}
    </ScrollView>
  );
}
