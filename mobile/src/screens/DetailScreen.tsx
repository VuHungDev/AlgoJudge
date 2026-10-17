import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView } from 'react-native';
import { api, pollSubmission } from '../api';

export default function DetailScreen({ route, navigation }: any) {
  const { id, vid } = route.params;
  const [detail, setDetail] = useState<any>(null);
  const [lang, setLang] = useState('python');
  const [code, setCode] = useState('a,b=map(int,input().split());print(a+b)');
  const [stdin, setStdin] = useState('2 3');
  const [out, setOut] = useState('');

  useEffect(() => {
    api(`/problems/${id}`).then(setDetail);
    api(`/problems/${id}/draft`).then((d) => d.code && setCode(d.code)).catch(() => {});
  }, [id]);

  const run = async () => {
    const r = await api('/run', {
      method: 'POST',
      body: JSON.stringify({ language: lang, source_code: code, stdin }),
    });
    setOut(JSON.stringify(r));
  };

  const submit = async () => {
    const r = await api('/submissions', {
      method: 'POST',
      headers: { 'Idempotency-Key': String(Date.now()) },
      body: JSON.stringify({ problem_version_id: vid, language: lang, source_code: code }),
    });
    setOut('Đã nộp #' + r.submission_id + ' — đang chấm...');
    await pollSubmission(r.submission_id, (s) =>
      setOut(s.verdict ? JSON.stringify(s) : `Trạng thái: ${s.status}`),
    );
    navigation.navigate('Result', { id: r.submission_id });
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Bài #{id}</Text>
      {detail?.current_version && <Text>{detail.current_version.statement}</Text>}
      <Text>Ngôn ngữ (python/cpp/js):</Text>
      <TextInput value={lang} onChangeText={setLang} style={{ borderWidth: 1, marginTop: 4 }} autoCapitalize="none" />
      <TextInput multiline value={code} onChangeText={setCode} style={{ borderWidth: 1, minHeight: 160, marginTop: 8, fontFamily: 'monospace' }} />
      <TextInput placeholder="stdin chạy thử" value={stdin} onChangeText={setStdin} style={{ borderWidth: 1, marginTop: 8 }} />
      <Button title="Chạy thử" onPress={run} />
      <Button title="Nộp bài" onPress={submit} />
      <Text style={{ marginTop: 8 }}>{out}</Text>
    </ScrollView>
  );
}
