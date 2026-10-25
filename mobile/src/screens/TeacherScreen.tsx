import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';
import { Card, Screen, Hero, SectionTitle, Muted, LoadingBlock } from '../components/ui';

interface TeacherDashboard {
  classes_count: number;
  problems_count: number;
  assignments_count: number;
  contests_count: number;
}

const NAV_CARDS = [
  { id: 'problems', title: 'Đề thi', icon: '📝', desc: 'Tạo bài tập, dựng testset, cập nhật đề', screen: 'TeacherProblems' },
  { id: 'grading', title: 'Giao bài & chấm', icon: '✅', desc: 'Giao bài, chấm lại, so sánh, chống đạo văn', screen: 'TeacherGrading' },
  { id: 'contests', title: 'Kỳ thi', icon: '🏆', desc: 'Tạo contest, xem leaderboard', screen: 'TeacherContests' },
  { id: 'classes', title: 'Lớp học', icon: '👥', desc: 'Danh sách lớp đang dạy, quản lý thành viên', screen: 'TeacherClasses' },
  { id: 'stats', title: 'Thống kê', icon: '📊', desc: 'Khoan xuống: lớp → bài → sinh viên → chấm điểm', screen: 'TeacherStats' },
  { id: 'manage', title: 'Quản trị lớp', icon: '⚙️', desc: 'Chi tiết lớp: thành viên, tiến độ, bài giao, thống kê', screen: 'TeacherManage' },
];

export default function TeacherScreen({ navigation }: any) {
  const [role, setRole] = useState('');
  const [dash, setDash] = useState<TeacherDashboard | null>(null);

  useEffect(() => {
    api('/me').then((m) => {
      setRole(m.role);
      if (m.role === 'teacher' || m.role === 'admin') {
        api('/teacher/overview').then((r) => {
          setDash({
            classes_count: r.classes?.length ?? 0,
            problems_count: r.problems?.length ?? 0,
            assignments_count: 0,
            contests_count: 0,
          });
        }).catch(() => {});
      }
    }).catch(() => setRole(''));
  }, []);

  if (!role) return <Screen><LoadingBlock hint="Đang kiểm tra quyền giảng viên…" /></Screen>;
  if (role !== 'teacher' && role !== 'admin') {
    return (
      <Screen>
        <Card>
          <SectionTitle>Không có quyền</SectionTitle>
          <Muted>Tài khoản không có quyền giảng viên.</Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Hero kicker="KHU GIẢNG VIÊN" title="Quản lý đề & lớp" sub="Dựng testset, chấm bài, theo dõi tiến độ và vận hành lớp học." />

      {dash && (
        <Card>
          <SectionTitle>Tổng quan nhanh</SectionTitle>
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statValue}>{dash.classes_count}</Text>
              <Text style={s.statLabel}>Lớp học</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statValue}>{dash.problems_count}</Text>
              <Text style={s.statLabel}>Đề thi</Text>
            </View>
          </View>
        </Card>
      )}

      <Card>
        <SectionTitle>Chức năng chính</SectionTitle>
        <Muted>Chọn mục bên dưới để mở giao diện chi tiết.</Muted>
        <View style={s.navGrid}>
          {NAV_CARDS.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={s.navCard}
              onPress={() => navigation.navigate(card.screen)}
              activeOpacity={0.7}
            >
              <Text style={s.navIcon}>{card.icon}</Text>
              <Text style={s.navTitle}>{card.title}</Text>
              <Text style={s.navDesc}>{card.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.raised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  navGrid: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  navCard: {
    padding: spacing.lg,
    backgroundColor: colors.raised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  navIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  navDesc: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
});
