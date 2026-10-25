'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, checkPassword, friendlyError, getToken, setToken, validEmail } from '@/lib/api';

interface Me {
  id: number;
  email: string;
  role: string;
  display_name?: string | null;
  created_at?: string;
}

interface AuthCtx {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // Khôi phục session lúc mount: đọc token local và fetch /me một lần.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<Me>('/me').then(setMe).catch(() => setToken('')).finally(() => setLoading(false));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const login = async (email: string, password: string) => {
    if (!validEmail(email)) throw new Error('Email chưa đúng định dạng.');
    if (!password) throw new Error('Vui lòng nhập mật khẩu.');
    try {
      const r = await api<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setToken(r.token);
      setMe(await api<Me>('/me'));
    } catch (e) {
      throw new Error(friendlyError(e instanceof Error ? e.message : String(e)));
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    if (!validEmail(email)) throw new Error('Email chưa đúng định dạng.');
    const pwErr = checkPassword(password);
    if (pwErr) throw new Error(pwErr);
    if (displayName && displayName.trim().length > 100) throw new Error('Tên người dùng tối đa 100 ký tự.');
    try {
      const r = await api<{ token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password, display_name: displayName?.trim() || undefined }),
      });
      setToken(r.token);
      setMe(await api<Me>('/me'));
    } catch (e) {
      throw new Error(friendlyError(e instanceof Error ? e.message : String(e)));
    }
  };

  const logout = () => {
    setToken('');
    setMe(null);
  };

  return <Ctx.Provider value={{ me, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside provider');
  return v;
}
