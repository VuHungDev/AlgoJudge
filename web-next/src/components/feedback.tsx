'use client';

// He thong thong bao (toast) + hop thoai xac nhan.
// Thay the alert()/confirm() mac dinh cua trinh duyet va cac khoi <pre> JSON tho.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/* ---------- Toast ---------- */
export type ToastTone = 'success' | 'error' | 'info' | 'warning';
export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
}

interface ToastApi {
  push: (tone: ToastTone, title: string, detail?: string) => void;
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
  warning: (title: string, detail?: string) => void;
  dismiss: (id: number) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast phải nằm trong <ToastProvider>');
  return ctx;
}

const ICON: Record<ToastTone, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '!',
};

const ACCENT: Record<ToastTone, string> = {
  success: 'var(--success)',
  error: 'var(--danger)',
  info: 'var(--primary)',
  warning: 'var(--warning)',
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLeaving(true);
      setTimeout(onDismiss, 180);
    }, 4200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`toast-card${leaving ? ' toast-leaving' : ''}`}
      style={{ '--toast-accent': ACCENT[item.tone] } as React.CSSProperties}
    >
      <span className="toast-icon" aria-hidden>{ICON[item.tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="toast-title">{item.title}</p>
        {item.detail && <p className="toast-detail">{item.detail}</p>}
      </div>
      <button type="button" onClick={onDismiss} aria-label="Đóng thông báo" className="toast-close">×</button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((tone: ToastTone, title: string, detail?: string) => {
    seq.current += 1;
    const id = seq.current;
    setItems((prev) => [...prev.slice(-3), { id, tone, title, detail }]);
  }, []);

  const api = useMemo<ToastApi>(() => ({
    push,
    dismiss,
    success: (title, detail) => push('success', title, detail),
    error: (title, detail) => push('error', title, detail),
    info: (title, detail) => push('info', title, detail),
    warning: (title, detail) => push('warning', title, detail),
  }), [push, dismiss]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-stack" aria-label="Thông báo">
        {items.map((it) => (
          <ToastCard key={it.id} item={it} onDismiss={() => dismiss(it.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Confirm dialog ---------- */
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmCtx = createContext<ConfirmApi | null>(null);

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm phải nằm trong <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => {
    setState({ ...opts, resolve });
  }), []);

  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="modal-scrim" role="presentation" onClick={() => close(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`modal-mark${state.danger ? ' modal-mark-danger' : ''}`} aria-hidden>
              {state.danger ? '!' : '?'}
            </div>
            <h2 id="confirm-title" className="modal-title">{state.title}</h2>
            {state.message && <p className="modal-message">{state.message}</p>}
            <div className="modal-actions">
              <button type="button" className="studio-button studio-secondary" onClick={() => close(false)}>
                {state.cancelLabel || 'Hủy'}
              </button>
              <button
                type="button"
                autoFocus
                className={`studio-button ${state.danger ? 'studio-danger' : 'studio-primary'}`}
                onClick={() => close(true)}
              >
                {state.confirmLabel || 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

/* ---------- Ket qua thao tac (thay khoi <pre> JSON tho) ---------- */
export function ResultPanel({ title, data, tone = 'info' }: { title?: string; data: unknown; tone?: ToastTone }) {
  const rows = toRows(data);
  if (!rows.length) return null;
  return (
    <div className="result-panel" style={{ '--result-accent': ACCENT[tone] } as React.CSSProperties}>
      {title && <p className="result-title">{title}</p>}
      <dl className="result-list">
        {rows.map(([k, v], i) => (
          <div key={i} className="result-row">
            <dt>{humanizeKey(k)}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function toRows(data: unknown): [string, string][] {
  if (data == null) return [];
  if (typeof data === 'string') return [['Kết quả', data]];
  if (typeof data === 'number' || typeof data === 'boolean') return [['Kết quả', String(data)]];
  if (Array.isArray(data)) return [['Số mục', String(data.length)] as [string, string]].concat(
    data.slice(0, 6).map((v, i): [string, string] => [`Mục ${i + 1}`, preview(v)]),
  );
  if (typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
      .slice(0, 12)
      .map(([k, v]) => [k, String(v)] as [string, string]);
  }
  return [];
}

function preview(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'object') return Array.isArray(v) ? `[${v.length} mục]` : '{…}';
  return String(v);
}

const KEY_LABEL: Record<string, string> = {
  id: 'Mã',
  problem_id: 'Mã bài tập',
  problem_version_id: 'Mã phiên bản',
  submission_id: 'Mã bài nộp',
  class_id: 'Mã lớp',
  user_id: 'Mã người dùng',
  email: 'Email',
  role: 'Vai trò',
  status: 'Trạng thái',
  verdict: 'Kết quả chấm',
  score: 'Điểm',
  comment: 'Nhận xét',
  message: 'Thông điệp',
  created_at: 'Thời điểm tạo',
  due_at: 'Hạn nộp',
  note: 'Ghi chú',
  title: 'Tiêu đề',
  slug: 'Mã bài',
  similarity: 'Độ tương đồng',
  total: 'Tổng',
  count: 'Số lượng',
};

export function humanizeKey(k: string): string {
  if (KEY_LABEL[k]) return KEY_LABEL[k];
  return k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/* ---------- FeedbackProvider tong hop ca toast + confirm ---------- */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </ToastProvider>
  );
}

/* ---------- Export alias: useDialog = useConfirm ---------- */
export const useDialog = useConfirm;
