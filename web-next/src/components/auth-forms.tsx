'use client';

// Khung xac thuc dung chung: 3 che do login / register / forgot.
// Dang nhap xong -> vao thang Home. Dang ky xong -> chuyen sang login (KHONG tu login).
// Quen mat khau giu nguyen luong OTP hien tai, chi hien trong khung.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, checkPassword, validEmail } from '@/lib/api';
import { Btn, ErrorBox, Field, Input, PasswordInput } from '@/components/ui';
import { useToast } from '@/components/feedback';

export type AuthMode = 'login' | 'register' | 'forgot';

function FieldErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1 flex items-start gap-1 text-xs font-semibold text-danger">
      <span aria-hidden>⚠</span>{msg}
    </p>
  );
}

function OkMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-3 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">{msg}</p>;
}

export function LoginForm({ email, setEmail, notice, onForgot, onRegister }: {
  email: string;
  setEmail: (v: string) => void;
  notice?: string;
  onForgot: () => void;
  onRegister: () => void;
}) {
  const { login } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [pass, setPass] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const eErr = validEmail(email) ? '' : 'Email chưa đúng định dạng (VD: ban@truong.edu.vn).';
    const pErr = pass ? '' : 'Vui lòng nhập mật khẩu.';
    setEmailErr(eErr); setPassErr(pErr); setFormErr('');
    if (eErr || pErr) return;
    setBusy(true);
    try {
      await login(email, pass);
      toast.success('Đăng nhập thành công', `Chào mừng trở lại, ${email.trim().split('@')[0]}!`);
      router.replace('/');
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-fade grid gap-3">
      <Field label="Email">
        <Input
          placeholder="ban@truong.edu.vn"
          autoComplete="username"
          value={email}
          aria-invalid={!!emailErr || undefined}
          onChange={(e) => { setEmail(e.target.value); setEmailErr(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
        />
        <FieldErr msg={emailErr} />
      </Field>
      <Field label="Mật khẩu">
        <PasswordInput
          placeholder="••••••••"
          autoComplete="current-password"
          value={pass}
          aria-invalid={!!passErr || undefined}
          onChange={(e) => { setPass(e.target.value); setPassErr(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
        />
        <FieldErr msg={passErr} />
      </Field>
      <div className="flex justify-end">
        <button type="button" className="studio-muted text-sm font-semibold hover:text-primary" onClick={onForgot}>Quên mật khẩu?</button>
      </div>
      <OkMsg msg={notice} />
      {formErr && <ErrorBox message={formErr} />}
      <Btn variant="primary" onClick={submit} loading={busy}>Đăng nhập</Btn>
      <p className="studio-muted text-center text-sm">
        Chưa có tài khoản?{' '}
        <button type="button" className="font-bold text-primary hover:underline" onClick={onRegister}>Đăng ký</button>
      </p>
    </div>
  );
}

export function RegisterForm({ email, setEmail, onDone, onLogin }: {
  email: string;
  setEmail: (v: string) => void;
  onDone: (email: string) => void;
  onLogin: () => void;
}) {
  const { register, logout } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [errs, setErrs] = useState<{ name?: string; email?: string; pass?: string; pass2?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e: typeof errs = {};
    if (!validEmail(email)) e.email = 'Email chưa đúng định dạng (VD: ban@truong.edu.vn).';
    const pwErr = checkPassword(pass);
    if (pwErr) e.pass = pwErr;
    if (pass2 !== pass) e.pass2 = 'Mật khẩu xác nhận phải trùng khớp.';
    if (name.trim().length > 100) e.name = 'Họ tên tối đa 100 ký tự.';
    setErrs(e);
    if (Object.keys(e).length > 0) return;
    setBusy(true);
    try {
      await register(email, pass, name.trim());
      logout();
      toast.success('Đã tạo tài khoản', 'Vui lòng đăng nhập bằng mật khẩu vừa tạo.');
      onDone(email.trim());
    } catch (err: unknown) {
      setErrs({ form: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const clearErr = (k: keyof typeof errs) => setErrs((s) => ({ ...s, [k]: undefined }));

  return (
    <div className="auth-fade grid gap-3">
      <Field label="Họ tên (hiển thị trên bảng xếp hạng)">
        <Input placeholder="VD: Nguyễn Văn A" value={name} maxLength={100} onChange={(e) => { setName(e.target.value); clearErr('name'); }} />
        <FieldErr msg={errs.name} />
      </Field>
      <Field label="Email">
        <Input placeholder="ban@truong.edu.vn" autoComplete="username" value={email} aria-invalid={!!errs.email || undefined} onChange={(e) => { setEmail(e.target.value); clearErr('email'); }} />
        <FieldErr msg={errs.email} />
      </Field>
      <Field label="Mật khẩu">
        <PasswordInput placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" value={pass} aria-invalid={!!errs.pass || undefined} onChange={(e) => { setPass(e.target.value); clearErr('pass'); }} />
        <FieldErr msg={errs.pass} />
      </Field>
      <Field label="Xác nhận mật khẩu">
        <PasswordInput placeholder="Nhập lại mật khẩu" autoComplete="new-password" value={pass2} aria-invalid={!!errs.pass2 || undefined} onChange={(e) => { setPass2(e.target.value); clearErr('pass2'); }}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} />
        <FieldErr msg={errs.pass2} />
      </Field>
      <p className="studio-muted text-xs">Mật khẩu trên 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
      {errs.form && <ErrorBox message={errs.form} />}
      <Btn variant="primary" onClick={submit} loading={busy}>Đăng ký</Btn>
      <p className="studio-muted text-center text-sm">
        Đã có tài khoản?{' '}
        <button type="button" className="font-bold text-primary hover:underline" onClick={onLogin}>Đăng nhập</button>
      </p>
    </div>
  );
}

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
  const [busy, setBusy] = useState<'' | 'send' | 'reset'>('');
  const [cooldown, setCooldown] = useState(0);

  const sendOtp = async () => {
    if (!validEmail(email)) { setErr('Email chưa đúng định dạng.'); return; }
    setBusy('send'); setErr(''); setMsg('');
    try {
      await api('/auth/forgot', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      setStep('otp');
      setMsg(`Đã gửi mã OTP tới ${email.trim()} (người gửi: AlgoJudge). Mã hiệu lực 10 phút.`);
      setCooldown(60);
      const t = setInterval(() => setCooldown((c) => {
        if (c <= 1) { clearInterval(t); return 0; }
        return c - 1;
      }), 1000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  };

  const doReset = async () => {
    if (pw !== pw2) { setErr('Mật khẩu xác nhận phải trùng khớp.'); return; }
    const pwErr = checkPassword(pw);
    if (pwErr) { setErr(pwErr); return; }
    setBusy('reset'); setErr(''); setMsg('');
    try {
      await api('/auth/reset', { method: 'POST', body: JSON.stringify({ email: email.trim(), otp: otp.trim(), password: pw }) });
      setMsg('Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.');
      setOtp(''); setPw(''); setPw2('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  };

  return (
    <div className="auth-fade grid gap-3">
      {step === 'email' ? (
        <>
          <Field label="Email tài khoản">
            <Input placeholder="ban@truong.edu.vn" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void sendOtp(); }} />
          </Field>
          <Btn variant="primary" onClick={sendOtp} loading={busy === 'send'} disabled={!email.trim()}>
            Gửi mã OTP qua email
          </Btn>
        </>
      ) : (
        <>
          <Field label="Mã OTP 6 số (từ email AlgoJudge)">
            <Input placeholder="123456" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={otp} onChange={(e) => setOtp(e.target.value)}
              className="text-center text-2xl font-black tracking-[.3em]" />
          </Field>
          <Field label="Mật khẩu mới">
            <PasswordInput placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <Field label="Xác nhận mật khẩu mới">
            <PasswordInput placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void doReset(); }} />
          </Field>
          <Btn variant="primary" onClick={doReset} loading={busy === 'reset'} disabled={!otp.trim() || !pw}>Đặt lại mật khẩu</Btn>
          <Btn variant="ghost" onClick={sendOtp} loading={busy === 'send'} disabled={cooldown > 0}>
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã OTP'}
          </Btn>
          <button type="button" className="studio-muted text-center text-sm hover:text-primary" onClick={() => { setStep('email'); setErr(''); setMsg(''); }}>Đổi email khác</button>
        </>
      )}
      <OkMsg msg={msg} />
      {err && <ErrorBox message={err} />}
      <button type="button" className="mt-1 text-center text-sm font-bold text-primary hover:underline" onClick={onBack}>Quay lại đăng nhập</button>
    </div>
  );
}

const TABS: { key: AuthMode; label: string }[] = [
  { key: 'login', label: 'Đăng nhập' },
  { key: 'register', label: 'Đăng ký' },
];

export function AuthCard({ mode, onMode }: { mode: AuthMode; onMode: (m: AuthMode) => void }) {
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');

  const go = (m: AuthMode) => { setNotice(''); onMode(m); };

  return (
    <div className="auth-card-inner">
      {mode !== 'forgot' && (
        <div className="auth-tabs" role="tablist" aria-label="Chọn chế độ xác thực">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={mode === t.key}
              className={`auth-tab${mode === t.key ? ' auth-tab-active' : ''}`}
              onClick={() => go(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {mode === 'login' && (
        <LoginForm
          email={email}
          setEmail={setEmail}
          notice={notice}
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
            setNotice('Đăng ký thành công. Vui lòng đăng nhập.');
            onMode('login');
          }}
        />
      )}
      {mode === 'forgot' && (
        <ForgotForm email={email} setEmail={setEmail} onBack={() => go('login')} />
      )}
    </div>
  );
}
