import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, registerPushToken, setToken } from '../api';
import { spacing, type as t } from '../theme';
import { useThemeColors } from '../theme-context';
import { Card, Field, AppInput, PrimaryButton, GhostButton, ErrorBox, PasswordField, Title, Muted } from './ui';

// Khung xac thuc dung chung: 3 che do login / register / forgot.
// Dang nhap xong -> onSuccess (ve Home). Dang ky xong -> chuyen sang login (KHONG tu login).

export type AuthMode = 'login' | 'register' | 'forgot';

function FieldErr({ msg }: { msg?: string }) {
  const C = useThemeColors();
  if (!msg) return null;
  return <Text style={{ color: C.danger, fontSize: 12, fontWeight: '700' }}>{msg}</Text>;
}

function OkMsg({ msg }: { msg?: string }) {
  const C = useThemeColors();
  if (!msg) return null;
  return (
    <View style={s.ok}>
      <Text style={[s.okText, { color: C.success }]}>{msg}</Text>
    </View>
  );
}

const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

const checkPassword = (pw: string): string | null => {
  if (pw.length < 8) return 'Mat khau phai tu 8 ky tu tro len.';
  if (!/[A-Z]/.test(pw)) return 'Mat khau can it nhat 1 chu hoa (A-Z).';
  if (!/[a-z]/.test(pw)) return 'Mat khau can it nhat 1 chu thuong (a-z).';
  if (!/[0-9]/.test(pw)) return 'Mat khau can it nhat 1 chu so.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Mat khau can it nhat 1 ky tu dac biet (VD: @ # $ !).';
  return null;
};

/* ---------------- Dang nhap ---------------- */

export function LoginForm({ email, setEmail, notice, onSuccess, onForgot, onRegister }: {
  email: string;
  setEmail: (v: string) => void;
  notice?: string;
  onSuccess: () => void;
  onForgot: () => void;
  onRegister: () => void;
}) {
  const [pass, setPass] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const eErr = validEmail(email) ? '' : 'Email chua dung dinh dang.';
    const pErr = pass ? '' : 'Vui long nhap mat khau.';
    setEmailErr(eErr); setPassErr(pErr); setFormErr('');
    if (eErr || pErr) return;
    setBusy(true);
    try {
      const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password: pass }) });
      await setToken(r.token || '');
      await registerPushToken();
      onSuccess();
    } catch (e: any) {
      setFormErr(String(e.message || e).slice(0, 220));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Field label="Email">
        <AppInput placeholder="ban@truong.edu.vn" value={email} onChangeText={(v) => { setEmail(v); setEmailErr(''); }} autoCapitalize="none" keyboardType="email-address" />
      </Field>
      <FieldErr msg={emailErr} />
      <Field label="Mat khau">
        <PasswordField placeholder="••••••••" value={pass} onChangeText={(v) => { setPass(v); setPassErr(''); }} />
      </Field>
      <FieldErr msg={passErr} />
      <GhostButton title="Quen mat khau?" onPress={onForgot} disabled={busy} />
      {!!notice && <OkMsg msg={notice} />}
      {!!formErr && <ErrorBox message={formErr} />}
      <PrimaryButton title={busy ? 'Dang xu ly…' : 'Dang nhap'} onPress={submit} disabled={busy} loading={busy} />
      <GhostButton title="Chua co tai khoan? Dang ky" onPress={onRegister} disabled={busy} />
    </View>
  );
}

/* ---------------- Dang ky ---------------- */

