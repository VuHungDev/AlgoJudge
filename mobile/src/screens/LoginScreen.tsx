import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { api, setToken } from '../api';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  const go = async (path: string) => {
    try {
      const r = await api(path, {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });
      await setToken(r.token || '');
      navigation.replace('Problems');
    } catch (e: any) {
      setErr(String(e.message || e).slice(0, 200));
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>AlgoJudge</Text>
      <TextInput placeholder="email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, marginTop: 8 }} autoCapitalize="none" />
      <TextInput placeholder="mật khẩu" secureTextEntry value={pass} onChangeText={setPass} style={{ borderWidth: 1, marginTop: 8 }} />
      <Button title="Đăng nhập" onPress={() => go('/auth/login')} />
      <Button title="Đăng ký" onPress={() => go('/auth/register')} />
      {err ? <Text style={{ color: 'red' }}>{err}</Text> : null}
    </View>
  );
}
