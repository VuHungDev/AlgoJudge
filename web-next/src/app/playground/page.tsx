'use client';

import { useState } from 'react';
import dynamicImport from 'next/dynamic';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Btn, Card, CodeBlock, Field, Guard, Kicker, PageHero, SectionTitle, TextArea } from '@/components/ui';
import { useToast } from '@/components/feedback';

const Editor = dynamicImport(() => import('@monaco-editor/react'), { ssr: false });

const LANGS: { key: string; label: string; monacoLang: string; starter: string }[] = [
  {
    key: 'python', label: 'Python', monacoLang: 'python',
    starter: '# Viết code Python của bạn tại đây\n# Đọc input: input()\n# In output: print()\n\n',
  },
  {
    key: 'cpp', label: 'C++', monacoLang: 'cpp',
    starter: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    // Viết code C++ của bạn tại đây\n    \n    return 0;\n}\n',
  },
  {
    key: 'java', label: 'Java', monacoLang: 'java',
    starter: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // Viết code Java của bạn tại đây\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n',
  },
  {
    key: 'js', label: 'JavaScript', monacoLang: 'javascript',
    starter: 'const readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on("line", l => lines.push(l));\nrl.on("close", () => {\n    // Viết code JS của bạn tại đây\n    \n});\n',
  },
  {
    key: 'go', label: 'Go', monacoLang: 'go',
    starter: 'package main\nimport "fmt"\nfunc main() {\n    // Viết code Go của bạn tại đây\n    \n}\n',
  },
  {
    key: 'c', label: 'C', monacoLang: 'c',
    starter: '#include <stdio.h>\nint main() {\n    // Viết code C của bạn tại đây\n    \n    return 0;\n}\n',
  },
  {
    key: 'php', label: 'PHP', monacoLang: 'php',
    starter: "<?php\n// Viết code PHP của bạn tại đây\n// Đọc input: fgets(STDIN)\n// In output: echo\n\n",
  },
];

export default function PlaygroundPage() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const [langKey, setLangKey] = useState('python');
  const [code, setCode] = useState(LANGS[0].starter);
  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState<{ verdict?: string; stdout?: string; stderr?: string; time_ms?: number; memory_kb?: number } | null>(null);
  const [running, setRunning] = useState(false);

  const lang = LANGS.find((l) => l.key === langKey) ?? LANGS[0];

  const switchLang = (key: string) => {
    setLangKey(key);
    const l = LANGS.find((x) => x.key === key);
    if (l) setCode(l.starter);
    setResult(null);
  };

  const run = async () => {
    if (!code.trim()) { toast.warning('Code trống', 'Hãy viết code trước khi chạy.'); return; }
    setRunning(true); setResult(null);
    try {
      const r = await api<{ verdict?: string; stdout?: string; stderr?: string; time_ms?: number; memory_kb?: number }>(
        '/run', { method: 'POST', body: JSON.stringify({ language: langKey, source_code: code, stdin }) }
      );
      setResult(r);
      if (r.verdict && r.verdict !== 'OK') toast.warning('Kết quả', r.verdict);
      else toast.success('Đã chạy', 'Xem kết quả bên dưới.');
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      toast.error('Chạy thất bại', m);
    } finally { setRunning(false); }
  };

  if (loading) return null;
  if (!me) return <Guard title="Sân tập lập trình" hint="Đăng nhập để dùng sân tập." />;
  // Playground cho student + teacher (admin không cần)
  if (me.role === 'admin') return <Guard title="Không dành cho admin" hint="Sân tập lập trình dành cho học sinh và giảng viên." />;

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="learn"
        kicker="SÂN TẬP"
        title="Luyện tập tự do"
        desc="Chọn ngôn ngữ, viết code theo ý bạn, nhập stdin và chạy thử — không cần làm theo bài tập nào."
      />

      {/* Chọn ngôn ngữ */}
      <div className="flex flex-wrap gap-2">
        {LANGS.map((l) => (
          <button
            key={l.key}
            onClick={() => switchLang(l.key)}
            className={`flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-bold transition ${
              langKey === l.key
                ? 'border-primary bg-primary text-white shadow-md'
                : 'border-border bg-surface-raised text-muted hover:border-primary/50 hover:text-primary'
            }`}
          >
            <span>{l.label}</span>
            {langKey === l.key && <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs">đang dùng</span>}
          </button>
        ))}
      </div>

      {/* Editor */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Kicker>{lang.label.toUpperCase()}</Kicker>
            <SectionTitle sub="Viết code theo ý bạn — không giới hạn nội dung">Soạn code</SectionTitle>
          </div>
          <Badge tone="info">{lang.label}</Badge>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <Editor
            height="400px"
            theme="vs-light"
            language={lang.monacoLang}
            value={code}
            onChange={(v) => setCode(v || '')}
            options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on' }}
          />
        </div>
      </Card>

      {/* Stdin + Run */}
      <Card>
        <Kicker>Dữ liệu đầu vào</Kicker>
        <SectionTitle sub="Nhập stdin để kiểm tra code của bạn">Input (tùy chọn)</SectionTitle>
        <div className="mt-3">
          <TextArea
            rows={4}
            placeholder="Nhập dữ liệu đầu vào (stdin) tại đây, hoặc để trống nếu không cần..."
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Btn variant="primary" onClick={run} disabled={running} className="min-w-32">
            {running ? '⏳ Đang chạy…' : '▶ Chạy code'}
          </Btn>
          <Btn variant="ghost" onClick={() => { setCode(lang.starter); setResult(null); setStdin(''); }}>
            Đặt lại
          </Btn>
        </div>
      </Card>

      {/* Kết quả */}
      {result && (
        <Card>
          <Kicker>Kết quả</Kicker>
          <SectionTitle sub="Output từ code của bạn">Output</SectionTitle>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {result.verdict && (
              <Badge tone={result.verdict === 'OK' || result.verdict === 'ACCEPTED' ? 'ok' : 'warn'}>
                {result.verdict}
              </Badge>
            )}
            {typeof result.time_ms === 'number' && <Badge tone="neutral">⏱ {result.time_ms} ms</Badge>}
            {typeof result.memory_kb === 'number' && <Badge tone="neutral">💾 {Math.round(result.memory_kb / 1024)} MB</Badge>}
          </div>
          {result.stdout !== undefined && (
            <div className="mt-3">
              <CodeBlock title="stdout" code={result.stdout || '(không có output)'} lang={langKey} />
            </div>
          )}
          {result.stderr && (
            <div className="mt-3">
              <CodeBlock title="stderr / lỗi" code={result.stderr} lang={langKey} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
