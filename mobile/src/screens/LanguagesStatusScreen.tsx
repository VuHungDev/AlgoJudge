import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, ErrorBox, LoadingBlock, GhostButton } from '../components/ui';

interface Lang {
  id: number; name: string; key?: string; source_file: string;
  compile_cmd?: string | null; run_cmd: string;
  version?: string; stdlib?: string; packages?: string;
}

const LANG_COLOR: Record<string, string> = {
  python: '#3776ab', cpp: '#00599c', js: '#f7df1e',
  java: '#ed8b00', go: '#00add8', c: '#a8b9cc', php: '#777bb4',
};

export default function LanguagesStatusScreen() {
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api('/languages');
      setLanguages(r.languages || []);
      setError('');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <Screen>
      <Hero kicker="MÔI TRƯỜNG CHẤM" title="Ngôn ngữ & thư viện" sub="Thông tin chi tiết về 7 ngôn ngữ được hỗ trợ, phiên bản và thư viện có sẵn." />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading ? <LoadingBlock hint="Đang tải danh mục…" /> : null}

      {languages.map((lang) => {
        const color = LANG_COLOR[lang.key ?? ''] ?? colors.primary;
        const open = expanded === lang.id;
        return (
          <Card key={lang.id}>
            <View style={s.header}>
              <View style={[s.dot, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{lang.name}</Text>
                {lang.version ? <Muted>{lang.version}</Muted> : null}
              </View>
              <GhostButton title={open ? '▲ Thu gọn' : '▼ Chi tiết'} onPress={() => setExpanded(open ? null : lang.id)} />
            </View>

            <View style={s.row}>
              <Muted>File: </Muted>
              <Text style={s.code}>{lang.source_file}</Text>
            </View>
            {lang.compile_cmd ? (
              <View style={s.row}>
                <Muted>Biên dịch: </Muted>
                <Text style={s.code} numberOfLines={open ? undefined : 1}>{lang.compile_cmd}</Text>
              </View>
            ) : (
              <View style={s.row}>
                <Muted>Thông dịch trực tiếp (không cần biên dịch)</Muted>
              </View>
            )}
            <View style={s.row}>
              <Muted>Chạy: </Muted>
              <Text style={s.code}>{lang.run_cmd}</Text>
            </View>

            {open && (
              <>
                {lang.stdlib ? (
                  <View style={s.section}>
                    <Text style={s.label}>Thư viện chuẩn / built-in:</Text>
                    <Text style={s.detail}>{lang.stdlib}</Text>
                  </View>
                ) : null}
                {lang.packages ? (
                  <View style={s.section}>
                    <Text style={s.label}>Ghi chú gói ngoài:</Text>
                    <Text style={s.detail}>{lang.packages}</Text>
                  </View>
                ) : null}
              </>
            )}
          </Card>
        );
      })}

      <GhostButton title={loading ? 'Đang tải…' : '🔄 Làm mới'} onPress={load} disabled={loading} />
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  dot: { width: 14, height: 14, borderRadius: 7 },
  name: { color: colors.text, fontWeight: '800', fontSize: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  code: { color: colors.primary, fontFamily: 'monospace', fontSize: 12, flex: 1, flexWrap: 'wrap' },
  section: { marginTop: spacing.sm, backgroundColor: colors.surfaceRaised, borderRadius: 8, padding: spacing.sm },
  label: { color: colors.muted, fontWeight: '700', fontSize: 12, marginBottom: 4 },
  detail: { color: colors.text, fontSize: 12, lineHeight: 18 },
});
