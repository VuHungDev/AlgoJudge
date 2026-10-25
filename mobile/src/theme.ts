export const colors = {
  ink: '#edf2f6',
  ink2: '#e4ebf1',
  surface: '#ffffff',
  raised: '#f5f8fb',
  hover: '#e9f1f6',
  border: '#d7e2ea',
  borderSoft: '#e4ecf2',
  text: '#14324a',
  muted: '#5b7488',
  dim: '#8ba0b2',
  primary: '#0e8aa0',
  primaryDeep: '#0b6e81',
  accent: '#0a2f52',
  accentDeep: '#08304f',
  gold: '#b45309',
  success: '#0e8a5f',
  warning: '#b45309',
  danger: '#be123c',
  info: '#0e8aa0',
  white: '#ffffff',
  code: '#d9f2f7',
  codeBg: '#0e1a24',
  inputBg: '#ffffff',
};

// Che do toi (tuy chon trong Ho so).
export const lightColors = { ...colors };

export const darkColors = {
  ...colors,
  ink: '#0c0e12',
  ink2: '#10141a',
  surface: '#141a21',
  raised: '#1b232c',
  hover: '#232d38',
  border: '#2a3440',
  borderSoft: '#212a34',
  text: '#f2efe6',
  muted: '#9aa4ae',
  dim: '#6e7883',
  primary: '#22b3c6',
  accent: '#7fd4e0',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#fb7185',
  info: '#22b3c6',
  codeBg: '#07090c',
  inputBg: '#0e1319',
};

export type ThemeName = 'light' | 'dark';

export const VERDICT_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
  ACCEPTED: { fg: '#0e8a5f', bg: '#e2f5ec', border: '#9ed9bb' },
  WRONG_ANSWER: { fg: '#be123c', bg: '#fbe7ec', border: '#f0a8bb' },
  COMPILE_ERROR: { fg: '#be123c', bg: '#fbe7ec', border: '#f0a8bb' },
  RUNTIME_ERROR: { fg: '#be123c', bg: '#fbe7ec', border: '#f0a8bb' },
  TIME_LIMIT_EXCEEDED: { fg: '#be123c', bg: '#fbe7ec', border: '#f0a8bb' },
  MEMORY_LIMIT_EXCEEDED: { fg: '#be123c', bg: '#fbe7ec', border: '#f0a8bb' },
  PENDING: { fg: '#b45309', bg: '#fdf1de', border: '#f0cf9a' },
  QUEUED: { fg: '#b45309', bg: '#fdf1de', border: '#f0cf9a' },
  RUNNING: { fg: '#b45309', bg: '#fdf1de', border: '#f0cf9a' },
  SYSTEM_ERROR: { fg: '#5b7488', bg: '#eef2f5', border: '#d7e2ea' },
  RETRY_PENDING: { fg: '#5b7488', bg: '#eef2f5', border: '#d7e2ea' },
};

export const LANG_COLORS: Record<string, string> = {
  python: '#0e8aa0',
  cpp: '#12537e',
  js: '#b45309',
  java: '#be123c',
  go: '#0e8aa0',
  c: '#0a2f52',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 10, lg: 12, xl: 16, pill: 999 } as const;
// Co chu dong bo voi web: hero 26, tieu de 22, muc 18 — khong phong to kieu AI.
export const type = { hero: 26, title: 22, section: 18, body: 14, small: 12, tiny: 10, code: 12 } as const;
