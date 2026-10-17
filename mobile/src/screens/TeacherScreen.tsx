import React, { useState } from 'react';
import { Text, Button, ScrollView, TextInput } from 'react-native';
import { api } from '../api';

// Khu giang vien tren mobile (dong bo voi web /teacher): testset + rejudge +
// compare + similarity + progress lop.
export default function TeacherScreen() {
  const [pid, setPid] = useState('1');
  const [cases, setCases] = useState('[{"input":"2 3","expected":"5","is_public":1,"group":"co-ban","weight":1}]');
  const [sid, setSid] = useState('');
  const [ra, setRa] = useState('');
  const [rb, setRb] = useState('');
  const [sa, setSa] = useState('');
  const [sb, setSb] = useState('');
  const [cid, setCid] = useState('');
  const [out, setOut] = useState('');

  const show = async (p: Promise<any>) => {
    try { setOut(JSON.stringify(await p)); } catch (e: any) { setOut(String(e.message || e)); }
  };

  const mkts = () =>
    show(api(`/admin/problems/${pid}/testsets`, {
      method: 'POST',
      body: JSON.stringify({ checker: 'exact', cases: JSON.parse(cases) }),
    }));

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Tạo testset</Text>
      <TextInput placeholder="problem_id" value={pid} onChangeText={setPid} style={{ borderWidth: 1, marginTop: 8 }} keyboardType="numeric" />
      <TextInput multiline value={cases} onChangeText={setCases} style={{ borderWidth: 1, minHeight: 100, marginTop: 8, fontFamily: 'monospace' }} />
      <Button title="Tạo testset" onPress={mkts} />
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>Chấm lại + Đối chiếu</Text>
      <TextInput placeholder="submission_id" value={sid} onChangeText={setSid} style={{ borderWidth: 1, marginTop: 8 }} keyboardType="numeric" />
      <TextInput placeholder="run a" value={ra} onChangeText={setRa} style={{ borderWidth: 1, marginTop: 8 }} keyboardType="numeric" />
      <TextInput placeholder="run b" value={rb} onChangeText={setRb} style={{ borderWidth: 1, marginTop: 8 }} keyboardType="numeric" />
      <Button title="Chấm lại" onPress={() => show(api(`/admin/submissions/${sid}/rejudge`, { method: 'POST' }))} />
      <Button title="Đối chiếu" onPress={() => show(api(`/admin/submissions/${sid}/compare?a=${ra}&b=${rb}`))} />
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>Chống đạo văn</Text>
      <TextInput placeholder="submission a" value={sa} onChangeText={setSa} style={{ borderWidth: 1, marginTop: 8 }} keyboardType="numeric" />
      <TextInput placeholder="submission b" value={sb} onChangeText={setSb} style={{ borderWidth: 1, marginTop: 8 }} keyboardType="numeric" />
      <Button title="So sánh" onPress={() => show(api(`/admin/submissions/${sa}/similarity/${sb}`))} />
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>Theo dõi lớp</Text>
      <TextInput placeholder="class_id" value={cid} onChangeText={setCid} style={{ borderWidth: 1, marginTop: 8 }} keyboardType="numeric" />
      <Button title="Xem" onPress={() => show(api(`/admin/classes/${cid}/progress`))} />
      <Text style={{ marginTop: 8 }}>{out}</Text>
    </ScrollView>
  );
}
