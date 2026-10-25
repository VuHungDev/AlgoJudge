'use client';

import React from 'react';

/* ---------- Layout primitives ---------- */
export function Card({ children, className = '', hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return <div className={`studio-card${hover ? ' studio-card-hover' : ''} ${className}`}>{children}</div>;
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="studio-kicker">{children}</p>;
}

export function SectionTitle({ children, sub, action }: { children: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="studio-title mt-2 text-xl">{children}</h2>
        {sub && <p className="studio-muted mt-1 text-sm">{sub}</p>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

/* Moi khu vuc mot ban sac (zone) — hoc / thi dau / giang vien / van hanh / tai khoan. */
export type Zone = 'learn' | 'compete' | 'teach' | 'ops' | 'account';
const ZONE_META: Record<Zone, { tag: string; code: string }> = {
  learn: { tag: 'HỌC TẬP', code: 'H·01' },
  compete: { tag: 'THI ĐẤU', code: 'C·02' },
  teach: { tag: 'GIẢNG VIÊN', code: 'G·03' },
  ops: { tag: 'VẬN HÀNH', code: 'O·04' },
  account: { tag: 'TÀI KHOẢN', code: 'A·05' },
};

export function ZoneTag({ zone }: { zone: Zone }) {
  const m = ZONE_META[zone];
  return <span className="zone-tag"><b>{m.code}</b>{m.tag}</span>;
}

export function PageHero({ kicker, title, accent, desc, children, stat, zone = 'learn' }: {
  kicker: string; title: string; accent?: string; desc?: string;
  children?: React.ReactNode; stat?: { label: string; value: React.ReactNode };
  glow?: 'accent' | 'primary' | 'danger' | 'info' | 'gold'; zone?: Zone;
}) {
  return (
    <section className="obe-banner">
      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-60 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <ZoneTag zone={zone} />
            <Kicker>{kicker}</Kicker>
          </div>
          <h1 className="studio-display mt-3 max-w-3xl text-2xl text-white sm:text-3xl">
            {title}{accent ? <> — {accent}</> : null}
          </h1>
          {desc && <p className="mt-3 max-w-2xl font-medium text-white">{desc}</p>}
          {children && <div className="mt-5 flex flex-wrap gap-3">{children}</div>}
        </div>
        {stat && (
          <div className="obe-stat-card">
            <p className="text-sm text-white/80">{stat.label}</p>
            <p className="studio-display mt-1 text-3xl text-white">{stat.value}</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Buttons / inputs ---------- */
type BtnVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export function Btn({ children, variant = 'secondary', className = '', loading = false, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  const v = variant === 'primary' ? 'studio-primary' : variant === 'accent' ? 'studio-accent'
    : variant === 'ghost' ? 'studio-ghost' : variant === 'danger' ? 'studio-danger' : 'studio-secondary';
  return (
    <button className={`studio-button ${v} ${className}`} disabled={rest.disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="btn-spinner" aria-hidden />}
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`studio-input ${props.className || ''}`} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`studio-input ${props.className || ''}`} />;
}
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`studio-input font-mono ${props.className || ''}`} />;
}
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="studio-muted mb-1 block text-xs font-bold tracking-wider uppercase">{label}</span>
      {children}
      {hint && <span className="studio-muted-dim mt-1 block text-xs">{hint}</span>}
    </label>
  );
}

/* ---------- Password input voi nut mat an/hien ---------- */
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = React.useState(false);
  return (
    <span className="relative block">
      <input {...props} type={show ? 'text' : 'password'} className={`studio-input pr-11 ${props.className || ''}`} />
      <button
        type="button"
        aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        onClick={() => setShow((v) => !v)}
        className="studio-muted hover:text-primary absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-2 py-1 text-lg leading-none transition"
      >
        {show ? '🙈' : '👁'}
      </button>
    </span>
  );
}

/* ---------- Phan trang ---------- */
export interface PageMeta { page: number; per_page: number; total: number; last_page: number }
export function Pagination({ meta, onPage }: { meta?: PageMeta | null; onPage: (p: number) => void }) {
  if (!meta || meta.last_page <= 1) return null;
  const { page, last_page, total } = meta;
  const nums: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(last_page, page + 2); i++) nums.push(i);
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-2" aria-label="Phân trang">
      <p className="studio-muted text-xs">Trang {page}/{last_page} · {total} mục</p>
      <div className="flex flex-wrap gap-1.5">
        <Btn className="!px-3 !py-1.5 text-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Trước</Btn>
        {nums[0] > 1 && <Btn className="!px-3 !py-1.5 text-sm" onClick={() => onPage(1)}>1</Btn>}
        {nums[0] > 2 && <span className="studio-muted px-1">…</span>}
        {nums.map((n) => (
          <Btn key={n} variant={n === page ? 'primary' : 'secondary'} className="!px-3 !py-1.5 text-sm"
            aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>{n}</Btn>
        ))}
        {nums[nums.length - 1] < last_page - 1 && <span className="studio-muted px-1">…</span>}
        {nums[nums.length - 1] < last_page && <Btn className="!px-3 !py-1.5 text-sm" onClick={() => onPage(last_page)}>{last_page}</Btn>}
        <Btn className="!px-3 !py-1.5 text-sm" disabled={page >= last_page} onClick={() => onPage(page + 1)}>Sau →</Btn>
      </div>
    </nav>
  );
}

/* ---------- Badges ---------- */
type Tone = 'info' | 'ok' | 'warn' | 'bad' | 'neutral';
const TONE_STYLE: Record<Tone, React.CSSProperties> = {
  info: { background: 'rgba(96,165,250,.12)', color: 'var(--info)', borderColor: 'rgba(96,165,250,.3)' },
  ok: { background: 'rgba(52,211,153,.13)', color: 'var(--success)', borderColor: 'rgba(52,211,153,.3)' },
  warn: { background: 'rgba(251,191,36,.13)', color: 'var(--warning)', borderColor: 'rgba(251,191,36,.3)' },
  bad: { background: 'rgba(251,113,133,.13)', color: 'var(--danger)', borderColor: 'rgba(251,113,133,.3)' },
  neutral: { background: 'rgba(147,167,194,.12)', color: 'var(--muted)', borderColor: 'rgba(147,167,194,.3)' },
};
export function Badge({ children, tone = 'info', dot = false }: { children: React.ReactNode; tone?: Tone; dot?: boolean }) {
  return (
    <span className="studio-badge" style={TONE_STYLE[tone]}>
      {dot && <span aria-hidden style={{ width: '.4rem', height: '.4rem', borderRadius: '999px', background: 'currentColor', display: 'inline-block' }} />}
      {children}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict?: string | null }) {
  if (!verdict || verdict === 'PENDING' || verdict === 'QUEUED' || verdict === 'RUNNING') return <Badge tone="warn" dot>{verdict || 'PENDING'}</Badge>;
  if (verdict === 'ACCEPTED') return <Badge tone="ok" dot>ACCEPTED</Badge>;
  if (verdict === 'SYSTEM_ERROR' || verdict === 'RETRY_PENDING') return <Badge tone="neutral" dot>{verdict}</Badge>;
  return <Badge tone="bad" dot>{verdict}</Badge>;
}

export function DiffBadge({ d }: { d?: string }) {
  const tone: Tone = d === 'easy' ? 'ok' : d === 'hard' ? 'bad' : d === 'medium' ? 'warn' : 'neutral';
  return <Badge tone={tone}>{(d || '—').toUpperCase()}</Badge>;
}

export function LangBadge({ lang }: { lang: string }) {
  const colors: Record<string, string> = {
    python: '#ff5c1a', cpp: '#60a5fa', js: '#e8b93e', java: '#fb7185', go: '#60a5fa', c: '#c6f135',
  };
  const c = colors[lang] || '#ff5c1a';
  return <span className="studio-badge" style={{ color: c, borderColor: `${c}44`, background: `${c}14` }}>{lang}</span>;
}

/* ---------- States ---------- */
export function EmptyState({ title, hint, action, icon = '◌' }: { title: string; hint?: string; action?: React.ReactNode; icon?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <div className="empty-illus" aria-hidden>{icon}</div>
      <p className="mt-3 font-bold">{title}</p>
      {hint && <p className="studio-muted mt-1 text-sm">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-2" role="status" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-16" style={{ opacity: 1 - i * 0.12 }} />
      ))}
      <span className="sr-only">Đang tải dữ liệu…</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm" role="alert">
      <p className="font-bold text-danger">Đã xảy ra lỗi</p>
      <p className="studio-muted mt-1 break-words">{message}</p>
      {onRetry && <Btn variant="ghost" className="mt-2 px-2 py-1 text-sm" onClick={onRetry}>Thử lại →</Btn>}
    </div>
  );
}

