// Port tu algojudge_ui/index.html: fetch + Bearer token + Idempotency-Key + SSE.
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('oj_token') || '';
}

export function setToken(t: string) {
  localStorage.setItem('oj_token', t);
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  const t = getToken();
  if (t) headers['Authorization'] = 'Bearer ' + t;
  const r = await fetch(API + path, { ...opts, headers });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}

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
