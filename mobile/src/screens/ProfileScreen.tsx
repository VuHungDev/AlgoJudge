import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import { api, setToken } from '../api';

// Ho so: /me + dang xuat (xoa token SecureStore).
export default function ProfileScreen({ navigation }: any) {
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    api('/me').then(setMe).catch(() => {});
  }, []);

  const logout = async () => {
    await setToken('');
    navigation.replace('Login');
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Hồ sơ</Text>
      {me ? <Text>{JSON.stringify(me)}</Text> : <Text>Đang tải...</Text>}
      <View style={{ marginTop: 16 }}>
        <Button title="Đăng xuất" onPress={logout} />
      </View>
    </ScrollView>
  );
}
