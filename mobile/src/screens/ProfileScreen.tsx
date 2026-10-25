import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api, setToken, unregisterPushToken } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, GhostButton, RoleBadge, StatRow, ErrorBox, PasswordField, ThemeToggle } from '../components/ui';

export default function ProfileScreen({ navigation }: any) {
  const [me, setMe] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [name, setName] = useState('');
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/me').then((m) => { setMe(m); setName(m.display_name || ''); }).catch(() => {});
    api('/me/progress').catch(() => null).then(setProgress);
  }, []);

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const payload: Record<string, string> = {};
      if (name.trim()) payload.display_name = name.trim();
      if (pw) { payload.password = pw; payload.current_password = cur; }
      if (Object.keys(payload).length === 0) { setErr('Chưa có gì để lưu.'); return; }
      const r = await api('/me', { method: 'PUT', body: JSON.stringify(payload) });
      setMe({ ...me, display_name: r.display_name });
      setMsg('Đã lưu hồ sơ.');
      setCur(''); setPw('');
    } catch (e: any) { setErr(String(e.message || e).slice(0, 220)); }
    finally { setSaving(false); }
  };

  const logout = async () => {
    setBusy(true);
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      await unregisterPushToken(token.data);
    } catch {}
    await setToken('');
    navigation.replace('Welcome');
  };

  const disableNotifications = async () => {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      await unregisterPushToken(token.data);
      setNotificationMessage('Đã tắt thông báo trên thiết bị này.');
    } catch (e: any) { setNotificationMessage(String(e.message || e)); }
  };

  return (
    <Screen>
      <Hero kicker="ACCOUNT" title="Hồ sơ cá nhân" sub="Xem và chỉnh sửa thông tin tài khoản của bạn." />
      <Card style={s.idCard}>
        <View style={s.avatar}><Text style={s.avatarText}>{((me?.display_name || me?.email || 'A')[0] || 'A').toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.email}>{me?.display_name || me?.email || 'Đang tải…'}</Text>
          {me ? <Muted>{me.email} · ID #{me.id}</Muted> : null}
        </View>
        {me ? <RoleBadge role={me.role} /> : null}
      </Card>
      {progress ? (
        <StatRow stats={[
          { label: 'ĐÃ GIẢI', value: `${progress.solved}/${progress.total}`, accent: colors.primary },
          { label: 'TÀI KHOẢN', value: me?.role || '—', accent: colors.info },
        ]} />
      ) : null}
      <Card>
        <SectionTitle>Chỉnh sửa hồ sơ</SectionTitle>
        <Field label="Tên hiển thị"><AppInput value={name} onChangeText={setName} placeholder="VD: Nguyễn Văn A" /></Field>
        {me?.role === 'admin' ? (
          <Muted>Tài khoản vận hành — đổi mật khẩu qua quản trị hệ thống, không dùng OTP tại đây.</Muted>
        ) : (
          <>
            <Field label="Mật khẩu hiện tại (khi đổi mật khẩu)"><PasswordField value={cur} onChangeText={setCur} placeholder="••••••••" /></Field>
            <Field label="Mật khẩu mới (bỏ trống nếu không đổi)"><PasswordField value={pw} onChangeText={setPw} placeholder="••••••••" /></Field>
          </>
        )}
        {!!msg && <View style={s.ok}><Text style={s.okText}>{msg}</Text></View>}
        {!!err && <ErrorBox message={err} />}
        <PrimaryButton title={saving ? 'Đang lưu…' : 'Lưu thay đổi'} onPress={save} disabled={saving} />
        {me?.role !== 'admin' && (
          <GhostButton title="Quên mật khẩu? Về welcome để đặt lại OTP" onPress={() => navigation.replace('Welcome')} />
        )}
      </Card>
      <Card>
        <SectionTitle>Giao diện</SectionTitle>
        <Muted>Chuyển giữa nền tối và nền sáng.</Muted>
        <ThemeToggle />
      </Card>
      <Card>
        <SectionTitle>Thông báo</SectionTitle>
        <PrimaryButton title="Tắt thông báo trên thiết bị" onPress={disableNotifications} />
        {notificationMessage ? <Muted>{notificationMessage}</Muted> : null}
      </Card>
      <GhostButton title={busy ? 'Đang thoát…' : 'Đăng xuất'} onPress={logout} disabled={busy} />
      <View style={s.danger}>
        <Text style={s.dangerText}>Đăng xuất sẽ gỡ push token khỏi thiết bị này.</Text>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  idCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontWeight: '700', fontSize: 24 },
  email: { color: colors.text, fontWeight: '700', fontSize: 17 },
  ok: { borderWidth: 1, borderColor: '#14532d', borderRadius: 12, backgroundColor: '#0c2b21', padding: spacing.md },
  okText: { color: colors.success, fontSize: 13 },
  danger: { alignItems: 'center' },
  dangerText: { color: colors.dim, fontSize: 12 },
});


