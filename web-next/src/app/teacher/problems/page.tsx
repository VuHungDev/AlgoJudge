'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Btn, Card, EmptyState, Field, Guard, Input, Kicker, PageHero, SectionTitle, Select, TextArea } from '@/components/ui';
import { useToast } from '@/components/feedback';

const TEACHER_NAV = [
  { href: '/teacher', label: '← Tổng quan' },
  { href: '/teacher/grading', label: 'Giao bài & chấm →' },
];

export default function TeacherProblems() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ slug: '', title: '', topic: '', difficulty: 'easy', statement: '', input_spec: '', output_spec: '' });
  const [limits, setLimits] = useState({ time: '2000', mem: '262144', src: '100' });
  const [pid, setPid] = useState('');
  const [cases, setCases] = useState('[{"input":"2 3","expected":"5","is_public":1,"group":"co-ban","weight":1}]');
  const [checker, setChecker] = useState('exact');
  const [busy, setBusy] = useState<'' | 'create' | 'update' | 'testset'>('');

  if (loading) return null;
  if (!me || (me.role !== 'teacher' && me.role !== 'admin')) return <Guard title="Không có quyền" hint="Chỉ giảng viên mới vào được trang này." />;

  const createProblem = async () => {
    if (!form.slug.trim() || !form.title.trim()) { toast.warning('Thiếu thông tin', 'Cần slug và tiêu đề bài.'); return; }
    setBusy('create');
    try {
      const body: Record<string, unknown> = { ...form, time_limit_ms: Number(limits.time), memory_limit_kb: Number(limits.mem), source_limit_kb: Number(limits.src) };
      const r = await api<{ problem_id: number; version_id: number }>('/admin/problems', { method: 'POST', body: JSON.stringify(body) });
      toast.success('Đã tạo bài tập', `problem_id ${r.problem_id} · version_id ${r.version_id}`);
      setPid(String(r.problem_id));
    } catch (e: unknown) { toast.error('Tạo bài thất bại', friendlyError(e instanceof Error ? e.message : String(e))); }
    finally { setBusy(''); }
  };

  const updateProblem = async () => {
    if (!pid.trim()) { toast.warning('Thiếu problem_id', 'Nhập mã bài cần cập nhật.'); return; }
    setBusy('update');
    try {
      const body: Record<string, unknown> = {};
      if (form.title.trim()) body.title = form.title.trim();
      if (form.topic.trim()) body.topic = form.topic.trim();
      if (form.difficulty) body.difficulty = form.difficulty;
      if (form.statement.trim()) body.statement = form.statement.trim();
      if (form.input_spec.trim()) body.input_spec = form.input_spec.trim();
      if (form.output_spec.trim()) body.output_spec = form.output_spec.trim();
      body.time_limit_ms = Number(limits.time);
      body.memory_limit_kb = Number(limits.mem);
      body.source_limit_kb = Number(limits.src);
      await api(`/admin/problems/${pid}`, { method: 'PUT', body: JSON.stringify(body) });
      toast.success('Đã cập nhật bài', `#${pid}`);
    } catch (e: unknown) { toast.error('Cập nhật thất bại', friendlyError(e instanceof Error ? e.message : String(e))); }
    finally { setBusy(''); }
  };

  const addTestset = async () => {
    if (!pid.trim()) { toast.warning('Thiếu problem_id', 'Nhập mã bài trước khi thêm testset.'); return; }
    setBusy('testset');
    try {
      const parsed = JSON.parse(cases);
      if (!Array.isArray(parsed) || parsed.length < 5) { toast.warning('Chưa đủ số ca', 'Testset cần tối thiểu 5 ca chấm.'); return; }
      await api(`/admin/problems/${pid}/testsets`, { method: 'POST', body: JSON.stringify({ cases: parsed, checker }) });
      toast.success('Đã thêm testset', `Bài #${pid} · ${parsed.length} ca · checker ${checker}`);
    } catch (e: unknown) {
      const msg = e instanceof SyntaxError ? 'JSON các ca chấm không hợp lệ — kiểm tra dấu ngoặc và dấu phẩy.' : friendlyError(e instanceof Error ? e.message : String(e));
      toast.error('Thêm testset thất bại', msg);
    } finally { setBusy(''); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHero zone="teach" kicker="Khu giảng viên" title="Đề thi & Testset" desc="Tạo bài tập mới, cập nhật đề, thêm testset ≥5 ca." glow="accent" />

      <nav className="flex flex-wrap gap-2">
        {TEACHER_NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-muted transition hover:border-accent hover:text-accent">{n.label}</Link>
        ))}
      </nav>

      <Card>
        <Kicker>Tạo bài mới</Kicker>
        <SectionTitle sub="Điền đầy đủ thông tin rồi bấm Tạo bài">Thông tin bài tập</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Slug (mã bài, không dấu)"><Input placeholder="two-sum" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Tiêu đề"><Input placeholder="Tổng hai số" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Chủ đề"><Input placeholder="Array, DP, Graph…" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></Field>
          <Field label="Độ khó">
            <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </Select>
          </Field>
          <div className="sm:col-span-2"><Field label="Đề bài"><TextArea placeholder="Mô tả bài toán…" value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} rows={4} /></Field></div>
          <Field label="Input spec"><TextArea placeholder="Định dạng input…" value={form.input_spec} onChange={(e) => setForm({ ...form, input_spec: e.target.value })} rows={2} /></Field>
          <Field label="Output spec"><TextArea placeholder="Định dạng output…" value={form.output_spec} onChange={(e) => setForm({ ...form, output_spec: e.target.value })} rows={2} /></Field>
          <Field label="Time limit (ms)"><Input type="number" value={limits.time} onChange={(e) => setLimits({ ...limits, time: e.target.value })} /></Field>
          <Field label="Memory limit (KB)"><Input type="number" value={limits.mem} onChange={(e) => setLimits({ ...limits, mem: e.target.value })} /></Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn variant="primary" loading={busy === 'create'} onClick={createProblem}>➕ Tạo bài mới</Btn>
        </div>
      </Card>

      <Card>
        <Kicker>Cập nhật bài</Kicker>
        <SectionTitle sub="Nhập problem_id rồi điền các trường muốn thay đổi">Sửa bài đã có</SectionTitle>
        <div className="mt-4 flex gap-2">
          <Field label="Problem ID"><Input placeholder="vd. 5" value={pid} onChange={(e) => setPid(e.target.value)} className="!w-32" /></Field>
          <div className="flex items-end"><Btn variant="primary" loading={busy === 'update'} onClick={updateProblem}>💾 Lưu thay đổi</Btn></div>
        </div>
      </Card>

      <Card>
        <Kicker>Testset</Kicker>
        <SectionTitle sub="Cần ít nhất 5 ca test — JSON array">Thêm testset cho bài #{pid || '?'}</SectionTitle>
        <div className="mt-4 grid gap-3">
          <Field label="Checker">
            <Select value={checker} onChange={(e) => setChecker(e.target.value)}>
              <option value="exact">exact (khớp chính xác)</option>
              <option value="token">token (bỏ qua khoảng trắng)</option>
              <option value="float">float (so sánh số thực)</option>
              <option value="custom">custom (checker tự viết)</option>
            </Select>
          </Field>
          <Field label="Cases (JSON array, ≥5 phần tử)">
            <TextArea value={cases} onChange={(e) => setCases(e.target.value)} rows={6} className="font-mono text-xs" />
          </Field>
          <Btn variant="primary" loading={busy === 'testset'} onClick={addTestset}>📤 Upload testset</Btn>
        </div>
      </Card>

      {!form.slug && !pid && (
        <EmptyState title="Chưa có bài nào" hint="Điền form bên trên để tạo bài tập đầu tiên." />
      )}
    </div>
  );
}
