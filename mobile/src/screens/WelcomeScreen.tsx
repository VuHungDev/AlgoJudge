import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme';
import { useThemeColors } from '../theme-context';
import { Screen } from '../components/ui';
import { AuthCard, type AuthMode } from '../components/auth-forms';

// Diem vao dau tien cua app: logo o tren + khung xac thuc nam giua.
// Da login (phien hop le) -> App dua thang vao Problems, bo qua man hinh nay.
// Dang xuat -> navigation.replace('Welcome') quay ve day.

export default function WelcomeScreen({ navigation }: any) {
  const C = useThemeColors();
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <Screen>
      <View style={s.brand}>
        <View style={s.mark}><Text style={s.markText}>AJ</Text></View>
        <Text style={[s.title, { color: C.text }]}>Chao mung ban den voi AlgoJudge</Text>
        <Text style={[s.sub, { color: C.muted }]}>Luyen thi lap trinh — nop bai, cham tu dong, theo doi tien do theo lop.</Text>
      </View>
      <AuthCard mode={mode} onMode={setMode} navigation={navigation} />
    </Screen>
  );
}

const s = StyleSheet.create({
  brand: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  mark: { width: 72, height: 72, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#e07b1a', fontWeight: '700', fontSize: 26 },
  title: { fontWeight: '800', fontSize: 20, textAlign: 'center' },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
