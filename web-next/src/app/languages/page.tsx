'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge, Card, EmptyState, Kicker, LoadingSkeleton, PageHero, SectionTitle } from '@/components/ui';

interface Lang {
  id: number; name: string; key?: string; source_file: string;
  compile_cmd?: string | null; run_cmd: string;
  version?: string; stdlib?: string; packages?: string;
}

const LANG_COLOR: Record<string, string> = {
  python: '#3776ab', cpp: '#00599c', js: '#f7df1e',
  java: '#ed8b00', go: '#00add8', c: '#a8b9cc', php: '#777bb4',
};

const LANG_ICON: Record<string, string> = {
  python: '🐍', cpp: '⚙️', js: '🟨', java: '☕', go: '🐹', c: '🔵', php: '🐘',
};

export default function LanguagesPage() {
  const [langs, setLangs] = useState<Lang[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api<{ languages: Lang[] }>('/languages')
      .then((r) => setLangs(r.languages || []))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  }, []);

  if (busy) return <LoadingSkeleton rows={4} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        zone="learn"
        kicker="MÔI TRƯỜNG CHẤM"
        title="Ngôn ngữ & thư viện"
        desc="Thông tin chi tiết về 7 ngôn ngữ được hỗ trợ: phiên bản, cách biên dịch, thư viện và gói có sẵn trong sandbox."
        stat={{ label: 'Ngôn ngữ', value: langs.length }}
      />

      {err && <Card><p className="text-sm text-danger">⚠️ {err}</p></Card>}

      <div className="grid gap-4 sm:grid-cols-2">
        {langs.map((lang) => {
          const color = LANG_COLOR[lang.key ?? ''] ?? 'var(--primary)';
          const icon = LANG_ICON[lang.key ?? ''] ?? '💻';
          return (
            <Card key={lang.id}>
              {/* Header */}
              <div className="flex items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: color + '22', border: `2px solid ${color}` }}
                >
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <Kicker>{lang.key?.toUpperCase()}</Kicker>
                  <p className="text-lg font-extrabold">{lang.name}</p>
                  {lang.version && <p className="mt-0.5 text-xs text-muted">{lang.version}</p>}
                </div>
              </div>

              {/* Compile / Run */}
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">📄 {lang.source_file}</Badge>
                  {lang.compile_cmd
                    ? <Badge tone="warn">🔨 compile</Badge>
                    : <Badge tone="ok">⚡ thông dịch</Badge>
                  }
                </div>
                {lang.compile_cmd && (
                  <div className="rounded-lg bg-surface-raised px-3 py-2">
                    <p className="text-xs text-muted">Biên dịch:</p>
                    <code className="text-xs break-all text-primary">{lang.compile_cmd}</code>
                  </div>
                )}
                <div className="rounded-lg bg-surface-raised px-3 py-2">
                  <p className="text-xs text-muted">Chạy:</p>
                  <code className="text-xs text-primary">{lang.run_cmd}</code>
                </div>
              </div>

              {/* Stdlib */}
              {lang.stdlib && (
                <details className="mt-4 group">
                  <summary className="cursor-pointer text-sm font-bold text-primary select-none hover:opacity-80">
                    📦 Thư viện chuẩn / built-in <span className="text-muted font-normal">(bấm để xem)</span>
                  </summary>
                  <p className="mt-2 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-muted">
                    {lang.stdlib}
                  </p>
                </details>
              )}

              {/* Packages */}
              {lang.packages && (
                <div className="mt-3 rounded-xl border border-border bg-surface-raised p-3">
                  <p className="text-xs font-bold text-muted">Gói ngoài:</p>
                  <p className="mt-1 text-xs leading-relaxed">{lang.packages}</p>
                </div>
              )}
            </Card>
          );
        })}
        {langs.length === 0 && (
          <div className="sm:col-span-2">
            <EmptyState title="Chưa có dữ liệu" hint="API /languages chưa trả kết quả." />
          </div>
        )}
      </div>
    </div>
  );
}
