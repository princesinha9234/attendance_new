import { StyleSheet, View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Providers } from '@/context/Providers';
import { SplashScreen } from 'expo-splash-screen';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      SplashScreen.preventAutoHideAsync();
    }
  }, []);
  return (
    <Providers>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        <Stack.Screen name="index" options={{ presentation: 'transparent' }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="face-enroll" />
        <Stack.Screen name="(student)/dashboard" />
        <Stack.Screen name="(student)/scan-qr" />
        <Stack.Screen name="(student)/face-verify" />
        <Stack.Screen name="(student)/attendance-history" />
        <Stack.Screen name="(student)/profile" />
        <Stack.Screen name="(teacher)/dashboard" />
        <Stack.Screen name="(teacher)/create-session" />
        <Stack.Screen name="(teacher)/session-detail" />
        <Stack.Screen name="(teacher)/manual-attendance" />
        <Stack.Screen name="(teacher)/qr-display" />
        <Stack.Screen name="(teacher)/class-stats" />
        <Stack.Screen name="(teacher)/profile" />
        <Stack.Screen name="(owner)/dashboard" />
        <Stack.Screen name="(owner)/institutions" />
        <Stack.Screen name="(owner)/users" />
        <Stack.Screen name="(owner)/analytics" />
        <Stack.Screen name="(owner)/profile" />
      </Stack>
    </Providers>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});