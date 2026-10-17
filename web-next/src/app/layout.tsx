import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'AlgoJudge — Luyện tập & Chấm bài',
  description: 'Hệ thống luyện tập và chấm bài lập trình trực tuyến',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <AuthProvider>
          <header className="bg-blue-600 text-white px-4 py-3 flex items-center gap-4">
            <b>AlgoJudge</b>
            <nav className="flex gap-3 text-sm">
              <a href="/">Học</a>
              <a href="/contests">Contest</a>
              <a href="/teacher">Giảng viên</a>
              <a href="/ops">Ops</a>
            </nav>
          </header>
          <main className="max-w-5xl mx-auto p-3">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