export function RegisterForm({ email, setEmail, onDone, onLogin }: {
  email: string;
  setEmail: (v: string) => void;
  onDone: (email: string) => void;
  onLogin: () => void;
}) {
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [errs, setErrs] = useState<{ name?: string; email?: string; pass?: string; pass2?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e: typeof errs = {};
    if (!validEmail(email)) e.email = 'Email chua dung dinh dang.';
    const pwErr = checkPassword(pass);
    if (pwErr) e.pass = pwErr;
    if (pass2 !== pass) e.pass2 = 'Mat khau xac nhan phai trung khop.';
    if (name.trim().length > 100) e.name = 'Ho ten toi da 100 ky tu.';
    setErrs(e);
    if (Object.keys(e).length > 0) return;
    setBusy(true);
    try {
      const body: Record<string, string> = { email: email.trim(), password: pass };
      if (name.trim()) body.display_name = name.trim();
      await api('/auth/register', { method: 'POST', body: JSON.stringify(body) });
      await setToken('');
      onDone(email.trim());
    } catch (err: any) {
      setErrs({ form: String(err.message || err).slice(0, 220) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Field label="Ho ten (hien thi tren bang xep hang)">
        <AppInput placeholder="VD: Nguyen Van A" value={name} onChangeText={setName} maxLength={100} />
      </Field>
      <FieldErr msg={errs.name} />
      <Field label="Email">
        <AppInput placeholder="ban@truong.edu.vn" value={email} onChangeText={(v) => { setEmail(v); setErrs((p) => ({ ...p, email: undefined })); }} autoCapitalize="none" keyboardType="email-address" />
      </Field>
      <FieldErr msg={errs.email} />
      <Field label="Mat khau">
        <PasswordField placeholder="Toi thieu 8 ky tu" value={pass} onChangeText={setPass} />
      </Field>
      <FieldErr msg={errs.pass} />
      <Field label="Xac nhan mat khau">
        <PasswordField placeholder="Nhap lai mat khau" value={pass2} onChangeText={setPass2} />
      </Field>
      <FieldErr msg={errs.pass2} />
      <Muted>Mat khau tren 8 ky tu, gom chu hoa, chu thuong, so va ky tu dac biet.</Muted>
      {!!errs.form && <ErrorBox message={errs.form} />}
      <PrimaryButton title={busy ? 'Dang xu ly…' : 'Dang ky'} onPress={submit} disabled={busy} loading={busy} />
      <GhostButton title="Da co tai khoan? Dang nhap" onPress={onLogin} disabled={busy} />
    </View>
  );
}

/* ---------------- Quen mat khau (giu nguyen luong OTP) ---------------- */

type Step = 'email' | 'otp';

export function ForgotForm({ email, setEmail, onBack }: {
  email: string;
  setEmail: (v: string) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<Step>('email');
  const [otp, setOtp] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const sendOtp = async () => {
    if (!validEmail(email)) { setErr('Email chua dung dinh dang.'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      await api('/auth/forgot', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      setStep('otp');
      setMsg(`Da gui ma OTP toi ${email.trim()} (nguoi gui: AlgoJudge). Hieu luc 10 phut.`);
      setCooldown(60);
      const t = setInterval(() => setCooldown((c) => {
        if (c <= 1) { clearInterval(t); return 0; }
        return c - 1;
      }), 1000);
    } catch (e: any) { setErr(String(e.message || e).slice(0, 220)); }
    finally { setBusy(false); }
  };

  const doReset = async () => {
    if (pw !== pw2) { setErr('Mat khau xac nhan phai trung khop.'); return; }
    const pwErr = checkPassword(pw);
    if (pwErr) { setErr(pwErr); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      await api('/auth/reset', { method: 'POST', body: JSON.stringify({ email: email.trim(), otp: otp.trim(), password: pw }) });
      setMsg('Dat lai mat khau thanh cong. Hay dang nhap bang mat khau moi.');
    } catch (e: any) { setErr(String(e.message || e).slice(0, 220)); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      {step === 'email' ? (
        <>
          <Field label="Email tai khoan">
            <AppInput placeholder="ban@truong.edu.vn" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </Field>
          <PrimaryButton title={busy ? 'Dang gui…' : 'Gui ma OTP qua email'} onPress={sendOtp} disabled={busy || !email.trim()} loading={busy} />
        </>
      ) : (
        <>
          <Field label="Ma OTP 6 so (tu email AlgoJudge)">
            <AppInput placeholder="123456" value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={10} style={s.otp} />
          </Field>
          <Field label="Mat khau moi">
            <PasswordField placeholder="Toi thieu 8 ky tu" value={pw} onChangeText={setPw} />
          </Field>
          <Field label="Xac nhan mat khau moi">
            <PasswordField placeholder="Nhap lai mat khau moi" value={pw2} onChangeText={setPw2} />
          </Field>
          <PrimaryButton title={busy ? 'Dang xu ly…' : 'Dat lai mat khau'} onPress={doReset} disabled={busy || !otp.trim() || !pw} />
          <GhostButton title={cooldown > 0 ? `Gui lai sau ${cooldown}s` : 'Gui lai ma OTP'} onPress={sendOtp} disabled={busy || cooldown > 0} />
          <GhostButton title="Doi email khac" onPress={() => setStep('email')} />
        </>
      )}
      {!!msg && <OkMsg msg={msg} />}
      {!!err && <ErrorBox message={err} />}
      <GhostButton title="Quay lai dang nhap" onPress={onBack} />
    </View>
  );
}

/* ---------------- Khung AuthCard ---------------- */

const TABS: { key: AuthMode; label: string }[] = [
  { key: 'login', label: 'Dang nhap' },
  { key: 'register', label: 'Dang ky' },
];

export function AuthCard({ mode, onMode, navigation }: {
  mode: AuthMode;
  onMode: (m: AuthMode) => void;
  navigation: any;
}) {
  const C = useThemeColors();
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');

  const go = (m: AuthMode) => { setNotice(''); onMode(m); };

  return (
    <Card>
      <Title>{mode === 'forgot' ? 'Quen mat khau' : mode === 'register' ? 'Tao tai khoan moi' : 'Chao mung tro lai'}</Title>
      {mode !== 'forgot' && (
        <View style={[s.tabs, { backgroundColor: C.raised, borderColor: C.borderSoft }]}>
          {TABS.map((tb) => (
            <Pressable
              key={tb.key}
              onPress={() => go(tb.key)}
              style={[s.tab, mode === tb.key && { backgroundColor: C.surface }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === tb.key }}
            >
              <Text style={[s.tabText, { color: mode === tb.key ? C.primary : C.muted }]}>{tb.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {mode === 'login' && (
        <LoginForm
          email={email}
          setEmail={setEmail}
          notice={notice}
          onSuccess={() => navigation.replace('Problems')}
          onForgot={() => go('forgot')}
          onRegister={() => go('register')}
        />
      )}
      {mode === 'register' && (
        <RegisterForm
          email={email}
          setEmail={setEmail}
          onLogin={() => go('login')}
          onDone={(em) => {
            setEmail(em);
            setNotice('Dang ky thanh cong, vui long dang nhap.');
            onMode('login');
          }}
        />
      )}
      {mode === 'forgot' && (
        <ForgotForm email={email} setEmail={setEmail} onBack={() => go('login')} />
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 4, gap: 4 },
  tab: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontWeight: '800', fontSize: t.body },
  otp: { textAlign: 'center', fontSize: 24, fontWeight: '700', letterSpacing: 6 },
  ok: { borderWidth: 1, borderColor: '#9ed9bb', borderRadius: 10, backgroundColor: '#e2f5ec', padding: spacing.md },
  okText: { fontSize: 13, fontWeight: '600' },
});
