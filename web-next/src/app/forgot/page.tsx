'use client';

// Route /forgot cu: giu de khong vo link cu, tu dong dua ve khung quen mat khau trong /welcome.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/welcome'); }, [router]);
  return null;
}
