import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import React from 'react';

const Tab = createBottomTabNavigator();

export default function OwnerLayout() {
  const { user } = useAuth();

  if (!user || user.role !== 'PLATFORM_OWNER') {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          if (route.name === 'dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'institutions') iconName = focused ? 'business' : 'business-outline';
          else if (route.name === 'users') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'analytics') iconName = focused ? 'analytics' : 'analytics-outline';
          else if (route.name === 'profile') iconName = focused ? 'person' : 'person-outline';
          else iconName = 'home-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7C3AED',
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
      <Tab.Screen name="dashboard" component={() => require('@/screens/owner/DashboardScreen').default} />
      <Tab.Screen name="institutions" component={() => require('@/screens/owner/InstitutionsScreen').default} />
      <Tab.Screen name="users" component={() => require('@/screens/owner/UsersScreen').default} />
      <Tab.Screen name="analytics" component={() => require('@/screens/owner/AnalyticsScreen').default} />
      <Tab.Screen name="profile" component={() => require('@/screens/owner/ProfileScreen').default} />
    </Tab.Navigator>
  );
}