export function Guard({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-raised text-3xl">🔒</div>
      <Kicker>ACCESS</Kicker>
      <h2 className="studio-title mt-2 text-2xl">{title}</h2>
      {hint && <p className="studio-muted mt-2">{hint}</p>}
    </Card>
  );
}

/* ---------- Data display ---------- */
export function Stat({ label, value, sub, accent, icon }: { label: string; value: React.ReactNode; sub?: string; accent?: string; icon?: string }) {
  return (
    <div className="stat-tile">
      <div className="flex items-start justify-between gap-2">
        <p className="studio-kicker">{label}</p>
        {icon && <span aria-hidden className="text-lg opacity-60">{icon}</span>}
      </div>
      <p className="studio-title mt-1 text-3xl tabular-nums" style={accent ? { color: accent } : undefined}>{value}</p>
      {sub && <p className="studio-muted mt-1 text-xs">{sub}</p>}
    </div>
  );
}

export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="progress-track" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Tiến độ'}>
        <div className="progress-fill" style={{ width: `${v}%` }} />
      </div>
      {label && <p className="studio-muted mt-1 text-xs">{label}</p>}
    </div>
  );
}

export function Table<T>({ columns, rows, keyOf, empty }: {
  columns: { head: string; center?: boolean; render: (r: T, i: number) => React.ReactNode }[];
  rows: T[]; keyOf: (r: T, i: number) => string | number; empty?: string;
}) {
  if (rows.length === 0) return <p className="studio-muted mt-3 text-sm">{empty || 'Chưa có dữ liệu.'}</p>;
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border">
      <table className="studio-table">
        <thead><tr>{columns.map((c, i) => <th key={i} style={c.center ? { textAlign: 'center' } : undefined}>{c.head}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={keyOf(r, i)}>{columns.map((c, j) => <td key={j} style={c.center ? { textAlign: 'center' } : undefined}>{c.render(r, i)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function CodeBlock({ title, code, lang }: { title?: string; code: string; lang?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* trinh duyet chan clipboard */ }
  };
  return (
    <div className="studio-code overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs">
        <span className="studio-muted font-bold">{title || 'output'}</span>
        <div className="flex items-center gap-2">
          {lang && <span className="studio-badge">{lang}</span>}
          <button type="button" onClick={copy}
            className="studio-muted hover:text-primary rounded px-2 py-0.5 font-bold transition"
            aria-label="Sao chép nội dung">
            {copied ? '✓ Đã chép' : 'Chép'}
          </button>
        </div>
      </div>
      <pre className="max-h-96 overflow-auto p-4 text-[13px] leading-relaxed whitespace-pre-wrap">{code}</pre>
    </div>
  );
}
