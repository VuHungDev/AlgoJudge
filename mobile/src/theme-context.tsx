import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { colors, darkColors, type ThemeName } from './theme';

type Palette = typeof colors;

interface ThemeCtx {
  theme: ThemeName;
  C: Palette;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({ theme: 'light', C: colors, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('light');

  useEffect(() => {
    SecureStore.getItemAsync('oj_theme')
      .then((v) => { if (v === 'light' || v === 'dark') setTheme(v); })
      .catch(() => {});
  }, []);

  const toggle = () => {
    setTheme((t) => {
      const n: ThemeName = t === 'dark' ? 'light' : 'dark';
      SecureStore.setItemAsync('oj_theme', n).catch(() => {});
      return n;
    });
  };

  const C = theme === 'dark' ? { ...colors, ...darkColors } : colors;

  return <Ctx.Provider value={{ theme, C, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}

export function useThemeColors(): Palette {
  return useContext(Ctx).C;
}
