import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Modal } from 'react-native';
import { useThemeColors } from '../theme-context';
import { spacing, radius } from '../theme';

/* ---------- Toast ---------- */
export type ToastTone = 'success' | 'error' | 'info' | 'warning';
export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
}

interface ToastApi {
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
  warning: (title: string, detail?: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast phải nằm trong <ToastProvider>');
  return ctx;
}

const ICON: Record<ToastTone, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '!',
};

const ACCENT: Record<ToastTone, string> = {
  success: '#0e8a5f',
  error: '#be123c',
  info: '#0e8aa0',
  warning: '#b45309',
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const C = useThemeColors();
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(3800),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [opacity, onDismiss]);

  const styles = StyleSheet.create({
    card: {
      backgroundColor: C.surface,
      borderWidth: 2,
      borderColor: C.border,
      borderLeftWidth: 4,
      borderLeftColor: ACCENT[item.tone],
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    icon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: ACCENT[item.tone],
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '900',
    },
    content: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: C.text,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
    },
    detail: {
      color: C.muted,
      fontSize: 12,
      lineHeight: 18,
    },
    close: {
      padding: 4,
    },
    closeText: {
      color: C.dim,
      fontSize: 18,
      lineHeight: 18,
    },
  });

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>{ICON[item.tone]}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        {item.detail && <Text style={styles.detail}>{item.detail}</Text>}
      </View>
      <Pressable onPress={onDismiss} style={styles.close}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = React.useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((tone: ToastTone, title: string, detail?: string) => {
    seq.current += 1;
    const id = seq.current;
    setItems((prev) => [...prev.slice(-2), { id, tone, title, detail }]);
  }, []);

  const api: ToastApi = {
    success: (title, detail) => push('success', title, detail),
    error: (title, detail) => push('error', title, detail),
    info: (title, detail) => push('info', title, detail),
    warning: (title, detail) => push('warning', title, detail),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <View style={{ position: 'absolute', top: 60, left: spacing.md, right: spacing.md, zIndex: 90 }}>
        {items.map((it) => (
          <ToastCard key={it.id} item={it} onDismiss={() => dismiss(it.id)} />
        ))}
      </View>
    </ToastCtx.Provider>
  );
}

/* ---------- Confirm dialog ---------- */
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmCtx = createContext<ConfirmApi | null>(null);

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm phải nằm trong <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const C = useThemeColors();
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => {
    setState({ ...opts, resolve });
  }), []);

  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };

  const styles = StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: 'rgba(6, 24, 40, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: radius.lg,
      padding: spacing.xl,
      gap: spacing.md,
    },
    mark: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: state?.danger ? '#2b1820' : '#0e2733',
      alignItems: 'center',
      justifyContent: 'center',
    },
    markText: {
      color: state?.danger ? '#be123c' : C.primary,
      fontSize: 24,
      fontWeight: '900',
    },
    title: {
      color: C.text,
      fontSize: 18,
      fontWeight: '800',
    },
    message: {
      color: C.muted,
      fontSize: 14,
      lineHeight: 22,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    btn: {
      flex: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    btnCancel: {
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    btnConfirm: {
      backgroundColor: state?.danger ? '#be123c' : C.primary,
    },
    btnCancelText: {
      color: C.text,
      fontWeight: '800',
      fontSize: 14,
    },
    btnConfirmText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 14,
    },
  });

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      {state && (
        <Modal transparent visible animationType="fade" onRequestClose={() => close(false)}>
          <Pressable style={styles.scrim} onPress={() => close(false)}>
            <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
              <View style={styles.mark}>
                <Text style={styles.markText}>{state.danger ? '!' : '?'}</Text>
              </View>
              <Text style={styles.title}>{state.title}</Text>
              {state.message && <Text style={styles.message}>{state.message}</Text>}
              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.btnCancel]} onPress={() => close(false)}>
                  <Text style={styles.btnCancelText}>{state.cancelLabel || 'Hủy'}</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnConfirm]} onPress={() => close(true)}>
                  <Text style={styles.btnConfirmText}>{state.confirmLabel || 'Đồng ý'}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}

/* ---------- Feedback tổng hợp ---------- */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </ToastProvider>
  );
}
