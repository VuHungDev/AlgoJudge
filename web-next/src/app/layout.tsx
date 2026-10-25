import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { FeedbackProvider } from '@/components/feedback';
import SiteChrome from './sitechrome';

const bodyFont = Be_Vietnam_Pro({ subsets: ['vietnamese', 'latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'AlgoJudge — Luyện thi lập trình',
  description: 'Hệ thống luyện thi và chấm bài lập trình: 6 ngôn ngữ, sandbox cách ly, kỳ thi, lớp học, quản trị.',
};

const THEME_INIT = `(function(){try{var t=localStorage.getItem('oj_theme');if(t!=='dark'&&t!=='light')t='light';document.documentElement.dataset.theme=t==='light'?'':'dark';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className={`min-h-screen ${bodyFont.className}`}>
        <ThemeProvider>
          <FeedbackProvider>
            <AuthProvider>
              <Suspense>
                <SiteChrome>{children}</SiteChrome>
              </Suspense>
            </AuthProvider>
          </FeedbackProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
