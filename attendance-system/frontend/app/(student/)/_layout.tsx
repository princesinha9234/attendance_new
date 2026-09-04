import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import React from 'react';

const Tab = createBottomTabNavigator();

export default function StudentLayout() {
  const { user } = useAuth();

  if (!user || user.role !== 'STUDENT') {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          if (route.name === 'dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'scan-qr') iconName = focused ? 'qr-code' : 'qr-code-outline';
          else if (route.name === 'attendance-history') iconName = focused ? 'document' : 'document-outline';
          else if (route.name === 'profile') iconName = focused ? 'person' : 'person-outline';
          else iconName = 'home-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          paddingTop: 8,
          height: 70,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="dashboard" component={() => require('@/screens/student/DashboardScreen').default} />
      <Tab.Screen name="scan-qr" component={() => require('@/screens/student/ScanQRScreen').default} />
      <Tab.Screen name="attendance-history" component={() => require('@/screens/student/AttendanceHistoryScreen').default} />
      <Tab.Screen name="profile" component={() => require('@/screens/student/ProfileScreen').default} />
    </Tab.Navigator>
  );
}