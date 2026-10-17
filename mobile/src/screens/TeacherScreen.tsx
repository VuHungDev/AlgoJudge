import React, { useState } from 'react';
import { View, Text, Button, ScrollView, TextInput } from 'react-native';
import { api } from '../api';

// Khu giang vien tren mobile: rejudge + compare + similarity.
export default function TeacherScreen() {
  const [sid, setSid] = useState('');
  const [out, setOut] = useState('');

  const rejudge = async () => {
    const r = await api(`/admin/submissions/${sid}/rejudge`, { method: 'POST' });
    setOut(JSON.stringify(r));
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Giảng viên</Text>
      <TextInput placeholder="submission_id" value={sid} onChangeText={setSid} style={{ borderWidth: 1, marginTop: 8 }} keyboardType="numeric" />
      <Button title="Chấm lại" onPress={rejudge} />
      <Text style={{ marginTop: 8 }}>{out}</Text>
    </ScrollView>
  );
}
