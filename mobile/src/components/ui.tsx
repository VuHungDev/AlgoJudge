import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View, StyleSheet, ActivityIndicator } from 'react-native';
import { radius, spacing, type as t, VERDICT_COLORS, LANG_COLORS } from '../theme';
import { useTheme, useThemeColors } from '../theme-context';

type Palette = ReturnType<typeof useThemeColors>;

function makeStyles(C: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.ink },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    hero: {
      backgroundColor: '#0d4a75', borderWidth: 0,
      borderRadius: 14, padding: spacing.xl, gap: spacing.sm, overflow: 'hidden',
    },
    heroGlow: { position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'transparent' },
    heroTitle: { color: '#ffffff', fontSize: t.hero, fontWeight: '800', lineHeight: 40 },
    heroAccent: { color: '#ffffff' },
    heroSub: { color: '#ffffff', fontSize: t.body, lineHeight: 22 },
    heroKicker: { color: '#7fd4e0', fontSize: t.tiny, fontWeight: '800', letterSpacing: 2 },
    card: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 2, borderRadius: 14, padding: spacing.lg, gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { color: C.text, fontSize: t.title, fontWeight: '700' },
    section: { color: C.text, fontSize: t.section, fontWeight: '800' },
    muted: { color: C.muted, fontSize: t.small, lineHeight: 18 },
    kicker: { color: C.primary, fontSize: t.tiny, fontWeight: '800', letterSpacing: 2 },
    btn: { borderRadius: 10, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
    btnPrimary: { backgroundColor: C.primary },
    btnPrimaryText: { color: C.ink, fontWeight: '700', fontSize: t.body },
    btnAccent: { backgroundColor: C.accent },
    btnAccentText: { color: '#20270a', fontWeight: '700', fontSize: t.body },
    btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border },
    btnGhostText: { color: C.text, fontWeight: '800', fontSize: t.body },
    btnDisabled: { opacity: 0.55 },
    field: { gap: spacing.xs },
    fieldLabel: { color: C.muted, fontSize: t.tiny, fontWeight: '800', letterSpacing: 1 },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: spacing.md, color: C.text, backgroundColor: C.inputBg, fontSize: t.body },
    badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, fontWeight: '800', fontSize: t.small, overflow: 'hidden' },
    chip: { borderWidth: 1, borderColor: C.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 40, justifyContent: 'center' },
    chipText: { color: C.muted, fontWeight: '700' },
    statRow: { flexDirection: 'row', gap: spacing.sm },
    stat: { flex: 1, backgroundColor: C.raised, borderColor: C.borderSoft, borderWidth: 1, borderRadius: 10, padding: spacing.md, gap: 2 },
    statLabel: { color: C.primary, fontSize: t.tiny, fontWeight: '800', letterSpacing: 1.5 },
    statValue: { color: C.text, fontSize: 22, fontWeight: '700' },
    track: { height: 10, borderRadius: radius.pill, backgroundColor: C.ink, borderWidth: 1, borderColor: C.borderSoft, overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: C.primary },
    codeWrap: { borderWidth: 1, borderColor: C.borderSoft, borderRadius: 10, backgroundColor: C.codeBg, overflow: 'hidden' },
    codeTitle: { color: C.muted, fontSize: t.tiny, fontWeight: '800', letterSpacing: 1.5, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
    code: { color: C.code, padding: spacing.md, fontFamily: 'monospace', fontSize: t.code, lineHeight: 20 },
    empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: 10, padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
    emptyMark: { color: C.dim, fontSize: 28 },
    emptyTitle: { color: C.text, fontWeight: '800', fontSize: t.body },
    errorBox: { borderWidth: 1, borderColor: '#7f1d2e', borderRadius: 10, backgroundColor: '#2b1820', padding: spacing.md, gap: spacing.xs },
    errorTitle: { color: C.danger, fontWeight: '800' },
    errorMsg: { color: C.muted, fontSize: t.small },
    loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
    pwWrap: { position: 'relative', justifyContent: 'center' },
    pwInput: { paddingRight: 48 },
    pwEye: { position: 'absolute', right: 6, paddingHorizontal: 10, paddingVertical: 10 },
    pwEyeText: { fontSize: 18, color: C.muted },
    pager: { gap: spacing.sm, marginTop: spacing.sm },
    pagerInfo: { color: C.muted, fontSize: t.small, textAlign: 'center' },
    pagerBtns: { flexDirection: 'row', gap: spacing.sm },
    pagerBtn: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    pagerBtnPrimary: { backgroundColor: C.primary, borderColor: C.primary },
    pagerBtnDisabled: { opacity: 0.45 },
    pagerBtnText: { color: C.text, fontWeight: '800' },
    pagerBtnPrimaryText: { color: C.ink },
  });
}

