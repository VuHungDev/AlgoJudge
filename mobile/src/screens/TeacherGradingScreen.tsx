import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, AccentButton, GhostButton } from '../components/ui';
import { useToast } from '../components/feedback';

export default function TeacherGradingScreen() {
  const toast = useToast();
  const [assignPid, setAssignPid] = useState('');
  const [assignCid, setAssignCid] = useState('');
  const [assignEmail, setAssignEmail] = useState('');
  const [assignDue, setAssignDue] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [sid, setSid] = useState('');
  const [ra, setRa] = useState('');
  const [rb, setRb] = useState('');
  const [sa, setSa] = useState('');
  const [sb, setSb] = useState('');
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [reviewSid, setReviewSid] = useState('');
  const [reviewScore, setReviewScore] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewInfo, setReviewInfo] = useState('');

  const checkSimilarity = async () => {
    if (!sa.trim() || !sb.trim()) { toast.warning('Nhập id hai bài nộp.'); return; }
    try {
      const r = await api(`/admin/submissions/${sa}/similarity/${sb}`);
      const val = typeof r.similarity === 'number' ? r.similarity : null;
      setSimilarity(val);
      if (val === null) toast.info('Không có dữ liệu tương tự');
      else toast.success('Đã so sánh', `${(val * 100).toFixed(1)}% tương tự`);
    } catch (e: unknown) { toast.error('So sánh thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const rejudge = async () => {
    if (!sid.trim()) { toast.warning('Nhập submission_id.'); return; }
    try {
      await api(`/admin/submissions/${sid}/rejudge`, { method: 'POST' });
      toast.success('Đã đưa vào chấm lại', `Bài nộp #${sid}`);
    } catch (e: unknown) { toast.error('Chấm lại thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const compareRuns = async () => {
    if (!sid.trim()) { toast.warning('Nhập submission_id.'); return; }
    if (!ra.trim() || !rb.trim()) { toast.warning('Nhập id hai run.'); return; }
    try {
      const r = await api(`/admin/submissions/${sid}/compare?a=${ra}&b=${rb}`);
      const same = r?.equal ?? r?.same;
      toast.info('Kết quả đối chiếu', same === true ? 'Hai run giống nhau' : same === false ? 'Hai run khác nhau' : `Run ${ra} ↔ ${rb}`);
    } catch (e: unknown) { toast.error('Đối chiếu thất bại', e instanceof Error ? e.message : String(e)); }
  };

  return (
    <Screen>
      <Hero kicker="GIAO BÀI & CHẤM" title="Giao bài & chấm điểm" sub="Giao bài tập, chấm lại, so sánh run, phát hiện đạo văn và chấm tay." />

      <Card>
        <SectionTitle>Giao bài tập</SectionTitle>
        <Muted>Giao bài cá nhân hoặc cả lớp, kèm hạn nộp.</Muted>
        <Field label="problem_id (mã bài tập)"><AppInput value={assignPid} onChangeText={setAssignPid} keyboardType="numeric" /></Field>
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}><Field label="class_id (cả lớp)"><AppInput value={assignCid} onChangeText={setAssignCid} keyboardType="numeric" /></Field></View>
          <View style={{ flex: 1 }}><Field label="email (cá nhân)"><AppInput value={assignEmail} onChangeText={setAssignEmail} autoCapitalize="none" keyboardType="email-address" /></Field></View>
        </View>
        <Field label="Hạn nộp (YYYY-MM-DD HH:mm:ss, tùy chọn)"><AppInput value={assignDue} onChangeText={setAssignDue} placeholder="2026-12-31 23:59:59" /></Field>
        <Field label="Ghi chú"><AppInput value={assignNote} onChangeText={setAssignNote} placeholder="VD: làm trước thứ 6" /></Field>
        <PrimaryButton title="Giao bài" onPress={async () => {
          if (!assignPid.trim()) { toast.warning('Nhập problem_id.'); return; }
          try {
            const body: Record<string, unknown> = { problem_id: Number(assignPid) };
            if (assignCid.trim()) body.class_id = Number(assignCid);
            if (assignEmail.trim()) {
              const u = await api(`/users/lookup?email=${encodeURIComponent(assignEmail.trim())}`);
              body.user_id = u.id;
            }
            if (!body.class_id && !body.user_id) { toast.warning('Nhập class_id hoặc email học sinh.'); return; }
            if (assignDue.trim()) body.due_at = assignDue.trim();
            if (assignNote.trim()) body.note = assignNote.trim();
            await api('/admin/assignments', { method: 'POST', body: JSON.stringify(body) });
            toast.success('Đã giao bài', `Bài #${assignPid}${body.class_id ? ` cho lớp #${body.class_id}` : ''}${body.user_id ? ` cho user #${body.user_id}` : ''}`);
            setAssignEmail(''); setAssignNote('');
          } catch (e: unknown) { toast.error('Giao bài thất bại', e instanceof Error ? e.message : String(e)); }
        }} />
      </Card>

      <Card>
        <SectionTitle>Chấm điểm & nhận xét</SectionTitle>
        <Muted>Điểm tay 0–100 + nhận xét trên bài nộp của học sinh.</Muted>
        <Field label="submission_id"><AppInput value={reviewSid} onChangeText={setReviewSid} keyboardType="numeric" /></Field>
        <Field label="Điểm 0–100"><AppInput value={reviewScore} onChangeText={setReviewScore} keyboardType="numeric" placeholder="VD: 90" /></Field>
        <Field label="Nhận xét"><AppInput value={reviewComment} onChangeText={setReviewComment} placeholder="VD: trình bày tốt" /></Field>
        {!!reviewInfo && <Muted>{reviewInfo}</Muted>}
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}><PrimaryButton title="Lưu chấm điểm" onPress={async () => {
            if (!reviewSid.trim()) { toast.warning('Nhập submission_id.'); return; }
            try {
              await api(`/admin/submissions/${reviewSid}/review`, {
                method: 'POST',
                body: JSON.stringify({ score: reviewScore.trim() === '' ? null : Number(reviewScore), comment: reviewComment }),
              });
              toast.success('Đã lưu chấm điểm', `Bài nộp #${reviewSid}`);
              setReviewInfo(`Đã lưu chấm điểm cho bài #${reviewSid}.`);
            } catch (e: unknown) { toast.error('Lưu thất bại', e instanceof Error ? e.message : String(e)); }
          }} /></View>
          <View style={{ flex: 1 }}><AccentButton title="Xem" onPress={async () => {
            if (!reviewSid.trim()) { toast.warning('Nhập submission_id.'); return; }
            try {
              const r = await api(`/admin/submissions/${reviewSid}/review`);
              const text = r && (r.score != null || r.comment) ? `Điểm: ${r.score ?? '—'} · ${r.comment || ''}` : 'Chưa có chấm điểm.';
              setReviewInfo(text);
              toast.info(`Bài nộp #${reviewSid}`, text);
            } catch (e: unknown) { toast.error('Không tải được', e instanceof Error ? e.message : String(e)); }
          }} /></View>
        </View>
      </Card>

      <Card>
        <SectionTitle>Chấm lại + đối chiếu</SectionTitle>
        <Field label="submission_id"><AppInput value={sid} onChangeText={setSid} keyboardType="numeric" /></Field>
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}><Field label="run a"><AppInput value={ra} onChangeText={setRa} keyboardType="numeric" /></Field></View>
          <View style={{ flex: 1 }}><Field label="run b"><AppInput value={rb} onChangeText={setRb} keyboardType="numeric" /></Field></View>
        </View>
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}><PrimaryButton title="Chấm lại" onPress={rejudge} /></View>
          <View style={{ flex: 1 }}><AccentButton title="Đối chiếu" onPress={compareRuns} /></View>
        </View>
      </Card>

      <Card>
        <SectionTitle>Chống đạo văn</SectionTitle>
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}><Field label="Bài a"><AppInput value={sa} onChangeText={setSa} keyboardType="numeric" /></Field></View>
          <View style={{ flex: 1 }}><Field label="Bài b"><AppInput value={sb} onChangeText={setSb} keyboardType="numeric" /></Field></View>
        </View>
        {similarity !== null ? <Text style={s.sim}>{(similarity * 100).toFixed(1)}% <Text style={s.simSub}>tương tự</Text></Text> : null}
        <GhostButton title="So sánh độ tương tự" onPress={checkSimilarity} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  sim: { color: colors.primary, fontSize: 26, fontWeight: '700' },
  simSub: { color: colors.muted, fontSize: 13, fontWeight: '400' },
});
