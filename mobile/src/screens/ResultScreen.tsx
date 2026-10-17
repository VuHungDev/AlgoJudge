import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import { api } from '../api';

// Chi tiet 1 bai nop: trang thai + verdict + diem + ma nguon (neu co quyen).
export default function ResultScreen({ route }: any) {
  const { id } = route.params;
  const [s, setS] = useState<any>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    api(`/submissions/${id}`).then(setS).catch((e) => setS({ error: String(e) }));
    api(`/submissions/${id}/code`).then((c) => setCode(c.source_code || '')).catch(() => {});
  }, [id]);

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Bài nộp #{id}</Text>
      {s ? <Text>{JSON.stringify(s)}</Text> : <Text>Đang tải...</Text>}
      {code ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: 'bold' }}>Mã nguồn:</Text>
          <Text style={{ fontFamily: 'monospace' }}>{code.slice(0, 2000)}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
