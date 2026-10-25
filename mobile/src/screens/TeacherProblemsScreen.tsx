import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { api } from '../api';
import { spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, GhostButton, Chip } from '../components/ui';
import { useConfirm, useToast } from '../components/feedback';

const CHECKERS = [
  { id: 'exact', label: 'Khớp chính xác' },
  { id: 'float', label: 'Sai số thực' },
  { id: 'sorted', label: 'Kệ thứ tự dòng' },
  { id: 'tokens', label: 'Kệ thứ tự từ' },
  { id: 'regex', label: 'Regex tự đặt' },
];

export default function TeacherProblemsScreen() {
  const { confirm } = useConfirm();
  const toast = useToast();
  const [pid, setPid] = useState('1');
  const [checker, setChecker] = useState('exact');
  const [checkerCfg, setCheckerCfg] = useState('/^\\d+ \\d+$/');
  const [cases, setCases] = useState('[{"input":"2 3","expected":"5","is_public":1,"group":"co-ban","weight":1}]');
  const [newSlug, setNewSlug] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newStatement, setNewStatement] = useState('');
  const [updateStatement, setUpdateStatement] = useState('');

  const mkts = async () => {
    try {
      const r = await api(`/admin/problems/${pid}/testsets`, {
        method: 'POST',
        body: JSON.stringify({ checker, checker_config: checker === 'regex' ? checkerCfg : undefined, cases: JSON.parse(cases) }),
      });
      const count = (r as { cases?: unknown[] })?.cases?.length;
      toast.success('Đã tạo testset', count ? `${count} ca cho bài #${pid}` : `Bài #${pid}`);
    } catch (e: unknown) { toast.error('Tạo testset thất bại', e instanceof Error ? e.message : String(e)); }
  };

  return (
    <Screen>
      <Hero kicker="ĐỀ THI" title="Tạo đề & testset" sub="Quản lý bài tập, dựng testset với checker tùy chỉnh." />

      <Card>
        <SectionTitle>Tạo bài tập mới</SectionTitle>
        <Muted>Slug duy nhất, VD: tong-hai-so. Tạo xong mới dựng testset ở khung dưới.</Muted>
        <Field label="slug"><AppInput value={newSlug} onChangeText={setNewSlug} autoCapitalize="none" placeholder="vd: tong-hai-so" /></Field>
        <Field label="Tiêu đề"><AppInput value={newTitle} onChangeText={setNewTitle} placeholder="VD: Tổng hai số" /></Field>
        <Field label="Chủ đề"><AppInput value={newTopic} onChangeText={setNewTopic} placeholder="VD: co-ban" /></Field>
        <Field label="Đề bài"><AppInput multiline value={newStatement} onChangeText={setNewStatement} style={s.mono} /></Field>
        <PrimaryButton title="Tạo bài" onPress={async () => {
          if (!newSlug.trim() || !newTitle.trim()) { toast.warning('Nhập slug và tiêu đề.'); return; }
          try {
            const r = await api('/admin/problems', {
              method: 'POST',
              body: JSON.stringify({ slug: newSlug.trim(), title: newTitle.trim(), topic: newTopic.trim() || 'general', statement: newStatement }),
            });
            const newId = (r as { problem_id: number }).problem_id;
            toast.success('Đã tạo bài', `${newTitle.trim()} (#${newId})`);
            setPid(String(newId || ''));
            setNewSlug(''); setNewTitle(''); setNewTopic(''); setNewStatement('');
          } catch (e: unknown) { toast.error('Tạo bài thất bại', e instanceof Error ? e.message : String(e)); }
        }} />
      </Card>

      <Card>
        <SectionTitle>Lưu phiên bản đề mới #{pid || '—'}</SectionTitle>
        <Muted>Sửa đề tạo version mới, giữ nguyên lịch sử chấm cũ.</Muted>
        <Field label="Nội dung đề mới"><AppInput multiline value={updateStatement} onChangeText={setUpdateStatement} style={s.mono} /></Field>
        <PrimaryButton title="Lưu phiên bản mới" onPress={async () => {
          if (!pid.trim()) { toast.warning('Nhập problem_id trước.'); return; }
          try {
            await api(`/admin/problems/${pid}`, { method: 'PUT', body: JSON.stringify({ statement: updateStatement }) });
            toast.success('Đã lưu phiên bản mới', `Bài #${pid}`);
          } catch (e: unknown) { toast.error('Lưu thất bại', e instanceof Error ? e.message : String(e)); }
        }} />
      </Card>

      <Card>
        <SectionTitle>Tạo testset (≥ 5 ca)</SectionTitle>
        <Field label="problem_id"><AppInput value={pid} onChangeText={setPid} keyboardType="numeric" /></Field>
        <View style={s.checkerRow}>
          {CHECKERS.map((c) => <Chip key={c.id} label={c.label} active={checker === c.id} onPress={() => setChecker(c.id)} />)}
        </View>
        {checker === 'regex' && <Field label="Mẫu regex"><AppInput value={checkerCfg} onChangeText={setCheckerCfg} autoCapitalize="none" /></Field>}
        <Field label="cases JSON"><AppInput multiline value={cases} onChangeText={setCases} style={s.mono} /></Field>
        <PrimaryButton title="Tạo testset" onPress={mkts} />
      </Card>

      <Card>
        <SectionTitle>Xóa bài tập</SectionTitle>
        <Muted>Xóa bài cùng toàn bộ testset và bài nộp liên quan. Không thể hoàn tác.</Muted>
        <Field label="problem_id"><AppInput value={pid} onChangeText={setPid} keyboardType="numeric" /></Field>
        <GhostButton title={`Xóa bài tập #${pid || '—'}`} onPress={async () => {
          if (!pid.trim()) { toast.warning('Nhập problem_id trước.'); return; }
          const ok = await confirm({ title: 'Xóa bài tập', message: `Xóa bài #${pid} cùng toàn bộ testset và bài nộp?`, danger: true });
          if (!ok) return;
          try {
            await api(`/admin/problems/${pid}`, { method: 'DELETE' });
            toast.success('Đã xóa', `Bài tập #${pid}`);
          } catch (e: unknown) { toast.error('Xóa thất bại', e instanceof Error ? e.message : String(e)); }
        }} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  checkerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mono: { minHeight: 110, fontFamily: 'monospace', fontSize: 12, textAlignVertical: 'top' },
});
