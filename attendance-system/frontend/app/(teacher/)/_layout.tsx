import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import React from 'react';

const Tab = createBottomTabNavigator();

export default function TeacherLayout() {
  const { user } = useAuth();

  if (!user || user.role !== 'TEACHER') {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          if (route.name === 'dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'create-session') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'class-stats') iconName = focused ? 'analytics' : 'analytics-outline';
          else if (route.name === 'profile') iconName = focused ? 'person' : 'person-outline';
          else iconName = 'home-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#059669',
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
      <Tab.Screen name="dashboard" component={() => require('@/screens/teacher/DashboardScreen').default} />
      <Tab.Screen name="create-session" component={() => require('@/screens/teacher/CreateSessionScreen').default} />
      <Tab.Screen name="class-stats" component={() => require('@/screens/teacher/ClassStatsScreen').default} />
      <Tab.Screen name="profile" component={() => require('@/screens/teacher/ProfileScreen').default} />
    </Tab.Navigator>
  );
}