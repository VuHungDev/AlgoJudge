import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api, pollSubmission } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, AccentButton, GhostButton, Chip, CodeBlock, LangBadge } from '../components/ui';
import { useToast } from '../components/feedback';

const STARTER: Record<string, string> = {
  python: 'a,b=map(int,input().split());print(a+b)',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){long long a,b;if(!(cin>>a>>b))return 0;cout<<a+b;return 0;}',
  js: 'const fs=require("fs");const[a,b]=fs.readFileSync(0,"utf8").trim().split(/\\s+/).map(Number);console.log(a+b);',
  java: 'import java.util.*;\npublic class Main{\npublic static void main(String[]a){\nScanner s=new Scanner(System.in);\nlong x=s.nextLong(),y=s.nextLong();\nSystem.out.println(x+y);}}',
  go: 'package main\nimport "fmt"\nfunc main(){var a,b int;fmt.Scan(&a,&b);fmt.Println(a+b)}',
  c: '#include <stdio.h>\nint main(){long long a,b;if(scanf("%lld%lld",&a,&b)!=2)return 0;printf("%lld\\n",a+b);return 0;}',
};

const LANGS = ['python', 'cpp', 'js', 'java', 'go', 'c'];
const LANG_LABEL: Record<string, string> = { python: 'Python', cpp: 'C++', js: 'JS', java: 'Java', go: 'Go', c: 'C' };

function createIdempotencyKey(): string {
  const cryptoApi = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function DetailScreen({ route, navigation }: any) {
  const toast = useToast();
  const { id, vid } = route.params;
  const [detail, setDetail] = useState<{ current_version?: { statement?: string; time_limit_ms?: number; memory_limit_kb?: number } } | null>(null);
  const [lang, setLang] = useState('python');
  const [code, setCode] = useState(STARTER.python);
  const [stdin, setStdin] = useState('2 3');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    // Chi hoc sinh duoc lam bai; teacher/admin khong co nhu cau giai de.
    api('/me').then((m: { role?: string }) => {
      if (m?.role && m.role !== 'student') setBlocked(true);
    }).catch(() => {});
    api(`/problems/${id}`).then(setDetail).catch((e: unknown) => setOut(e instanceof Error ? e.message : String(e)));
    api(`/problems/${id}/draft`).then((d) => d.code && setCode(d.code)).catch(() => {});
  }, [id]);

  const saveDraft = async () => {
    try {
      await api(`/problems/${id}/draft`, { method: 'PUT', body: JSON.stringify({ language: lang, code }) });
      toast.success('Đã lưu nháp', `${LANG_LABEL[lang]} · bài #${id}`);
      setOut(`Đã lưu nháp ${LANG_LABEL[lang]} cho bài #${id}.`);
    } catch (e: unknown) { toast.error('Lưu nháp thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const run = async () => {
    setBusy(true);
    try {
      const r = await api('/run', { method: 'POST', body: JSON.stringify({ language: lang, source_code: code, stdin }) });
      const verdict = r?.verdict || r?.status || 'DONE';
      const stdout = r?.stdout ?? r?.output ?? '';
      const stderr = r?.stderr ?? r?.error ?? '';
      const parts = [`▶ ${verdict}${r?.time_ms != null ? ` · ${r.time_ms} ms` : ''}`];
      if (stdout) parts.push('— stdout —\n' + String(stdout).trimEnd());
      if (stderr) parts.push('— stderr —\n' + String(stderr).trimEnd());
      if (!stdout && !stderr) parts.push('(không có output)');
      setOut(parts.join('\n'));
      if (stderr) toast.error('Chạy có lỗi', String(stderr).split('\n')[0].slice(0, 120));
      else toast.success('Đã chạy thử', String(verdict));
    } catch (e: unknown) { toast.error('Chạy thất bại', e instanceof Error ? e.message : String(e)); setOut(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api('/submissions', {
        method: 'POST',
        headers: { 'Idempotency-Key': createIdempotencyKey() },
        body: JSON.stringify({ problem_version_id: vid, language: lang, source_code: code }),
      });
      setOut('Đã nộp #' + r.submission_id + ' — đang chấm...');
      toast.info('Đã nộp bài', `Bài nộp #${r.submission_id} đang được chấm`);
      const result = await pollSubmission(r.submission_id, (s) =>
        setOut(s.verdict ? `Kết quả: ${s.verdict} (${s.score ?? 0} điểm)` : `Trạng thái: ${s.status}`),
      );
      if (result === 'TIMEOUT') {
        setOut(`Bài #${r.submission_id} vẫn đang chấm. Mở kết quả để xem tiếp.`);
        toast.warning('Chấm chưa xong', 'Mở trang kết quả để theo dõi tiếp');
      }
      navigation.navigate('Result', { id: r.submission_id });
    } catch (e: unknown) { toast.error('Nộp bài thất bại', e instanceof Error ? e.message : String(e)); setOut(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const limits: string[] = [];
  if (detail?.current_version?.time_limit_ms) limits.push(`${detail.current_version.time_limit_ms} ms`);
  if (detail?.current_version?.memory_limit_kb) limits.push(`${detail.current_version.memory_limit_kb} KB`);

  if (blocked) {
    return (
      <Screen>
        <Hero kicker="PHÒNG LÀM BÀI" title="Không hỗ trợ" sub="Khu làm bài dành cho học sinh. Giảng viên và quản trị viên không nộp bài tại đây." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Hero kicker={`PROBLEM #${id} · VERSION #${vid}`} title="Phòng lab code" sub="Đọc đề, chọn ngôn ngữ, viết code rồi chạy thử trước khi nộp." />
      <Card>
        <SectionTitle>Đề bài</SectionTitle>
        {detail?.current_version?.statement
          ? <Muted>{detail.current_version.statement}</Muted>
          : <Muted>Đang tải đề bài…</Muted>}
        {limits.length > 0 ? <LangBadge lang={`Giới hạn: ${limits.join(' · ')}`} /> : null}
      </Card>
      <Card>
        <SectionTitle>Ngôn ngữ ({LANG_LABEL[lang]})</SectionTitle>
        <View style={st.langRow}>
          {LANGS.map((l) => (
            <Chip key={l} label={LANG_LABEL[l]} active={lang === l} color="#ff5c1a" onPress={() => { setLang(l); setCode(STARTER[l]); }} />
          ))}
        </View>
      </Card>
      <Card>
        <SectionTitle>Soạn mã</SectionTitle>
        <AppInput multiline value={code} onChangeText={setCode} style={st.editor} autoCapitalize="none" autoCorrect={false} />
        <Field label="stdin chạy thử">
          <AppInput placeholder="vd. 2 3" value={stdin} onChangeText={setStdin} />
        </Field>
        <View style={st.actions}>
          <View style={st.btn}><GhostButton title="Nháp" onPress={saveDraft} disabled={busy} /></View>
          <View style={st.btn}><PrimaryButton title={busy ? '…' : '▶ Chạy'} onPress={run} disabled={busy} /></View>
        </View>
        <AccentButton title={busy ? 'Đang nộp…' : 'Nộp bài chấm'} onPress={submit} disabled={busy} />
      </Card>
      <Card>
        <SectionTitle>Console</SectionTitle>
        <CodeBlock title="output" code={out || 'Sẵn sàng — chạy thử hoặc nộp bài để xem output.'} />
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  editor: { minHeight: 200, fontFamily: 'monospace', fontSize: 13, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1 },
});


