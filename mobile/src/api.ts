// Client API dung chung, port tu App.js cu: fetch + Bearer + Idempotency-Key.
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

declare const process: { env: Record<string, string | undefined> };
const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8081/api/v1';

export async function getToken(): Promise<string> {
  return (await SecureStore.getItemAsync('oj_token')) || '';
}

export async function setToken(t: string) {
  if (t) await SecureStore.setItemAsync('oj_token', t);
  else await SecureStore.deleteItemAsync('oj_token');
}

export async function registerPushToken(): Promise<void> {
  try {
    const readStatus = (r: unknown): string => String((r as { status?: unknown })?.status ?? '');
    let status = readStatus(await Notifications.getPermissionsAsync());
    if (status !== 'granted') {
      status = readStatus(await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await api('/me/device-token', {
      method: 'POST',
      body: JSON.stringify({ expo_token: token, platform: 'android' }),
    });
  } catch {
    // Push is optional during Expo Go/local development.
  }
}


export async function api(path: string, opts: RequestInit = {}): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const r = await fetch(API + path, { ...opts, headers });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}



// RN khong co EventSource nen polling /submissions/{id} moi 2s toi khi co verdict.
export async function pollSubmission(
  id: number,
  onUpdate: (s: any) => void,
  timeoutMs = 90000,
): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = await api(`/submissions/${id}`);
    onUpdate(s);
    if (s.verdict || (s.status && s.status !== 'QUEUED' && s.status !== 'RUNNING')) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
}
