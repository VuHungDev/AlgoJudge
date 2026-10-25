'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Btn, Card, EmptyState, Field, Guard, Input, Kicker, PageHero, SectionTitle, Table, TextArea } from '@/components/ui';
import { useToast } from '@/components/feedback';
import Link from 'next/link';

const NAV = [
  { href: '/teacher/classes', label: '← Lớp học' },
  { href: '/teacher/manage', label: 'Quản trị lớp →' },
];

interface Clazz { id: number; name: string; members_count?: number; assignments_count?: number }
interface ProgressRow { user_id: number; email: string; display_name?: string | null; subs: number; solved: number; last_submit?: string | null }
interface Problem { id: number; slug: string; title: string; difficulty?: string; total_submissions?: number; solved_count?: number }
interface StudentSub { id: number; status: string; score: number | null; language: string; created_at: string; review_score?: number | null; review_comment?: string | null }

type DrillView = 'classes' | 'progress' | 'problems' | 'student-subs';

export default function TeacherStats() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const [view, setView] = useState<DrillView>('classes');
  const [classes, setClasses] = useState<Clazz[]>([]);
  const [selectedClass, setSelectedClass] = useState<Clazz | null>(null);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ProgressRow | null>(null);
  const [studentSubs, setStudentSubs] = useState<StudentSub[]>([]);
  const [reviewSid, setReviewSid] = useState('');
  const [reviewScore, setReviewScore] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [err, setErr] = useState('');

  const loadClasses = useCallback(async () => {
    try {
      const r = await api<{ classes: Clazz[] }>('/teacher/classes');
      setClasses(r.classes || []);
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const drillClass = async (cls: Clazz) => {
    setErr('');
    try {
      const r = await api<{ rows: ProgressRow[]; problems?: Problem[] }>(`/admin/classes/${cls.id}/progress?per_page=100`);
      setProgressRows(r.rows || []);
      setProblems(r.problems || []);
      setSelectedClass(cls);
      setView('progress');
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  };

  const drillStudent = async (row: ProgressRow) => {
    if (!selectedClass) return;
    setErr('');
    try {
      const r = await api<{ data: StudentSub[] }>(`/admin/submissions?user_id=${row.user_id}&per_page=50`);
      setStudentSubs(r.data || []);
      setSelectedStudent(row);
      setView('student-subs');
    } catch (e: unknown) { setErr(friendlyError(e instanceof Error ? e.message : String(e))); }
  };

  const submitReview = async () => {
    if (!reviewSid.trim()) { toast.warning('Thiếu Submission ID', 'Nhập mã bài nộp cần chấm.'); return; }
    try {
      const body: Record<string, unknown> = { comment: reviewComment };
      if (reviewScore.trim()) body.score = Number(reviewScore);
      await api(`/admin/submissions/${reviewSid.trim()}/review`, { method: 'POST', body: JSON.stringify(body) });
      toast.success('Đã chấm điểm', `Submission #${reviewSid.trim()}${reviewScore.trim() ? ` · ${reviewScore} điểm` : ''}`);
      setReviewComment('');
      if (selectedStudent) drillStudent(selectedStudent);
    } catch (e: unknown) { toast.error('Chấm điểm thất bại', friendlyError(e instanceof Error ? e.message : String(e))); }
  };

  if (loading) return null;
  if (!me || (me.role !== 'teacher' && me.role !== 'admin'))
    return <Guard title="Không có quyền" hint="Chỉ giảng viên mới vào được trang này." />;

  const diffBadge = (d?: string) => {
    if (!d) return null;
    const tone = d === 'easy' ? 'info' : d === 'medium' ? 'warn' : 'bad';
    return <Badge tone={tone}>{d}</Badge>;
  };

  const statusColor = (s: string) => {
    if (s === 'ACCEPTED') return 'text-success';
    if (s === 'PENDING' || s === 'RUNNING') return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHero zone="teach" kicker="Khu giảng viên" title="Thống kê & Chấm điểm"
        desc="Drill-down: chọn lớp → xem tiến độ học sinh → xem bài nộp → chấm tay." glow="accent" />

      <nav className="flex flex-wrap gap-2">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-muted transition hover:border-accent hover:text-accent">{n.label}</Link>
        ))}
      </nav>

      {/* Breadcrumb */}
      {view !== 'classes' && (
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button onClick={() => setView('classes')} className="text-primary hover:underline">Lớp học</button>
          {selectedClass && <>
            <span className="text-muted">/</span>
            <button onClick={() => setView('progress')} className="text-primary hover:underline">{selectedClass.name}</button>
          </>}
          {(view === 'student-subs') && selectedStudent && <>
            <span className="text-muted">/</span>
            <span className="font-bold">{selectedStudent.display_name || selectedStudent.email.split('@')[0]}</span>
          </>}
        </nav>
      )}

      {err && <Card><p className="text-sm text-danger">⚠️ {err}</p></Card>}

      {/* View: classes */}
      {view === 'classes' && (
        <Card>
          <Kicker>Bước 1</Kicker>
          <SectionTitle sub="Bấm vào lớp để xem tiến độ từng học sinh">Chọn lớp học ({classes.length})</SectionTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {classes.map((c) => (
              <button key={c.id} onClick={() => drillClass(c)}
                className="flex flex-col gap-1 rounded-xl border border-border bg-surface-raised p-4 text-left transition hover:border-primary">
                <p className="font-extrabold text-lg">{c.name}</p>
                <p className="text-sm text-muted">👥 {c.members_count ?? 0} thành viên · 📝 {c.assignments_count ?? 0} bài</p>
                <span className="text-sm font-bold text-primary">Xem tiến độ →</span>
              </button>
            ))}
            {classes.length === 0 && <div className="sm:col-span-2"><EmptyState title="Chưa có lớp nào" hint="Liên hệ admin để được tạo lớp." /></div>}
          </div>
        </Card>
      )}

      {/* View: progress (students in class) */}
      {view === 'progress' && (
        <>
          <Card>
            <Kicker>Bước 2 · {selectedClass?.name}</Kicker>
            <SectionTitle sub="Bấm vào học sinh để xem bài nộp chi tiết">Tiến độ học sinh ({progressRows.length})</SectionTitle>
            <Table<ProgressRow>
              columns={[
                { head: 'Học sinh', render: (r) => <span><b>{r.display_name || r.email.split('@')[0]}</b><br /><span className="text-xs text-muted">{r.email}</span></span> },
                { head: 'Nộp', center: true, render: (r) => r.subs },
                { head: 'Đã giải', center: true, render: (r) => <b className="text-primary">{r.solved}</b> },
                { head: 'Nộp cuối', render: (r) => <span className="text-xs text-muted">{r.last_submit || '—'}</span> },
                { head: '', render: (r) => <Btn onClick={() => drillStudent(r)}>Xem bài →</Btn> },
              ]}
              rows={progressRows}
              keyOf={(r) => r.user_id}
              empty="Lớp này chưa có học sinh nào nộp bài."
            />
          </Card>

          {problems.length > 0 && (
            <Card>
              <Kicker>Bài tập trong lớp</Kicker>
              <SectionTitle sub="Danh sách bài được giao cho lớp này">Bài tập ({problems.length})</SectionTitle>
              <Table<Problem>
                columns={[
                  { head: 'Bài tập', render: (p) => <span><b>{p.title}</b><br /><span className="text-xs text-muted font-mono">{p.slug}</span></span> },
                  { head: 'Độ khó', render: (p) => diffBadge(p.difficulty) || <span className="text-muted">—</span> },
                  { head: 'Lượt nộp', center: true, render: (p) => p.total_submissions ?? '—' },
                  { head: 'Đã giải', center: true, render: (p) => <b className="text-primary">{p.solved_count ?? '—'}</b> },
                ]}
                rows={problems}
                keyOf={(p) => p.id}
                empty=""
              />
            </Card>
          )}
        </>
      )}

      {/* View: student submissions + manual grading */}
      {view === 'student-subs' && selectedStudent && (
        <>
          <Card>
            <Kicker>Bước 3 · {selectedStudent.display_name || selectedStudent.email.split('@')[0]}</Kicker>
            <SectionTitle sub="Toàn bộ bài nộp gần đây của học sinh này">
              Bài nộp ({studentSubs.length})
            </SectionTitle>
            <Table<StudentSub>
              columns={[
                { head: '#', render: (s) => <span className="text-xs text-muted font-mono">{s.id}</span> },
                { head: 'Trạng thái', render: (s) => <span className={`text-sm font-bold ${statusColor(s.status)}`}>{s.status}</span> },
                { head: 'Điểm', center: true, render: (s) => s.score != null ? s.score : <span className="text-muted">—</span> },
                { head: 'Ngôn ngữ', render: (s) => <Badge>{s.language}</Badge> },
                { head: 'Thời gian', render: (s) => <span className="text-xs text-muted">{s.created_at}</span> },
                { head: 'Chấm tay', render: (s) => s.review_score != null
                  ? <span className="text-xs text-success font-bold">✅ {s.review_score} điểm</span>
                  : <button onClick={() => { setReviewSid(String(s.id)); setReviewScore(''); setReviewComment(''); }}
                      className="text-xs text-primary underline">Chấm →</button>
                },
              ]}
              rows={studentSubs}
              keyOf={(s) => s.id}
              empty="Học sinh này chưa nộp bài nào."
            />
          </Card>

          <Card>
            <Kicker>Chấm tay</Kicker>
            <SectionTitle sub="Cho điểm thủ công + nhận xét cho submission">Chấm điểm thủ công</SectionTitle>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Submission ID">
                <Input placeholder="vd. 42" value={reviewSid} onChange={(e) => setReviewSid(e.target.value)} />
              </Field>
              <Field label="Điểm (0-100, bỏ trống = không đổi)">
                <Input type="number" placeholder="vd. 85" value={reviewScore} onChange={(e) => setReviewScore(e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Nhận xét">
                  <TextArea placeholder="Bài làm tốt, cần tối ưu thuật toán…" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} />
                </Field>
              </div>
            </div>
            <Btn variant="primary" className="mt-2" onClick={submitReview}>✅ Lưu chấm điểm</Btn>
          </Card>
        </>
      )}
    </div>
  );
}
