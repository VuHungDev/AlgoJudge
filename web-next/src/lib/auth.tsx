'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, getToken, setToken } from '@/lib/api';

interface Me {
  id: number;
  email: string;
  role: string;
}

interface AuthCtx {
  me: Me | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (getToken()) api<Me>('/me').then(setMe).catch(() => setToken(''));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(r.token);
    setMe(await api<Me>('/me'));
  };

  const register = async (email: string, password: string) => {
    const r = await api<{ token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(r.token);
    setMe(await api<Me>('/me'));
  };

  const logout = () => {
    setToken('');
    setMe(null);
  };

  return <Ctx.Provider value={{ me, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside provider');
  return v;
}
