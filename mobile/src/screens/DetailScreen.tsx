import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView } from 'react-native';
import { api, pollSubmission } from '../api';

const STARTER: Record<string, string> = {
  python: 'a,b=map(int,input().split());print(a+b)',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){long long a,b;if(!(cin>>a>>b))return 0;cout<<a+b;return 0;}',
  js: 'const fs=require("fs");const[a,b]=fs.readFileSync(0,"utf8").trim().split(/\\s+/).map(Number);console.log(a+b);',
  java: 'import java.util.*;\npublic class Main{\npublic static void main(String[]a){\nScanner s=new Scanner(System.in);\nlong x=s.nextLong(),y=s.nextLong();\nSystem.out.println(x+y);}}',
  go: 'package main\nimport "fmt"\nfunc main(){var a,b int;fmt.Scan(&a,&b);fmt.Println(a+b)}',
  c: '#include <stdio.h>\nint main(){long long a,b;if(scanf("%lld%lld",&a,&b)!=2)return 0;printf("%lld\\n",a+b);return 0;}',
};

const LANGS = ['python', 'cpp', 'js', 'java', 'go', 'c'];

export default function DetailScreen({ route, navigation }: any) {
  const { id, vid } = route.params;
  const [detail, setDetail] = useState<any>(null);
  const [lang, setLang] = useState('python');
  const [code, setCode] = useState(STARTER.python);
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
      <Text>Ngôn ngữ:</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
        {LANGS.map((l) => (
          <View key={l} style={{ borderWidth: lang === l ? 2 : 1, borderColor: lang === l ? 'blue' : '#999' }}>
            <Button title={l} onPress={() => { setLang(l); setCode(STARTER[l]); }} />
          </View>
        ))}
      </View>
      <TextInput multiline value={code} onChangeText={setCode} style={{ borderWidth: 1, minHeight: 160, marginTop: 8, fontFamily: 'monospace' }} />
      <TextInput placeholder="stdin chạy thử" value={stdin} onChangeText={setStdin} style={{ borderWidth: 1, marginTop: 8 }} />
      <Button title="Chạy thử" onPress={run} />
      <Button title="Nộp bài" onPress={submit} />
      <Text style={{ marginTop: 8 }}>{out}</Text>
    </ScrollView>
  );
}
