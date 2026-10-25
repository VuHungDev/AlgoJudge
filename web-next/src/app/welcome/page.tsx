'use client';

// Diem vao dau tien cua app: logo + khung xac thuc nam giua man hinh.
// Da login (phien hop le) -> vao thang Home, bo qua welcome.
// Dang xuat -> quay ve day.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AuthCard, type AuthMode } from '@/components/auth-forms';
import { LoadingSkeleton } from '@/components/ui';

export default function Welcome() {
  const { me, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');

  useEffect(() => {
    if (!loading && me) router.replace('/');
  }, [loading, me, router]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (me) return null;

  return (
    <div className="auth-screen">
      <div className="auth-wrap">
        <div className="auth-brand">
          <span className="obe-logo !h-16 !w-16 !text-2xl">AJ</span>
          <h1 className="auth-title">Chao mung ban den voi AlgoJudge</h1>
          <p className="studio-muted text-sm">Luyen thi lap trinh — nop bai, cham tu dong, theo doi tien do theo lop.</p>
        </div>
        <div className="auth-card" role="region" aria-label="Khung xac thuc">
          <AuthCard mode={mode} onMode={setMode} />
        </div>
      </div>
    </div>
  );
}
