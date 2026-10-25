'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, watchSubmission, Problem } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Btn, Card, CodeBlock, ErrorBox, Field, Guard, Kicker, LangBadge, LoadingSkeleton, PageHero, SectionTitle, TextArea, Badge } from '@/components/ui';
import { useToast } from '@/components/feedback';

const Editor = dynamicImport(() => import('@monaco-editor/react'), { ssr: false });

const MONACO_LANG: Record<string, string> = { python: 'python', cpp: 'cpp', js: 'javascript', java: 'java', go: 'go', c: 'c', php: 'php' };
const LANG_LABEL: Record<string, string> = { python: 'Python', cpp: 'C++', js: 'JavaScript', java: 'Java', go: 'Go', c: 'C', php: 'PHP' };

const STARTER: Record<string, string> = {
  python: 'a,b=map(int,input().split());print(a+b)',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){long long a,b;if(!(cin>>a>>b))return 0;cout<<a+b;return 0;}',
  js: 'const fs=require("fs");const[a,b]=fs.readFileSync(0,"utf8").trim().split(/\\s+/).map(Number);console.log(a+b);',
  java: 'import java.util.*;\npublic class Main{\npublic static void main(String[]a){\nScanner s=new Scanner(System.in);\nlong x=s.nextLong(),y=s.nextLong();\nSystem.out.println(x+y);}}',
  go: 'package main\nimport "fmt"\nfunc main(){var a,b int;fmt.Scan(&a,&b);fmt.Println(a+b)}',
  c: '#include <stdio.h>\nint main(){long long a,b;if(scanf("%lld%lld",&a,&b)!=2)return 0;printf("%lld\\n",a+b);return 0;}',
  php: '<?php\n[$a,$b]=array_map("intval",explode(" ",trim(fgets(STDIN))));\necho $a+$b;',
};

