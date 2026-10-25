// Port tu algojudge_ui/index.html: fetch + Bearer token + Idempotency-Key + SSE.
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('oj_token') || '';
}

export function setToken(t: string) {
  if (typeof window === 'undefined') return;
  if (t) localStorage.setItem('oj_token', t);
  else localStorage.removeItem('oj_token');
}

// Dich loi server tho (JSON/HTML) thanh tieng Viet de hien cho nguoi dung.
export function friendlyError(raw: unknown): string {
  const s = String(raw ?? '');
  let msg = s;
  try {
    const j = JSON.parse(s);
    msg = (j.message || j.error || s) as string;
  } catch { /* khong phai JSON thi giu nguyen */ }
  if (/already been taken/i.test(msg)) return 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.';
  if (/weak password/i.test(msg)) return 'Mật khẩu phải ≥ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (VD: Hn@2026).';
  if (/must be at least (\d+)/i.test(msg)) {
    const m = msg.match(/must be at least (\d+)/i);
    return `Mật khẩu phải từ ${m?.[1] ?? 8} ký tự trở lên.`;
  }
  if (/bad login/i.test(msg)) return 'Email hoặc mật khẩu chưa đúng. Kiểm tra lại hoặc dùng Quên mật khẩu.';
  if (/user not found/i.test(msg)) return 'Không tìm thấy tài khoản này.';
  if (/current password incorrect/i.test(msg)) return 'Mật khẩu hiện tại chưa đúng.';
  if (/invalid otp/i.test(msg)) return 'Mã OTP chưa đúng. Kiểm tra lại email (cả mục Spam).';
  if (/otp expired/i.test(msg)) return 'Mã OTP đã hết hạn hoặc không tồn tại. Hãy gửi lại mã mới.';
  if (/too many attempts|please wait/i.test(msg)) return msg.replace('please wait 60s before requesting again', 'Vui lòng đợi 60 giây rồi gửi lại.');
  if (/admin.*(cannot|not allowed)|not allowed for admin/i.test(msg)) return 'Tài khoản admin không được đổi mật khẩu tại đây. Liên hệ quản trị hệ thống.';
  if (/^</.test(s.trim()) || /<!DOCTYPE|<html/i.test(s)) return 'Máy chủ đang bận hoặc bảo trì. Thử lại sau ít phút.';
  if (msg.length > 220) return msg.slice(0, 220) + '…';
  return msg || 'Đã xảy ra lỗi. Thử lại sau.';
}

export function validEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

// Mat khau manh: >=8 ky tu, co hoa, thuong, so, ky tu dac biet.
export function checkPassword(pw: string): string | null {
  if (pw.length < 8) return 'Mật khẩu phải từ 8 ký tự trở lên.';
  if (!/[A-Z]/.test(pw)) return 'Mật khẩu cần ít nhất 1 chữ hoa (A-Z).';
  if (!/[a-z]/.test(pw)) return 'Mật khẩu cần ít nhất 1 chữ thường (a-z).';
  if (!/[0-9]/.test(pw)) return 'Mật khẩu cần ít nhất 1 chữ số.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Mật khẩu cần ít nhất 1 ký tự đặc biệt (VD: @ # $ !).';
  return null;
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const method = (opts.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  const t = getToken();
  if (t) headers['Authorization'] = 'Bearer ' + t;
  // Cache GET 15s trong bo nho de chuyen man hinh nhanh; mutation xoa sach cache.
  if (method !== 'GET') getCache.clear();
  else {
    const hit = getCache.get(path);
    if (hit && Date.now() - hit.at < 15000) return hit.data as T;
  }
  // Timeout 10s: backend treo (SMTP/SSE nghn) thi fail nhanh thay vi Stalled phut.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(API + path, { ...opts, headers, signal: ctrl.signal });
    if (!r.ok) throw new Error(await r.text());
    const data = (await r.json()) as T;
    if (method === 'GET') {
      getCache.set(path, { at: Date.now(), data });
      if (getCache.size > 100) getCache.delete(getCache.keys().next().value as string);
    }
    return data;
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      try { getCache.delete(path); } catch { /* bo qua */ }
      throw new Error('Máy chủ phản hồi quá chậm (quá 10 giây). Thử lại sau ít phút.');
    }
    throw e instanceof Error ? e : new Error(String(e));
  } finally {
    clearTimeout(timer);
  }
}

const getCache = new Map<string, { at: number; data: unknown }>();

export interface Problem {
  id: number;
  slug: string;
  title: string;
  topic: string;
  difficulty: string;
  current_version_id: number;
  current_version?: {
    statement: string;
    public_examples: unknown;
    time_limit_ms: number;
    memory_limit_kb?: number;
    source_limit_kb?: number;
  };
}

export interface SubmissionResult {
  submission_id: number;
  status?: string;
  verdict?: string;
  score?: number;
  cases?: { verdict: string; time_ms: number }[];
}

// Theo doi ket qua qua SSE, tu dong fallback polling 1.5s (giua pattern index.html cu).
export function watchSubmission(
  id: number,
  onUpdate: (s: SubmissionResult & { status: string }) => void,
  onDone: () => void,
): () => void {
  let closed = false;
  const es = new EventSource(
    `${API}/submissions/${id}/events?token=${encodeURIComponent(getToken())}`,
  );
  es.onmessage = async (e) => {
    if (closed) return;
    const s = JSON.parse(e.data);
    if (s.status && s.status !== 'QUEUED' && s.status !== 'RUNNING') {
      es.close();
      const full = await api<SubmissionResult>(`/submissions/${id}`);
      onUpdate({ ...full, status: s.status });
      onDone();
    } else {
      onUpdate(s);
    }
  };
  es.onerror = () => {
    es.close();
    const t = setInterval(async () => {
      if (closed) {
        clearInterval(t);
        return;
      }
      const s = await api<SubmissionResult>(`/submissions/${id}`);
      if (s.verdict) {
        clearInterval(t);
        onUpdate({ ...s, status: 'DONE' });
        onDone();
      }
    }, 1500);
  };
  return () => {
    closed = true;
    es.close();
  };
}
