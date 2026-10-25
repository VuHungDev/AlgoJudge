import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, AppInput, Field, PrimaryButton, AccentButton, GhostButton, EmptyState } from '../components/ui';
import { useToast } from '../components/feedback';

interface Clazz { id: number; name: string; members_count?: number; assignments_count?: number }
interface Problem { id: number; title: string; topic?: string; difficulty?: string }
interface ProgressRow { user_id: number; email: string; display_name?: string | null; subs: number; solved: number; last_submit?: string | null }

export default function TeacherStatsScreen({ navigation }: any) {
  const toast = useToast();
  const [classes, setClasses] = useState<Clazz[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemId, setProblemId] = useState<number | null>(null);
  const [students, setStudents] = useState<ProgressRow[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [sid, setSid] = useState('');
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    try {
      const r = await api('/teacher/overview').catch(() => ({ classes: [] }));
      setClasses(r.classes || []);
    } catch (e: unknown) { toast.error('Không tải được lớp', e instanceof Error ? e.message : String(e)); }
  };

  const openClass = async (cid: number) => {
    if (classId === cid) { setClassId(null); return; }
    setClassId(cid);
    setProblemId(null);
    setStudents([]);
    try {
      const r = await api(`/admin/classes/${cid}/assignments?per_page=50`);
      const pids = [...new Set(((r.assignments || []) as { problem_id: number }[]).map((a) => a.problem_id))];
      const all = await api('/teacher/overview').catch(() => ({ problems: [] }));
      setProblems(((all.problems || []) as { id: number }[]).filter((p) => pids.includes(p.id)) as Problem[]);
    } catch (e: unknown) { toast.error('Không tải được bài giao', e instanceof Error ? e.message : String(e)); }
  };

  const openProblem = async (cid: number, pid: number) => {
    if (problemId === pid) { setProblemId(null); return; }
    setProblemId(pid);
    setStudentId(null);
    try {
      const r = await api(`/admin/classes/${cid}/progress?page=1&per_page=50`);
      setStudents(r.rows || []);
    } catch (e: unknown) { toast.error('Không tải được tiến độ', e instanceof Error ? e.message : String(e)); }
  };

  const openStudent = (uid: number) => {
    if (studentId === uid) { setStudentId(null); return; }
    setStudentId(uid);
    setMsg('');
  };

  const saveReview = async () => {
    if (!sid.trim()) { toast.warning('Nhập submission_id.'); return; }
    try {
      await api(`/admin/submissions/${sid}/review`, {
        method: 'POST',
        body: JSON.stringify({ score: score.trim() === '' ? null : Number(score), comment }),
      });
      toast.success('Đã lưu chấm điểm', `Bài nộp #${sid}`);
      setMsg(`Đã lưu chấm điểm cho bài #${sid}.`);
    } catch (e: unknown) { toast.error('Lưu thất bại', e instanceof Error ? e.message : String(e)); }
  };

  const loadReview = async () => {
    if (!sid.trim()) { toast.warning('Nhập submission_id.'); return; }
    try {
      const r = await api(`/admin/submissions/${sid}/review`);
      const text = r && (r.score != null || r.comment) ? `Điểm: ${r.score ?? '—'} · ${r.comment || ''}` : 'Chưa có chấm điểm.';
      setMsg(text);
      toast.info(`Bài nộp #${sid}`, text);
    } catch (e: unknown) { toast.error('Không tải được', e instanceof Error ? e.message : String(e)); }
  };

  return (
    <Screen>
      <Hero kicker="THỐNG KÊ" title="Đi sâu theo lớp" sub="Lớp → Bài → Sinh viên → Chấm điểm." />

      <Card>
        <SectionTitle>Drill-down: Lớp → Bài → Sinh viên</SectionTitle>
        <Muted>Bấm vào lớp để xem bài được giao, bấm vào bài để xem học sinh, bấm vào học sinh để chấm điểm.</Muted>
        {classes.length === 0 && <Muted>Đang tải…</Muted>}
        {classes.map((c) => (
          <View key={c.id}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>#{c.id} {c.name}</Text>
                <Text style={s.meta}>👥 {c.members_count ?? 0} · 📝 {c.assignments_count ?? 0} bài được giao</Text>
              </View>
              <GhostButton title={classId === c.id ? 'Đóng' : 'Mở →'} onPress={() => openClass(c.id)} />
            </View>
            {classId === c.id && problems.map((p) => (
              <View key={p.id} style={s.indent1}>
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>#{p.id} {p.title}</Text>
                    <Text style={s.meta}>{p.topic} · {p.difficulty}</Text>
                  </View>
                  <GhostButton title={problemId === p.id ? 'Đóng' : 'Mở →'} onPress={() => openProblem(c.id, p.id)} />
                </View>
                {problemId === p.id && students.map((st) => (
                  <View key={st.user_id} style={s.indent2}>
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.name}>{st.display_name || st.email.split('@')[0]}</Text>
                        <Text style={s.meta}>📝 {st.subs} · ✅ {st.solved}{st.last_submit ? ` · 🕐 ${st.last_submit}` : ''}</Text>
                      </View>
                      <GhostButton title={studentId === st.user_id ? 'Đóng' : 'Chấm →'} onPress={() => openStudent(st.user_id)} />
                    </View>
                    {studentId === st.user_id && (
                      <View style={s.form}>
                        <Field label="submission_id"><AppInput value={sid} onChangeText={setSid} keyboardType="numeric" /></Field>
                        <Field label="Điểm 0–100"><AppInput value={score} onChangeText={setScore} keyboardType="numeric" /></Field>
                        <Field label="Nhận xét"><AppInput value={comment} onChangeText={setComment} /></Field>
                        {!!msg && <Muted>{msg}</Muted>}
                        <View style={s.twoCol}>
                          <View style={{ flex: 1 }}><PrimaryButton title="Lưu" onPress={saveReview} /></View>
                          <View style={{ flex: 1 }}><AccentButton title="Xem" onPress={loadReview} /></View>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
        <GhostButton title="Làm mới" onPress={loadClasses} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: spacing.sm
  },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  indent1: {
    marginLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm
  },
  indent2: {
    marginLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.sm,
    marginTop: spacing.xs
  },
  form: { gap: spacing.xs, marginTop: spacing.xs, marginBottom: spacing.sm },
});