function useS() {
  const C = useThemeColors();
  return React.useMemo(() => makeStyles(C), [C]);
}

/* ---------- Layout ---------- */
export function Screen({ children, innerRef }: { children: React.ReactNode; innerRef?: React.RefObject<any> }) {
  const s = useS();
  return <ScrollView ref={innerRef} style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}

export function Hero({ kicker, title, accent, sub }: { kicker: string; title: string; accent?: string; sub?: string }) {
  const s = useS();
  return (
    <View style={s.hero}>
      <View style={s.heroGlow} />
      <Text style={s.heroKicker}>{kicker}</Text>
      <Text style={s.heroTitle}>{title}{accent ? <Text style={s.heroAccent}> {accent}</Text> : null}</Text>
      {sub ? <Text style={s.heroSub}>{sub}</Text> : null}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: object; onPress?: () => void }) {
  const s = useS();
  if (onPress) return <Pressable onPress={onPress} style={[s.card, style]}>{children}</Pressable>;
  return <View style={[s.card, style]}>{children}</View>;
}

export function Row({ children, style }: { children: React.ReactNode; style?: object }) {
  const s = useS();
  return <View style={[s.row, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const s = useS();
  return <Text style={s.section}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  const s = useS();
  return <Text style={s.title}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  const s = useS();
  return <Text style={[s.muted, style]}>{children}</Text>;
}

export function Kicker({ children }: { children: React.ReactNode }) {
  const s = useS();
  return <Text style={s.kicker}>{children}</Text>;
}

/* ---------- Buttons ---------- */
export function PrimaryButton({ title, onPress, disabled, loading }: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const s = useS();
  const C = useThemeColors();
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[s.btn, s.btnPrimary, (disabled || loading) && s.btnDisabled]}>
      {loading ? <ActivityIndicator color={C.ink} /> : <Text style={s.btnPrimaryText}>{title}</Text>}
    </Pressable>
  );
}

export function AccentButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  const s = useS();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.btn, s.btnAccent, disabled && s.btnDisabled]}>
      <Text style={s.btnAccentText}>{title}</Text>
    </Pressable>
  );
}

export function GhostButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  const s = useS();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.btn, s.btnGhost, disabled && s.btnDisabled]}>
      <Text style={s.btnGhostText}>{title}</Text>
    </Pressable>
  );
}

/* ---------- Inputs ---------- */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const s = useS();
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function AppInput(props: React.ComponentProps<typeof TextInput>) {
  const s = useS();
  const C = useThemeColors();
  return <TextInput placeholderTextColor={C.dim} {...props} style={[s.input, props.style]} />;
}

