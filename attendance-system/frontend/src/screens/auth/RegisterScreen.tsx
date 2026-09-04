import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { AlertModal } from '@/components/Modal';

type Role = 'STUDENT' | 'TEACHER' | 'PLATFORM_OWNER';

const roleOptions: { value: Role; label: string; icon: string; description: string }[] = [
  { value: 'STUDENT', label: 'Student', icon: 'person', description: 'Mark attendance, view history' },
  { value: 'TEACHER', label: 'Teacher', icon: 'school', description: 'Create sessions, manage classes' },
  { value: 'PLATFORM_OWNER', label: 'Platform Owner', icon: 'business', description: 'Manage institutions, users' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>('STUDENT');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    studentId: '',
    branch: '',
    classId: '',
    semester: '',
    enrollmentYear: '',
    section: '',
    employeeId: '',
    department: '',
    designation: '',
    institutionId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const handleRegister = async () => {
    const { confirmPassword, ...data } = formData;
    
    if (!data.email || !data.password || !data.fullName) {
      setAlertMessage('Please fill in all required fields');
      setAlertVisible(true);
      return;
    }
    
    if (data.password !== confirmPassword) {
      setAlertMessage('Passwords do not match');
      setAlertVisible(true);
      return;
    }
    
    if (data.password.length < 8) {
      setAlertMessage('Password must be at least 8 characters');
      setAlertVisible(true);
      return;
    }

    if (selectedRole === 'STUDENT' && (!data.studentId || !data.branch || !data.classId || !data.semester)) {
      setAlertMessage('Please fill in all student details');
      setAlertVisible(true);
      return;
    }

    if (selectedRole === 'TEACHER' && (!data.employeeId || !data.department || !data.institutionId)) {
      setAlertMessage('Please fill in all teacher details');
      setAlertVisible(true);
      return;
    }

    setLoading(true);
    try {
      await register({ ...data, role: selectedRole, semester: parseInt(data.semester) || 1, enrollmentYear: parseInt(data.enrollmentYear) || new Date().getFullYear() });
      router.replace('/');
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : 'Registration failed');
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const roleFields = selectedRole === 'STUDENT' ? [
    { name: 'studentId', label: 'Student ID', placeholder: 'e.g., CS2021001' },
    { name: 'branch', label: 'Branch', placeholder: 'e.g., CSE, ECE, MECH' },
    { name: 'classId', label: 'Class ID', placeholder: 'e.g., CSE-3A' },
    { name: 'semester', label: 'Semester', placeholder: 'e.g., 5', keyboardType: 'numeric' },
    { name: 'enrollmentYear', label: 'Enrollment Year', placeholder: 'e.g., 2021', keyboardType: 'numeric' },
    { name: 'section', label: 'Section (Optional)', placeholder: 'e.g., A' },
  ] : selectedRole === 'TEACHER' ? [
    { name: 'employeeId', label: 'Employee ID', placeholder: 'e.g., EMP001' },
    { name: 'department', label: 'Department', placeholder: 'e.g., Computer Science' },
    { name: 'designation', label: 'Designation', placeholder: 'e.g., Professor' },
    { name: 'institutionId', label: 'Institution ID', placeholder: 'Enter institution ID' },
  ] : [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.gradient} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Ionicons name="person-add" size={60} color="#FFFFFF" />
          <Text style={styles.appTitle}>Create Account</Text>
          <Text style={styles.appSubtitle}>Join Attendance System</Text>
        </View>

        <Card style={styles.formCard} variant="elevated">
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Register as {roleOptions.find(r => r.value === selectedRole)?.label}</Text>
            <Text style={styles.formSubtitle}>Fill in your details to get started</Text>
          </View>

          <View style={styles.roleSelector}>
            {roleOptions.map(role => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.roleOption,
                  selectedRole === role.value && styles.roleOptionSelected,
                ]}
                onPress={() => setSelectedRole(role.value)}
              >
                <Ionicons name={role.icon} size={24} color={selectedRole === role.value ? '#FFFFFF' : '#2563EB'} />
                <View style={styles.roleOptionText}>
                  <Text style={[
                    styles.roleOptionLabel,
                    selectedRole === role.value && styles.roleOptionLabelSelected,
                  ]}>{role.label}</Text>
                  <Text style={[
                    styles.roleOptionDesc,
                    selectedRole === role.value && styles.roleOptionDescSelected,
                  ]}>{role.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChangeText={v => updateField('fullName', v)}
              autoCapitalize="words"
              leftIcon="person"
              error={!formData.fullName && 'Full name is required'}
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={v => updateField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail"
              error={!formData.email && 'Email is required'}
            />

            <Input
              label="Phone (Optional)"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={v => updateField('phone', v)}
              keyboardType="phone-pad"
              leftIcon="call"
            />

            <Input
              label="Password"
              placeholder="Create a password (min 8 chars)"
              value={formData.password}
              onChangeText={v => updateField('password', v)}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              rightIconOnPress={() => setShowPassword(!showPassword)}
              autoComplete="new-password"
              leftIcon="lock-closed"
              error={formData.password && formData.password.length < 8 && 'Password must be at least 8 characters'}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={v => updateField('confirmPassword', v)}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              leftIcon="lock-closed"
              error={formData.confirmPassword && formData.password !== formData.confirmPassword && 'Passwords do not match'}
            />

            {roleFields.map(field => (
              <Input
                key={field.name}
                label={field.label}
                placeholder={field.placeholder}
                value={formData[field.name as keyof typeof formData]}
                onChangeText={v => updateField(field.name, v)}
                keyboardType={field.keyboardType}
                leftIcon="document"
              />
            ))}

            <Button
              title="Create Account"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleRegister}
            />
          </View>
        </Card>

        <View style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginLinkAction}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AlertModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title="Registration Error"
        message={alertMessage}
        confirmText="OK"
        onConfirm={() => setAlertVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  formHeader: { alignItems: 'center', marginBottom: 24 },
  formTitle: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  formSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  roleSelector: { gap: 10, marginBottom: 24 },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  roleOptionSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  roleOptionText: { flex: 1, gap: 2 },
  roleOptionLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  roleOptionLabelSelected: { color: '#FFFFFF' },
  roleOptionDesc: { fontSize: 12, color: '#64748B' },
  roleOptionDescSelected: { color: 'rgba(255,255,255,0.8)' },
  form: { gap: 16 },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginLinkText: { fontSize: 14, color: '#64748B' },
  loginLinkAction: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
});