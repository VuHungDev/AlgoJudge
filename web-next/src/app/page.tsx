'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api, watchSubmission, Problem, SubmissionResult } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const MONACO_LANG: Record<string, string> = { python: 'python', cpp: 'cpp', js: 'javascript' };

export default function Home() {
  const { me, login, register, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [pid, setPid] = useState(1);
  const [pvid, setPvid] = useState(1);
  const [detail, setDetail] = useState<Problem | null>(null);
  const [lang, setLang] = useState('python');
  const [code, setCode] = useState('a,b=map(int,input().split());print(a+b)');
  const [stdin, setStdin] = useState('');
  const [out, setOut] = useState('');
  const [hist, setHist] = useState<SubmissionResult[]>([]);

  const load = async () => {
    const p = await api<{ problems: Problem[] }>('/problems');
    setProblems(p.problems || []);
    const h = await api<{ submissions: SubmissionResult[] }>('/me/submissions');
    setHist(h.submissions || []);
  };

  useEffect(() => {
    if (me) load();
  }, [me]);

  const pick = async (id: number, vid: number) => {
    setPid(id);
    setPvid(vid);
    setDetail(await api<Problem>(`/problems/${id}`));
    try {
      const d = await api<{ code?: string }>(`/problems/${id}/draft`);
      if (d.code) setCode(d.code);
    } catch {}
  };

  const saveDraft = () =>
    api(`/problems/${pid}/draft`, {
      method: 'PUT',
      body: JSON.stringify({ language: lang, code }),
    }).then(() => setOut('Đã lưu nháp'));

  const run = async () => {
    const r = await api('/run', {
      method: 'POST',
      body: JSON.stringify({ language: lang, source_code: code, stdin }),
    });
    setOut(JSON.stringify(r, null, 2));
  };

  const submit = async () => {
    const r = await api<{ submission_id: number }>('/submissions', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ problem_version_id: pvid, language: lang, source_code: code }),
    });
    setOut(`Đã nộp #${r.submission_id} — đang theo dõi qua SSE...`);
    watchSubmission(
      r.submission_id,
      (s) => setOut('Trạng thái: ' + JSON.stringify(s)),
      async () => {
        setOut(JSON.stringify(await api(`/submissions/${r.submission_id}`), null, 2));
        load();
      },
    );
  };

  if (!me)
    return (
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Đăng nhập</h3>
        <div className="flex gap-2">
          <input className="border p-1" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="border p-1" type="password" placeholder="mật khẩu" value={pass} onChange={(e) => setPass(e.target.value)} />
          <button className="bg-blue-600 text-white px-3 rounded" onClick={() => login(email, pass)}>Đăng nhập</button>
          <button className="border px-3 rounded" onClick={() => register(email, pass)}>Đăng ký</button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded p-4 flex justify-between">
        <span>{me.email} ({me.role})</span>
        <button className="text-sm underline" onClick={logout}>Đăng xuất</button>
      </div>
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Bài tập</h3>
        {problems.map((x) => (
          <div key={x.id} className="flex gap-2 items-center py-1">
            <b>#{x.id} {x.title}</b>
            <span className="text-xs text-slate-500">[{x.topic}/{x.difficulty}]</span>
            <button className="text-blue-600 text-sm underline" onClick={() => pick(x.id, x.current_version_id)}>Chọn</button>
          </div>
        ))}
      </div>
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Soạn mã — bài #{pid}</h3>
        {detail?.current_version && (
          <p className="text-sm mb-2 whitespace-pre-wrap">{detail.current_version.statement}</p>
        )}
        <select className="border p-1 mb-2" value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="js">JavaScript</option>
        </select>
        <Editor height="240px" language={MONACO_LANG[lang]} value={code} onChange={(v) => setCode(v || '')} />
        <textarea className="border w-full mt-2 p-1" rows={2} placeholder="stdin chạy thử" value={stdin} onChange={(e) => setStdin(e.target.value)} />
        <div className="flex gap-2 mt-2">
          <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={run}>Chạy thử</button>
          <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={submit}>Nộp bài</button>
          <button className="border px-3 py-1 rounded" onClick={saveDraft}>Lưu nháp</button>
        </div>
        <pre className="mt-2 text-sm whitespace-pre-wrap">{out}</pre>
      </div>
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Lịch sử</h3>
        {hist.map((s: unknown, i: number) => {
          const r = s as SubmissionResult & { id: number; language: string };
          return <div key={i}>#{r.id} {r.language} <b>{r.verdict || '...'}</b> {r.score}</div>;
        })}
      </div>
    </div>
  );
}
