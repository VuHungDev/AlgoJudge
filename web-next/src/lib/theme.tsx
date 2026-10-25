'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('oj_theme')) as Theme | null;
    const t = saved === 'light' || saved === 'dark' ? saved : 'light';
    setTheme(t);
    document.documentElement.dataset.theme = t === 'light' ? '' : t;
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggle = () => {
    setTheme((cur) => {
      const next: Theme = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next === 'light' ? '' : next;
      try { localStorage.setItem('oj_theme', next); } catch { /* bo qua */ }
      return next;
    });
  };

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
