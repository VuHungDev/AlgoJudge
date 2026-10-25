'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Btn, Card, EmptyState, Field, Guard, Input, Kicker, PageHero, SectionTitle, Select, TextArea, Table, Badge } from '@/components/ui';
import { useToast, ResultPanel } from '@/components/feedback';

const NAV = [
  { href: '/teacher/problems', label: '← Đề thi' },
  { href: '/teacher/contests', label: 'Kỳ thi →' },
];

export default function TeacherGrading() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const [assignPid, setAssignPid] = useState('');
  const [assignTarget, setAssignTarget] = useState<'class' | 'user'>('class');
  const [assignCid, setAssignCid] = useState('');
  const [assignEmail, setAssignEmail] = useState('');
  const [assignDue, setAssignDue] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  const [rejudgeSid, setRejudgeSid] = useState('');
  const [rejudgeBusy, setRejudgeBusy] = useState(false);
  const [compareSid, setCompareSid] = useState('');
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [simA, setSimA] = useState('');
  const [simB, setSimB] = useState('');
  const [compareResult, setCompareResult] = useState<Record<string, unknown> | null>(null);
  const [compareError, setCompareError] = useState('');
  const [compareBusy, setCompareBusy] = useState(false);
  const [reviewSid, setReviewSid] = useState('');
  const [reviewScore, setReviewScore] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  if (loading) return null;
  if (!me || (me.role !== 'teacher' && me.role !== 'admin')) return <Guard title="Không có quyền" hint="Chỉ giảng viên mới vào được trang này." />;

  const err = (e: unknown) => friendlyError(e instanceof Error ? e.message : String(e));

  const doAssign = async () => {
    if (!assignPid.trim()) { toast.warning('Thiếu problem_id', 'Nhập mã bài tập cần giao.'); return; }
    setAssignBusy(true);
    try {
      const body: Record<string, unknown> = { problem_id: Number(assignPid) };
      if (assignTarget === 'class') {
        if (!assignCid.trim()) { toast.warning('Thiếu class_id', 'Nhập mã lớp cần giao bài.'); return; }
        body.class_id = Number(assignCid);
      } else {
        if (!assignEmail.trim()) { toast.warning('Thiếu email', 'Nhập email học sinh cần giao bài.'); return; }
        const u = await api<{ id: number }>(`/users/lookup?email=${encodeURIComponent(assignEmail.trim())}`);
        body.user_id = u.id;
      }
      if (assignDue) body.due_at = new Date(assignDue).toISOString().slice(0, 19).replace('T', ' ');
      if (assignNote.trim()) body.note = assignNote.trim();
      await api('/admin/assignments', { method: 'POST', body: JSON.stringify(body) });
      toast.success('Đã giao bài', `Bài #${assignPid} → ${assignTarget === 'class' ? `lớp #${assignCid}` : assignEmail.trim()}`);
      setAssignNote('');
    } catch (e: unknown) { toast.error('Giao bài thất bại', err(e)); }
    finally { setAssignBusy(false); }
  };

  const rejudge = async () => {
    if (!rejudgeSid.trim()) { toast.warning('Thiếu submission_id'); return; }
    setRejudgeBusy(true);
    try {
      await api(`/admin/submissions/${rejudgeSid}/rejudge`, { method: 'POST' });
      toast.success('Đã đưa vào hàng đợi chấm lại', `Submission #${rejudgeSid}`);
    } catch (e: unknown) { toast.error('Rejudge thất bại', err(e)); }
    finally { setRejudgeBusy(false); }
  };

  const compare = async () => {
    if (!compareSid.trim() || !compareA.trim() || !compareB.trim()) { toast.warning('Thiếu thông tin', 'Cần submission_id và hai run_id.'); return; }
    setCompareBusy(true); setCompareError(''); setCompareResult(null);
    try {
      const r = await api<Record<string, unknown>>(`/admin/submissions/${compareSid}/compare?a=${compareA}&b=${compareB}`);
      setCompareResult(r);
    } catch (e: unknown) { setCompareError(err(e)); }
    finally { setCompareBusy(false); }
  };

  const similarity = async () => {
    if (!simA.trim() || !simB.trim()) { toast.warning('Thiếu submission_id', 'Cần hai mã bài nộp để so sánh.'); return; }
    setCompareBusy(true); setCompareError(''); setCompareResult(null);
    try {
      const r = await api<Record<string, unknown>>(`/admin/submissions/${simA}/similarity/${simB}`);
      setCompareResult(r);
    } catch (e: unknown) { setCompareError(err(e)); }
    finally { setCompareBusy(false); }
  };

  const review = async () => {
    if (!reviewSid.trim()) { toast.warning('Thiếu submission_id'); return; }
    setReviewBusy(true);
    try {
      await api(`/admin/submissions/${reviewSid}/review`, {
        method: 'POST',
        body: JSON.stringify({ score: reviewScore.trim() === '' ? null : Number(reviewScore), comment: reviewComment }),
      });
      toast.success('Đã lưu điểm', `Submission #${reviewSid}${reviewScore.trim() ? ` · ${reviewScore} điểm` : ''}`);
      setReviewComment('');
    } catch (e: unknown) { toast.error('Chấm điểm thất bại', err(e)); }
    finally { setReviewBusy(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHero zone="teach" kicker="Khu giảng viên" title="Giao bài & Chấm điểm" desc="Giao bài cho lớp/cá nhân, rejudge, so sánh, kiểm tra đạo văn và chấm tay." glow="accent" />

      <nav className="flex flex-wrap gap-2">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-muted transition hover:border-accent hover:text-accent">{n.label}</Link>
        ))}
      </nav>

      <Card>
        <Kicker>Giao bài</Kicker>
        <SectionTitle sub="Giao cho cả lớp hoặc cá nhân theo email">Giao bài tập</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Problem ID"><Input placeholder="vd. 3" value={assignPid} onChange={(e) => setAssignPid(e.target.value)} /></Field>
          <Field label="Đối tượng">
            <Select value={assignTarget} onChange={(e) => setAssignTarget(e.target.value as 'class' | 'user')}>
              <option value="class">Cả lớp (class_id)</option>
              <option value="user">Cá nhân (email)</option>
            </Select>
          </Field>
          {assignTarget === 'class'
            ? <Field label="Class ID"><Input placeholder="vd. 2" value={assignCid} onChange={(e) => setAssignCid(e.target.value)} /></Field>
            : <Field label="Email học sinh"><Input placeholder="hs@oj.local" value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} /></Field>
          }
          <Field label="Hạn nộp (tùy chọn)"><Input type="datetime-local" value={assignDue} onChange={(e) => setAssignDue(e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Ghi chú (tùy chọn)"><Input placeholder="Làm bài tuần này" value={assignNote} onChange={(e) => setAssignNote(e.target.value)} /></Field></div>
        </div>
        <Btn variant="primary" className="mt-3" loading={assignBusy} onClick={doAssign}>📮 Giao bài</Btn>
      </Card>

      <Card>
        <Kicker>Rejudge</Kicker>
        <SectionTitle sub="Chạy lại chấm bài cho một submission">Rejudge submission</SectionTitle>
        <div className="mt-4 flex gap-2">
          <Field label="Submission ID"><Input placeholder="vd. 42" value={rejudgeSid} onChange={(e) => setRejudgeSid(e.target.value)} className="!w-32" /></Field>
          <div className="flex items-end"><Btn variant="primary" loading={rejudgeBusy} onClick={rejudge}>🔄 Rejudge</Btn></div>
        </div>
      </Card>

      <Card>
        <Kicker>So sánh & Đạo văn</Kicker>
        <SectionTitle sub="So sánh 2 run hoặc kiểm tra tương đồng giữa 2 submission">Phân tích submission</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Submission ID (so sánh run)"><Input placeholder="vd. 10" value={compareSid} onChange={(e) => setCompareSid(e.target.value)} /></Field>
          <Field label="Run A"><Input placeholder="vd. 1" value={compareA} onChange={(e) => setCompareA(e.target.value)} /></Field>
          <Field label="Run B"><Input placeholder="vd. 2" value={compareB} onChange={(e) => setCompareB(e.target.value)} /></Field>
        </div>
        <Btn className="mt-2" loading={compareBusy} onClick={compare}>🔍 So sánh 2 run</Btn>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Submission A (đạo văn)"><Input placeholder="vd. 5" value={simA} onChange={(e) => setSimA(e.target.value)} /></Field>
          <Field label="Submission B (đạo văn)"><Input placeholder="vd. 7" value={simB} onChange={(e) => setSimB(e.target.value)} /></Field>
        </div>
        <Btn className="mt-2" loading={compareBusy} onClick={similarity}>🕵️ Kiểm tra tương đồng</Btn>
        {compareError && <ResultPanel title="Không phân tích được" data={compareError} tone="error" />}
        {compareResult && <ResultPanel title="Kết quả phân tích" data={compareResult} tone="info" />}
      </Card>

      <Card>
        <Kicker>Chấm tay</Kicker>
        <SectionTitle sub="Cho điểm thủ công + nhận xét cho submission">Chấm điểm thủ công</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Submission ID"><Input placeholder="vd. 42" value={reviewSid} onChange={(e) => setReviewSid(e.target.value)} /></Field>
          <Field label="Điểm (0-100, bỏ trống = không đổi)"><Input type="number" placeholder="vd. 85" value={reviewScore} onChange={(e) => setReviewScore(e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Nhận xét"><TextArea placeholder="Bài làm tốt, cần tối ưu thuật toán…" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} /></Field></div>
        </div>
        <Btn variant="primary" className="mt-2" loading={reviewBusy} onClick={review}>✅ Lưu chấm điểm</Btn>
      </Card>
    </div>
  );
}
