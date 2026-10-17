import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import ProblemsScreen from './src/screens/ProblemsScreen';
import DetailScreen from './src/screens/DetailScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ResultScreen from './src/screens/ResultScreen';
import ContestsScreen from './src/screens/ContestsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TeacherScreen from './src/screens/TeacherScreen';
import OpsScreen from './src/screens/OpsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Đăng nhập' }} />
        <Stack.Screen name="Problems" component={ProblemsScreen} options={{ title: 'Bài tập' }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: 'Làm bài' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Lịch sử' }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Kết quả' }} />
        <Stack.Screen name="Contests" component={ContestsScreen} options={{ title: 'Contest' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Hồ sơ' }} />
        <Stack.Screen name="Teacher" component={TeacherScreen} options={{ title: 'Giảng viên' }} />
        <Stack.Screen name="Ops" component={OpsScreen} options={{ title: 'Ops' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
