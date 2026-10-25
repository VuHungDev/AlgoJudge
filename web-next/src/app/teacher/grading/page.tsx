'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Btn, Card, CodeBlock, EmptyState, Field, Guard, Input, Kicker, PageHero, Pagination, SectionTitle, Select, TextArea, Table, VerdictBadge, type PageMeta } from '@/components/ui';
import { useToast, ResultPanel } from '@/components/feedback';

interface Clazz { id: number; name: string; members_count?: number }
interface Sub {
  id: number; language: string; created_at: string; user_id: number; email: string; display_name?: string | null;
  problem_id: number; problem_title?: string | null; status?: string | null; verdict?: string | null; score?: number | null;
  review_score?: number | null; review_comment?: string | null;
}

const errMsg = (e: unknown) => friendlyError(e instanceof Error ? e.message : String(e));

export default function TeacherGrading() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const [classes, setClasses] = useState<Clazz[]>([]);
  const [cid, setCid] = useState('');
  const [onlyUngraded, setOnlyUngraded] = useState(false);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [sel, setSel] = useState<Sub | null>(null);
  const [code, setCode] = useState('');
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  // Giao bai
  const [aPid, setAPid] = useState('');
  const [aDue, setADue] = useState('');
  const [aNote, setANote] = useState('');
  // Dao van
  const [simA, setSimA] = useState('');
  const [simB, setSimB] = useState('');
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!me) return;
    api<{ classes: Clazz[] }>('/teacher/classes').then((r) => {
      const list = r.classes || [];
      setClasses(list);
      // Cho phep mo thang tu trang chi tiet lop: /teacher/grading?class=ID
      const q = new URLSearchParams(window.location.search).get('class');
      if (q && list.some((c) => String(c.id) === q)) setCid(q);
      else if (list.length === 1) setCid(String(list[0].id));
    }).catch((e: unknown) => toast.error('Không tải được lớp', errMsg(e)));
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSubs = useCallback(async (page = 1) => {
    if (!cid) { setSubs([]); setMeta(null); return; }
    try {
      const qs = new URLSearchParams({ page: String(page), per_page: '15' });
      if (onlyUngraded) qs.set('ungraded', '1');
      const r = await api<{ submissions: Sub[]; meta: PageMeta }>(`/teacher/classes/${cid}/submissions?${qs}`);
      setSubs(r.submissions || []); setMeta(r.meta || null);
    } catch (e: unknown) { toast.error('Không tải được bài nộp', errMsg(e)); }
  }, [cid, onlyUngraded]); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSel(null); void loadSubs(1); }, [loadSubs]);

  if (loading) return null;
  if (!me || (me.role !== 'teacher' && me.role !== 'admin')) return <Guard title="Không có quyền" hint="Chỉ giảng viên mới vào được trang này." />;

  const open = async (s: Sub) => {
    setSel(s); setScore(s.review_score != null ? String(s.review_score) : ''); setComment(s.review_comment || ''); setCode('Đang tải mã nguồn…');
    try {
      const c = await api<{ source_code?: string }>(`/submissions/${s.id}/code`);
      setCode(c.source_code || '(trống)');
    } catch (e: unknown) { setCode(`Không tải được mã: ${errMsg(e)}`); }
  };

  const saveReview = async () => {
    if (!sel) return;
    if (score.trim() !== '' && (Number(score) < 0 || Number(score) > 100)) { toast.warning('Điểm không hợp lệ', 'Điểm phải từ 0 đến 100.'); return; }
    setBusy(true);
    try {
      await api(`/admin/submissions/${sel.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ score: score.trim() === '' ? null : Number(score), comment: comment.trim() || null }),
      });
      toast.success('Đã lưu chấm điểm', `Bài nộp #${sel.id} · ${sel.display_name || sel.email}`);
      await loadSubs(meta?.page || 1);
      setSel(null);
    } catch (e: unknown) { toast.error('Chấm điểm thất bại', errMsg(e)); }
    finally { setBusy(false); }
  };

  const rejudge = async () => {
    if (!sel) return;
    try {
      await api(`/admin/submissions/${sel.id}/rejudge`, { method: 'POST' });
      toast.success('Đã đưa vào hàng đợi chấm lại', `Bài nộp #${sel.id}`);
    } catch (e: unknown) { toast.error('Chấm lại thất bại', errMsg(e)); }
  };

  const assign = async () => {
    if (!cid) { toast.warning('Chưa chọn lớp'); return; }
    if (!aPid.trim()) { toast.warning('Thiếu mã bài', 'Nhập problem_id cần giao.'); return; }
    try {
      const body: Record<string, unknown> = { problem_id: Number(aPid), class_id: Number(cid) };
      if (aDue) body.due_at = new Date(aDue).toISOString().slice(0, 19).replace('T', ' ');
      if (aNote.trim()) body.note = aNote.trim();
      await api('/admin/assignments', { method: 'POST', body: JSON.stringify(body) });
      toast.success('Đã giao bài', `Bài #${aPid} → lớp #${cid}`);
      setAPid(''); setANote('');
    } catch (e: unknown) { toast.error('Giao bài thất bại', errMsg(e)); }
  };

  const similarity = async () => {
    if (!simA.trim() || !simB.trim()) { toast.warning('Thiếu mã bài nộp', 'Cần hai mã bài nộp để so sánh.'); return; }
    try { setSimResult(await api<Record<string, unknown>>(`/admin/submissions/${simA}/similarity/${simB}`)); }
    catch (e: unknown) { toast.error('Không so sánh được', errMsg(e)); }
  };

  const cls = classes.find((c) => String(c.id) === cid);

  return (
    <div className="flex flex-col gap-5">
      <PageHero zone="teach" kicker="Khu giảng viên" title="Chấm bài & nhận xét" desc="Chọn lớp bạn phụ trách → chọn bài nộp của học sinh → xem mã, cho điểm và nhận xét." glow="accent" />

      <Card>
        <Kicker>Bước 1</Kicker>
        <SectionTitle sub="Chỉ hiện các lớp bạn đang được phân công">Chọn lớp</SectionTitle>
        {classes.length === 0 ? (
          <div className="mt-3"><EmptyState title="Bạn chưa phụ trách lớp nào" hint="Tạo lớp ở mục Quản lý lớp hoặc nhờ admin phân công." /></div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Lớp">
              <Select value={cid} onChange={(e) => setCid(e.target.value)}>
                <option value="">— Chọn lớp —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.members_count ?? 0} thành viên)</option>)}
              </Select>
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
              <input type="checkbox" checked={onlyUngraded} onChange={(e) => setOnlyUngraded(e.target.checked)} />
              Chỉ hiện bài chưa chấm
            </label>
          </div>
        )}
      </Card>

      {cid && (
        <Card>
          <Kicker>Bước 2</Kicker>
          <SectionTitle sub={`Bài nộp của học sinh lớp ${cls?.name ?? `#${cid}`}`}>Danh sách bài nộp ({meta?.total ?? subs.length})</SectionTitle>
          <Table<Sub>
            columns={[
              { head: '#', render: (s) => <b className="text-muted">#{s.id}</b> },
              { head: 'Học sinh', render: (s) => <span><b>{s.display_name || s.email.split('@')[0]}</b><br /><span className="text-xs text-muted">{s.email}</span></span> },
              { head: 'Bài', render: (s) => <span className="text-sm">{s.problem_title || `#${s.problem_id}`}<br /><span className="text-xs text-muted">{s.language} · {s.created_at}</span></span> },
              { head: 'Kết quả chấm tự động', center: true, render: (s) => <span className="flex flex-col items-center gap-1"><VerdictBadge verdict={s.verdict} /><span className="text-xs text-muted">{s.score ?? 0} điểm</span></span> },
              { head: 'Điểm GV', center: true, render: (s) => s.review_score != null ? <Badge tone="ok">{s.review_score}/100</Badge> : s.review_comment ? <Badge tone="info">Đã nhận xét</Badge> : <Badge tone="warn">Chưa chấm</Badge> },
              { head: '', center: true, render: (s) => <Btn variant={sel?.id === s.id ? 'primary' : 'secondary'} className="!px-3 !py-1 text-xs" onClick={() => open(s)}>Chấm</Btn> },
            ]}
            rows={subs}
            keyOf={(s) => s.id}
            empty={onlyUngraded ? 'Không còn bài nào chưa chấm.' : 'Học sinh lớp này chưa nộp bài nào.'}
          />
          <Pagination meta={meta} onPage={loadSubs} />
        </Card>
      )}

      {sel && (
        <Card>
          <Kicker>Bước 3</Kicker>
          <SectionTitle sub={`${sel.display_name || sel.email} · ${sel.problem_title || `bài #${sel.problem_id}`} · ${sel.language}`}>Chấm bài nộp #{sel.id}</SectionTitle>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <VerdictBadge verdict={sel.verdict} />
            <Badge tone="neutral">Điểm tự động: {sel.score ?? 0}</Badge>
          </div>
          <div className="mt-3"><CodeBlock title={`Mã nguồn #${sel.id}`} code={code} lang={sel.language} /></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Điểm GV (0-100, bỏ trống = chỉ nhận xét)"><Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="vd. 85" /></Field>
            <div className="sm:col-span-2"><Field label="Nhận xét cho học sinh"><TextArea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Bài làm tốt, cần xử lý trường hợp biên…" /></Field></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn variant="primary" loading={busy} onClick={saveReview}>Lưu điểm & nhận xét</Btn>
            <Btn onClick={rejudge}>Chấm lại tự động</Btn>
            <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          </div>
        </Card>
      )}

      {cid && (
        <Card>
          <Kicker>Giao bài</Kicker>
          <SectionTitle sub={`Giao bài cho cả lớp ${cls?.name ?? ''}`}>Giao bài tập cho lớp</SectionTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Mã bài (problem_id)"><Input value={aPid} onChange={(e) => setAPid(e.target.value)} placeholder="vd. 3" /></Field>
            <Field label="Hạn nộp (tùy chọn)"><Input type="datetime-local" value={aDue} onChange={(e) => setADue(e.target.value)} /></Field>
            <Field label="Ghi chú"><Input value={aNote} onChange={(e) => setANote(e.target.value)} placeholder="Làm trong tuần" /></Field>
          </div>
          <Btn variant="primary" className="mt-3" onClick={assign}>Giao bài</Btn>
        </Card>
      )}

      <Card>
        <Kicker>Đạo văn</Kicker>
        <SectionTitle sub="So sánh độ tương đồng mã nguồn giữa 2 bài nộp">Kiểm tra tương đồng</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Bài nộp A"><Input value={simA} onChange={(e) => setSimA(e.target.value)} placeholder="vd. 5" /></Field>
          <Field label="Bài nộp B"><Input value={simB} onChange={(e) => setSimB(e.target.value)} placeholder="vd. 7" /></Field>
        </div>
        <Btn className="mt-2" onClick={similarity}>Kiểm tra</Btn>
        {simResult && <ResultPanel title="Kết quả" data={simResult} tone="info" />}
      </Card>
    </div>
  );
}
