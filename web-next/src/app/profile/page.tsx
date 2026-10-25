'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Btn, Card, EmptyState, ErrorBox, Field, Guard, Input, Kicker, LoadingSkeleton, PageHero, PasswordInput, ProgressBar, SectionTitle, Stat, VerdictBadge } from '@/components/ui';
import { useToast } from '@/components/feedback';

interface HistItem { id: number; language: string; verdict?: string | null; score?: number }

export default function ProfilePage() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const [hist, setHist] = useState<HistItem[]>([]);
  const [progress, setProgress] = useState<{ solved: number; total: number } | null>(null);
  const [streak, setStreak] = useState<{ streak: number; total_days: number } | null>(null);
  const [name, setName] = useState('');
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, p, s] = await Promise.all([
        api<{ submissions: HistItem[] }>('/me/submissions?per_page=10'),
        api<{ solved: number; total: number }>('/me/progress'),
        api<{ streak: number; total_days: number }>('/me/streak'),
      ]);
      setHist(h.submissions || []); setProgress(p); setStreak(s);
    } catch { /* hien thi phan ho so chinh */ }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { if (me) { setName(me.display_name || ''); void load(); } }, [me, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!me) return <Guard title="Hồ sơ cá nhân" hint="Vui lòng đăng nhập để xem hồ sơ." />;

  const pct = progress && progress.total > 0 ? Math.round((progress.solved / progress.total) * 100) : 0;

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const payload: Record<string, string> = {};
      if (name.trim()) payload.display_name = name.trim();
      if (pw) { payload.password = pw; payload.current_password = cur; }
      if (Object.keys(payload).length === 0) { toast.info('Chưa có gì để lưu', 'Bạn chưa thay đổi trường nào.'); return; }
      const r = await api<{ display_name?: string }>('/me', { method: 'PUT', body: JSON.stringify(payload) });
      toast.success('Đã lưu hồ sơ', r.display_name ? `Tên hiển thị: ${r.display_name}` : payload.password ? 'Mật khẩu đã được cập nhật.' : undefined);
      setCur(''); setPw('');
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="account"
        kicker={`Member #${me.id} · ${me.role}`}
        title={me.display_name || me.email.split('@')[0]}
        desc={me.email}
        glow="gold"
      >
        <Badge tone="info">{me.role}</Badge>
        {streak ? <Badge tone="warn">🔥 streak {streak.streak} ngày</Badge> : null}
      </PageHero>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="ĐÃ GIẢI" value={`${progress?.solved ?? 0}/${progress?.total ?? 0}`} sub={`${pct}%`} accent="var(--primary)" />
        <Stat label="STREAK" value={streak?.streak ?? '—'} sub={`${streak?.total_days ?? 0} ngày active`} accent="var(--warning)" />
        <Stat label="BÀI NỘP GẦN ĐÂY" value={hist.length} sub="10 mục mới nhất" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <Kicker>Edit profile</Kicker>
          <SectionTitle sub="Tên hiển thị dùng trên bảng xếp hạng và menu.">Chỉnh sửa hồ sơ</SectionTitle>
          <div className="mt-4 grid gap-3">
            <Field label="Tên hiển thị"><Input placeholder="VD: Nguyễn Văn A" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            {me.role === 'admin' ? (
              <p className="studio-muted rounded-xl border border-border bg-surface-raised p-3 text-sm">Tài khoản vận hành — đổi mật khẩu qua quản trị hệ thống, không dùng OTP tại đây.</p>
            ) : (
              <>
                <Field label="Mật khẩu hiện tại (bắt buộc khi đổi mật khẩu)"><PasswordInput placeholder="••••••••" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
                <Field label="Mật khẩu mới (bỏ trống nếu không đổi)"><PasswordInput placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
              </>
            )}
            <Btn variant="primary" onClick={save} loading={saving}>Lưu thay đổi</Btn>
            {me.role !== 'admin' && <Link className="studio-button studio-ghost w-fit text-sm" href="/welcome">Quên mật khẩu? Đặt lại bằng OTP →</Link>}
          </div>
          {err && <div className="mt-3"><ErrorBox message={err} /></div>}
          <div className="mt-4">
            <p className="studio-muted mb-2 text-xs font-bold uppercase tracking-wider">Tiến độ tổng</p>
            <ProgressBar pct={pct} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div><Kicker>History</Kicker><SectionTitle sub="10 bài nộp mới nhất">Hoạt động gần đây</SectionTitle></div>
            <Link prefetch={false} className="studio-button studio-ghost text-sm" href="/">Xem thêm →</Link>
          </div>
          <div className="mt-3 grid gap-2">
            {hist.map((h) => (
              <Link prefetch={false} key={h.id} href={`/submissions/${h.id}`} className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised p-3 transition hover:border-primary">
                <span className="text-sm"><b>#{h.id}</b> <span className="studio-muted">· {h.language}</span></span>
                <VerdictBadge verdict={h.verdict} />
              </Link>
            ))}
            {hist.length === 0 && <EmptyState title="Chưa có bài nộp nào" hint="Nộp bài đầu tiên từ trang Học." />}
          </div>
        </Card>
      </div>
    </div>
  );
}
