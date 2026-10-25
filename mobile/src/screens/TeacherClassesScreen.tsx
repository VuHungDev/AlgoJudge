import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, GhostButton, EmptyState, Pagination, type PageMeta } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';

interface Clazz { id: number; name: string; members_count?: number }

export default function TeacherClassesScreen({ navigation }: any) {
  const { confirm } = useConfirm();
  const toast = useToast();
  const [classes, setClasses] = useState<Clazz[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [className, setClassName] = useState('');
  const [editId, setEditId] = useState('');

  const loadClasses = async (page = 1) => {
    try {
      const r = await api(`/admin/classes?page=${page}&per_page=10`);
      setClasses(r.classes || []);
      setMeta(r.meta || null);
    } catch (e: unknown) { toast.error('Lỗi tải lớp', e instanceof Error ? e.message : String(e)); }
  };

  useEffect(() => { loadClasses(1); }, []);

  const createClass = async () => {
    if (!className.trim()) { toast.warning('Nhập tên lớp.'); return; }
    try {
      await api('/admin/classes', {
        method: 'POST',
        body: JSON.stringify({ name: className.trim() })
      });
      toast.success('Đã tạo lớp', className.trim());
      setClassName('');
      loadClasses(1);
    } catch (e: unknown) { toast.error('Tạo lớp thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const updateClass = async () => {
    if (!editId.trim() || !className.trim()) { toast.warning('Nhập class_id và tên mới.'); return; }
    try {
      await api(`/admin/classes/${editId.trim()}`, {
        method: 'PUT',
        body: JSON.stringify({ name: className.trim() })
      });
      toast.success('Đã cập nhật', `Lớp #${editId.trim()}`);
      setEditId('');
      setClassName('');
      loadClasses(meta?.page || 1);
    } catch (e: unknown) { toast.error('Cập nhật thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const deleteClass = async (cid: number) => {
    const ok = await confirm({ title: 'Xóa lớp', message: `Xóa lớp #${cid} cùng toàn bộ thành viên?`, danger: true });
    if (!ok) return;
    try {
      await api(`/admin/classes/${cid}`, { method: 'DELETE' });
      toast.success('Đã xóa', `Lớp #${cid}`);
      loadClasses(1);
    } catch (e: unknown) { toast.error('Xóa thất bại', e instanceof Error ? e.message : String(e)); }
  };

  return (
    <Screen>
      <Hero kicker="LỚP HỌC" title="Quản lý lớp" sub="Tạo, sửa, xóa lớp học." />

      <Card>
        <SectionTitle>Tạo lớp mới</SectionTitle>
        <Field label="Tên lớp, VD: 10A1 - Tin học">
          <AppInput value={className} onChangeText={setClassName} />
        </Field>
        <PrimaryButton title="Tạo lớp" onPress={createClass} />
      </Card>

      <Card>
        <SectionTitle>Sửa tên lớp</SectionTitle>
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Field label="class_id">
              <AppInput value={editId} onChangeText={setEditId} keyboardType="numeric" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Tên mới">
              <AppInput value={className} onChangeText={setClassName} />
            </Field>
          </View>
        </View>
        <PrimaryButton title="Cập nhật" onPress={updateClass} />
      </Card>

      <Card>
        <SectionTitle>Lớp học của bạn ({meta ? `${meta.total} lớp` : ''})</SectionTitle>
        <Muted>Bấm Chi tiết để quản lý thành viên và tiến độ.</Muted>
        {classes.map((c) => (
          <View key={c.id} style={s.classRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.className}>#{c.id} {c.name}</Text>
              <Text style={s.classMeta}>👥 {c.members_count ?? 0} thành viên</Text>
            </View>
            <GhostButton title="Chi tiết" onPress={() => navigation.navigate('TeacherClassDetail', { id: c.id })} />
            <GhostButton title="Xóa" onPress={() => deleteClass(c.id)} />
          </View>
        ))}
        {classes.length === 0 && <EmptyState title="Chưa có lớp nào" hint="Tạo lớp đầu tiên ở trên." />}
        <Pagination meta={meta} onPage={loadClasses} />
      </Card>

    </Screen>
  );
}

const s = StyleSheet.create({
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: spacing.sm
  },
  className: { color: colors.text, fontWeight: '700', fontSize: 15 },
  classMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
