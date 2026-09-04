import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { AlertModal } from '@/components/Modal';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setAlertMessage('Please enter both email and password');
      setAlertVisible(true);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : 'Login failed');
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.gradient} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Ionicons name="school" size={60} color="#FFFFFF" />
          <Text style={styles.appTitle}>Attendance System</Text>
          <Text style={styles.appSubtitle}>Scan QR • Verify Face • Mark Present</Text>
        </View>

        <Card style={styles.formCard} variant="elevated">
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail"
              error={!email && 'Email is required'}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              rightIconOnPress={() => setShowPassword(!showPassword)}
              autoComplete="password"
              leftIcon="lock-closed"
              error={!password && 'Password is required'}
            />

            <View style={styles.forgotPassword}>
              <TouchableOpacity onPress={() => {}}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Sign In"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleLogin}
            />
          </View>
        </Card>

        <View style={styles.registerLink}>
          <Text style={styles.registerLinkText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.registerLinkAction}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.demoAccounts}>
          <Text style={styles.demoTitle}>Demo Accounts</Text>
          <View style={styles.demoList}>
            <DemoAccount 
              role="Student" 
              email="amit@student.techuniv.edu" 
              password="password123"
              onPress={() => { setEmail('amit@student.techuniv.edu'); setPassword('password123'); }}
            />
            <DemoAccount 
              role="Teacher" 
              email="teacher1@techuniv.edu" 
              password="password123"
              onPress={() => { setEmail('teacher1@techuniv.edu'); setPassword('password123'); }}
            />
            <DemoAccount 
              role="Platform Owner" 
              email="owner@attendance.com" 
              password="password123"
              onPress={() => { setEmail('owner@attendance.com'); setPassword('password123'); }}
            />
          </View>
        </View>
      </ScrollView>

      <AlertModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title="Login Error"
        message={alertMessage}
        confirmText="OK"
        onConfirm={() => setAlertVisible(false)}
      />
    </View>
  );
}

interface DemoAccountProps {
  role: string;
  email: string;
  password: string;
  onPress: () => void;
}

const DemoAccount = ({ role, email, password, onPress }: DemoAccountProps) => (
  <TouchableOpacity style={styles.demoCard} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.demoInfo}>
      <Text style={styles.demoRole}>{role}</Text>
      <Text style={styles.demoEmail}>{email}</Text>
    </View>
    <Ionicons name="arrow-forward" size={20} color="#94A3B8" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  appSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  formCard: { width: '100%' },
  formHeader: { alignItems: 'center', marginBottom: 28 },
  formTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  formSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  form: { gap: 18 },
  forgotPassword: { alignSelf: 'flex-end' },
  forgotPasswordText: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerLinkText: { fontSize: 14, color: '#64748B' },
  registerLinkAction: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  demoAccounts: { marginTop: 32 },
  demoTitle: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 12, textAlign: 'center' },
  demoList: { gap: 8 },
  demoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoInfo: { gap: 2 },
  demoRole: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  demoEmail: { fontSize: 12, color: '#64748B' },
});