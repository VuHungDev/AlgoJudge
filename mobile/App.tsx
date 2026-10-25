import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { api, getToken } from './src/api';
import AssignmentsScreen from './src/screens/AssignmentsScreen';
import ClassDetailScreen from './src/screens/ClassDetailScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import TeacherClassDetailScreen from './src/screens/TeacherClassDetailScreen';
import { ThemeProvider } from './src/theme-context';
import { FeedbackProvider } from './src/components/feedback';
import ProblemsScreen from './src/screens/ProblemsScreen';
import DetailScreen from './src/screens/DetailScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ResultScreen from './src/screens/ResultScreen';
import ContestsScreen from './src/screens/ContestsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TeacherScreen from './src/screens/TeacherScreen';
import TeacherProblemsScreen from './src/screens/TeacherProblemsScreen';
import TeacherGradingScreen from './src/screens/TeacherGradingScreen';
import TeacherContestsScreen from './src/screens/TeacherContestsScreen';
import TeacherClassesScreen from './src/screens/TeacherClassesScreen';
import TeacherStatsScreen from './src/screens/TeacherStatsScreen';
import TeacherManageScreen from './src/screens/TeacherManageScreen';
import OpsScreen from './src/screens/OpsScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import ContestDetailScreen from './src/screens/ContestDetailScreen';
import LanguagesStatusScreen from './src/screens/LanguagesStatusScreen';
import AboutDiagnostics from './src/screens/AboutDiagnostics';

const Stack = createNativeStackNavigator();

const NavTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: '#0e8aa0', background: '#edf2f6', card: '#0a2f52', text: '#14324a', border: '#d7e2ea' },
};

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a2f52', gap: 12 }}>
      <View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#e07b1a', fontWeight: '700', fontSize: 26 }}>AJ</Text>
      </View>
      <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 22 }}>AlgoJudge</Text>
      <Text style={{ color: '#bfe0ec', fontSize: 11, letterSpacing: 2, fontWeight: '800' }}>LUYỆN THI LẬP TRÌNH</Text>
      <ActivityIndicator color="#ffffff" />
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [initial, setInitial] = useState('Welcome');
  useEffect(() => {
    (async () => {
      // Da login (phien hop le) -> vao Home theo role:
      //   student  -> Problems
      //   teacher  -> TeacherProblems
      //   admin    -> Ops
      // Chua login -> luon ve Welcome.
      try {
        const token = await getToken();
        if (token) {
          try {
            const me = await api('/me');
            const role: string = me?.role ?? '';
            if (role === 'teacher') setInitial('TeacherProblems');
            else if (role === 'admin') setInitial('Ops');
            else setInitial('Problems');
            return;
          } catch { /* token expired */ }
        }
        setInitial('Welcome');
      } finally { setReady(true); }
    })();
  }, []);
  if (!ready) return <Splash />;
  return (
    <ThemeProvider>
      <FeedbackProvider>
        <NavigationContainer theme={NavTheme}>
      <Stack.Navigator
        initialRouteName={initial}
        screenOptions={{
          headerStyle: { backgroundColor: '#0a2f52' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '800' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#edf2f6' },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ title: 'Chào mừng', headerShown: false }} />
        <Stack.Screen name="Problems" component={ProblemsScreen} options={{ title: 'Bài tập' }} />
        <Stack.Screen name="Assignments" component={AssignmentsScreen} options={{ title: 'Bài được giao' }} />
        <Stack.Screen name="Activity" component={ActivityScreen} options={{ title: 'Hoạt động' }} />
        <Stack.Screen name="ClassDetail" component={ClassDetailScreen} options={{ title: 'Lớp học' }} />
        <Stack.Screen name="TeacherClassDetail" component={TeacherClassDetailScreen} options={{ title: 'Chi tiết lớp' }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: 'Làm bài' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Lịch sử' }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Kết quả' }} />
        <Stack.Screen name="Contests" component={ContestsScreen} options={{ title: 'Contest' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Hồ sơ' }} />
        <Stack.Screen name="Teacher" component={TeacherScreen} options={{ title: 'Giảng viên' }} />
        <Stack.Screen name="TeacherProblems" component={TeacherProblemsScreen} options={{ title: 'Đề thi' }} />
        <Stack.Screen name="TeacherGrading" component={TeacherGradingScreen} options={{ title: 'Giao bài & chấm' }} />
        <Stack.Screen name="TeacherContests" component={TeacherContestsScreen} options={{ title: 'Kỳ thi' }} />
        <Stack.Screen name="TeacherClasses" component={TeacherClassesScreen} options={{ title: 'Lớp học' }} />
        <Stack.Screen name="TeacherStats" component={TeacherStatsScreen} options={{ title: 'Thống kê' }} />
        <Stack.Screen name="TeacherManage" component={TeacherManageScreen} options={{ title: 'Quản trị lớp' }} />
        <Stack.Screen name="Ops" component={OpsScreen} options={{ title: 'Ops' }} />
        <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: 'Tiến độ' }} />
        <Stack.Screen name="ContestDetail" component={ContestDetailScreen} options={{ title: 'Chi tiết contest' }} />
        <Stack.Screen name="LanguagesStatus" component={LanguagesStatusScreen} options={{ title: 'Ngôn ngữ & trạng thái' }} />
        <Stack.Screen name="AboutDiagnostics" component={AboutDiagnostics} options={{ title: 'About & chẩn đoán' }} />
      </Stack.Navigator>
      </NavigationContainer>
      </FeedbackProvider>
    </ThemeProvider>
  );
}

