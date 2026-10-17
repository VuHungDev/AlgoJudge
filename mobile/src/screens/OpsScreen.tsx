import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, TextInput } from 'react-native';
import { api } from '../api';

// Khu ops tren mobile (dong bo voi web /ops): queue + workers + requeue.
export default function OpsScreen() {
  const [q, setQ] = useState<any>(null);
  const [rid, setRid] = useState('');
  const [out, setOut] = useState('');

  const load = async () => {
    const queue = await api('/ops/queue').catch((e) => ({ error: String(e) }));
    const workers = await api('/ops/workers').catch((e) => ({ error: String(e) }));
    setQ({ queue, workers });
  };

  useEffect(() => { load(); }, []);

  const requeue = async () => {
    const r = await api(`/ops/runs/${rid}/requeue`, { method: 'POST' });
    setOut(JSON.stringify(r));
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Ops</Text>
      <Button title="Tải lại hàng đợi" onPress={load} />
      {q && <Text>{JSON.stringify(q)}</Text>}
      <TextInput placeholder="run_id requeue" value={rid} onChangeText={setRid} style={{ borderWidth: 1, marginTop: 8 }} keyboardType="numeric" />
      <Button title="Requeue" onPress={requeue} />
      <Text style={{ marginTop: 8 }}>{out}</Text>
    </ScrollView>
  );
}