export default function SolvePage({ params }: { params: Promise<{ id: string }> }) {
  const [pid, setPid] = useState(0);
  const router = useRouter();
  const { me, loading } = useAuth();
  const toast = useToast();
  const id = pid;
  const [detail, setDetail] = useState<Problem | null>(null);
  const [lang, setLang] = useState('python');
  const [code, setCode] = useState(STARTER.python);
  const [stdin, setStdin] = useState('2 3');
  const [out, setOut] = useState('');
  const [runResult, setRunResult] = useState<{ verdict?: string; stdout?: string; stderr?: string; time_ms?: number; memory_kb?: number } | null>(null);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);

  const loadDetail = useCallback(async () => {
    setErr('');
    try {
      setDetail(await api<Problem>(`/problems/${id}`));
      try {
        const d = await api<{ code?: string }>(`/problems/${id}/draft`);
        if (d.code) setCode(d.code);
      } catch { /* chua co draft */ }
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : String(e)); }
  }, [id]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { params.then((p) => setPid(Number(p.id))); }, [params]);
  useEffect(() => { if (me && id) void loadDetail(); }, [me, id, loadDetail]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!me) return <Guard title="Phòng làm bài" hint="Vui lòng đăng nhập để làm bài." />;
  // Chỉ học sinh làm bài; giáo viên/admin không có nhu cầu giải đề.
  if (me.role !== 'student') {
    return <Guard title="Không hỗ trợ vai trò này" hint="Khu làm bài dành cho học sinh. Giáo viên và quản trị viên không nộp bài." />;
  }

  const pvid = detail?.current_version_id || 0;

  const saveDraft = () =>
    api(`/problems/${id}/draft`, { method: 'PUT', body: JSON.stringify({ language: lang, code }) })
      .then(() => { toast.success('Đã lưu nháp', `${LANG_LABEL[lang]} · bài #${id}`); setOut('Đã lưu nháp ✓'); })
      .catch((e: unknown) => { const m = e instanceof Error ? e.message : String(e); toast.error('Không lưu được nháp', m); setOut(m); });

  const run = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const r = await api<{ verdict?: string; stdout?: string; stderr?: string; time_ms?: number; memory_kb?: number }>(
        '/run', { method: 'POST', body: JSON.stringify({ language: lang, source_code: code, stdin }) },
      );
      setRunResult(r);
      setOut('');
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      toast.error('Chạy thử thất bại', m);
      setOut(m);
    } finally { setRunning(false); }
  };

  const submit = async () => {
    if (!pvid) { toast.warning('Chưa tải được đề', 'Không lấy được phiên bản đề bài để nộp.'); return; }
    setSubmitting(true);
    try {
      const r = await api<{ submission_id: number }>('/submissions', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ problem_version_id: pvid, language: lang, source_code: code }),
      });
      toast.info('Đã nộp bài', `Submission #${r.submission_id} đang chờ chấm…`);
      setOut(`Đã nộp #${r.submission_id} — đang theo dõi qua SSE...`);
      watchSubmission(
        r.submission_id,
        (s) => setOut(s.verdict ? `Kết quả: ${s.verdict}${s.score != null ? ` · ${s.score} điểm` : ''}` : `Trạng thái: ${s.status ?? 'đang chấm'}`),
        () => router.push(`/submissions/${r.submission_id}`),
      );
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      toast.error('Nộp bài thất bại', m);
      setOut(m);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="learn"
        kicker={`Mã bài ${detail?.slug || `#${id}`}`}
        title={detail?.title || 'Phòng làm bài'}
        desc={detail?.current_version?.statement || 'Đang tải đề bài…'}
      />
      {err && <ErrorBox message={err} onRetry={loadDetail} />}
      <Link prefetch={false} className="studio-button studio-secondary w-fit text-sm" href="/">← Về danh sách bài tập</Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><Kicker>Đề bài</Kicker><SectionTitle sub={`Phiên bản đề #${pvid}`}>Nội dung</SectionTitle></div>
          <LangBadge lang={lang} />
        </div>
        <div className="studio-muted mt-3 max-h-48 overflow-auto rounded-xl border border-border bg-surface-raised p-4 text-sm whitespace-pre-wrap">
          {detail?.current_version?.statement || 'Đang tải…'}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="studio-badge">⏱ {detail?.current_version?.time_limit_ms ?? '—'} ms</span>
          <span className="studio-badge">💾 {detail?.current_version?.memory_limit_kb ? `${Math.round(detail.current_version.memory_limit_kb / 1024)} MB` : '—'}</span>
          <span className="studio-badge">📄 source ≤ {detail?.current_version?.source_limit_kb ?? '—'} KB</span>
        </div>
      </Card>

      <Card>
        <Kicker>Bài làm</Kicker>
        <SectionTitle sub="Chọn ngôn ngữ, viết code, chạy thử rồi nộp">Soạn code</SectionTitle>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {Object.keys(LANG_LABEL).map((l) => (
            <button key={l} onClick={() => { setLang(l); setCode(STARTER[l] || ''); }}
              className={`studio-badge cursor-pointer transition ${l === lang ? '!bg-primary !text-white' : 'opacity-70 hover:opacity-100'}`}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <Editor height="340px" theme="vs-light" language={MONACO_LANG[lang]} value={code} onChange={(v) => setCode(v || '')} />
        </div>
        <div className="mt-3"><Field label="Dữ liệu chạy thử (stdin)"><TextArea rows={2} placeholder="2 3" value={stdin} onChange={(e) => setStdin(e.target.value)} /></Field></div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn variant="primary" onClick={run} disabled={running}>{running ? 'Đang chạy…' : 'Chạy thử'}</Btn>
          <Btn variant="accent" onClick={submit} disabled={submitting}>{submitting ? 'Đang nộp…' : 'Nộp bài chấm'}</Btn>
          <Btn variant="ghost" onClick={saveDraft}>Lưu nháp</Btn>
        </div>
      </Card>

      <Card>
        <Kicker>Kết quả</Kicker>
        <SectionTitle sub="Output chạy thử hoặc trạng thái chấm">Bảng điều khiển</SectionTitle>
        {runResult && (
          <div className="mt-3 grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={runResult.verdict === 'ACCEPTED' || runResult.verdict === 'OK' ? 'ok' : runResult.verdict ? 'warn' : 'neutral'} dot>
                {runResult.verdict || 'HOÀN TẤT'}
              </Badge>
              {typeof runResult.time_ms === 'number' && <Badge tone="neutral">⏱ {runResult.time_ms} ms</Badge>}
              {typeof runResult.memory_kb === 'number' && <Badge tone="neutral">💾 {Math.round(runResult.memory_kb / 1024)} MB</Badge>}
            </div>
            {runResult.stdout !== undefined && (
              <CodeBlock title="stdout" code={runResult.stdout || '(không có output)'} lang={lang} />
            )}
            {runResult.stderr && <CodeBlock title="stderr" code={runResult.stderr} lang={lang} />}
          </div>
        )}
        <div className="mt-3"><CodeBlock title="console" code={out || (runResult ? '' : 'Chạy thử hoặc nộp bài để xem kết quả tại đây.')} lang={lang} /></div>
      </Card>
    </div>
  );
}