/* ---------- Password input voi nut mat an/hien ---------- */
export function PasswordField(props: React.ComponentProps<typeof TextInput>) {
  const s = useS();
  const C = useThemeColors();
  const [show, setShow] = React.useState(false);
  return (
    <View style={s.pwWrap}>
      <TextInput
        placeholderTextColor={C.dim}
        {...props}
        secureTextEntry={!show}
        style={[s.input, s.pwInput, props.style]}
      />
      <Pressable
        onPress={() => setShow((v) => !v)}
        accessibilityLabel={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        style={s.pwEye}
      >
        <Text style={s.pwEyeText}>{show ? '🙈' : '👁'}</Text>
      </Pressable>
    </View>
  );
}

/* ---------- Phan trang: 10 muc/trang ---------- */
export interface PageMeta { page: number; per_page: number; total: number; last_page: number }

export function Pagination({ meta, onPage }: { meta?: PageMeta | null; onPage: (p: number) => void }) {
  const s = useS();
  if (!meta || meta.last_page <= 1) return null;
  return (
    <View style={s.pager}>
      <Text style={s.pagerInfo}>Trang {meta.page}/{meta.last_page} · {meta.total} mục</Text>
      <View style={s.pagerBtns}>
        <Pressable
          disabled={meta.page <= 1}
          onPress={() => onPage(meta.page - 1)}
          style={[s.pagerBtn, meta.page <= 1 && s.pagerBtnDisabled]}
        >
          <Text style={s.pagerBtnText}>← Trước</Text>
        </Pressable>
        <Pressable
          disabled={meta.page >= meta.last_page}
          onPress={() => onPage(meta.page + 1)}
          style={[s.pagerBtn, s.pagerBtnPrimary, meta.page >= meta.last_page && s.pagerBtnDisabled]}
        >
          <Text style={[s.pagerBtnText, s.pagerBtnPrimaryText]}>Sau →</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------- Badges / chips ---------- */
export function StatusBadge({ value }: { value?: string }) {
  const s = useS();
  const key = value || 'PENDING';
  const c = VERDICT_COLORS[key] || VERDICT_COLORS.PENDING;
  return <Text style={[s.badge, { color: c.fg, backgroundColor: c.bg, borderColor: c.border }]}>{key}</Text>;
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  const s = useS();
  const C = useThemeColors();
  const fg = color || C.primary;
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { borderColor: fg, backgroundColor: '#ff5c1a22' }]}>
      <Text style={[s.chipText, active && { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function LangBadge({ lang }: { lang: string }) {
  const s = useS();
  const C = useThemeColors();
  const c = LANG_COLORS[lang] || C.primary;
  return <Text style={[s.badge, { color: c, backgroundColor: `${c}22`, borderColor: `${c}55` }]}>{lang}</Text>;
}

export function DiffBadge({ d }: { d?: string }) {
  const s = useS();
  const C = useThemeColors();
  const map: Record<string, string> = { easy: C.success, medium: C.warning, hard: C.danger };
  const c = (d && map[d]) || C.muted;
  return <Text style={[s.badge, { color: c, backgroundColor: `${c}22`, borderColor: `${c}55` }]}>{(d || '—').toUpperCase()}</Text>;
}

export function RoleBadge({ role }: { role?: string }) {
  const s = useS();
  const C = useThemeColors();
  return <Text style={[s.badge, { color: C.info, backgroundColor: '#16283f', borderColor: '#2b4a73' }]}>{role || 'student'}</Text>;
}

/* ---------- Data display ---------- */
export function StatRow({ stats }: { stats: { label: string; value: string; accent?: string; onPress?: () => void }[] }) {
  const s = useS();
  return (
    <View style={s.statRow}>
      {stats.map((x) => {
        const body = (
          <View key={x.label} style={s.stat}>
            <Text style={s.statLabel}>{x.label}</Text>
            <Text style={[s.statValue, x.accent ? { color: x.accent } : null]}>{x.value}</Text>
          </View>
        );
        return x.onPress ? <Pressable key={x.label} onPress={x.onPress} style={{ flex: 1 }}>{body}</Pressable> : body;
      })}
    </View>
  );
}

export function ProgressBar({ pct }: { pct: number }) {
  const s = useS();
  const v = Math.max(0, Math.min(100, pct));
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${v}%` }]} />
    </View>
  );
}

export function CodeBlock({ code, title }: { code: string; title?: string }) {
  const s = useS();
  return (
    <View style={s.codeWrap}>
      {title ? <Text style={s.codeTitle}>{title}</Text> : null}
      <Text selectable style={s.code}>{code}</Text>
    </View>
  );
}

export function EmptyState({ title, hint, icon = '◌', action }: { title: string; hint?: string; icon?: string; action?: React.ReactNode }) {
  const s = useS();
  return (
    <View style={s.empty}>
      <Text style={s.emptyMark} accessibilityElementsHidden>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {hint ? <Text style={s.muted}>{hint}</Text> : null}
      {action ? <View style={{ marginTop: spacing.sm }}>{action}</View> : null}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const s = useS();
  return (
    <View style={s.errorBox}>
      <Text style={s.errorTitle}>Đã xảy ra lỗi</Text>
      <Text style={s.errorMsg}>{message}</Text>
      {onRetry ? <GhostButton title="Thử lại →" onPress={onRetry} /> : null}
    </View>
  );
}

export function LoadingBlock({ hint }: { hint?: string }) {
  const s = useS();
  const C = useThemeColors();
  return (
    <View style={s.loading}>
      <ActivityIndicator color={C.primary} />
      <Text style={s.muted}>{hint || 'Đang tải…'}</Text>
    </View>
  );
}

/* ---------- Khung cho (skeleton) trong luc tai ---------- */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  const s = useS();
  const C = useThemeColors();
  const [pulse, setPulse] = React.useState(0.45);

  React.useEffect(() => {
    let alive = true;
    let dir = 1;
    const tick = () => {
      if (!alive) return;
      setPulse((p) => {
        const next = p + dir * 0.06;
        if (next >= 0.85) dir = -1;
        if (next <= 0.4) dir = 1;
        return Math.min(0.85, Math.max(0.4, next));
      });
    };
    const id = setInterval(tick, 90);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <View accessibilityLabel="Đang tải danh sách" style={{ gap: spacing.sm }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 64,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.borderSoft,
            backgroundColor: C.raised,
            opacity: pulse - i * 0.08,
          }}
        />
      ))}
    </View>
  );
}

/* ---------- Nut chuyen sang/toi ---------- */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return <GhostButton title={theme === 'dark' ? '☀️ Chế độ sáng' : '🌙 Chế độ tối'} onPress={toggle} />;
}



