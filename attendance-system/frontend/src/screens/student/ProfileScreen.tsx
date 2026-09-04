import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/Button';
import { Card, Avatar, Input, Badge } from '@/components';
import * as ImagePicker from 'expo-image-picker';

export default function StudentProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    studentId: user?.studentProfile?.studentId || '',
    branch: user?.studentProfile?.branch || '',
    classId: user?.studentProfile?.classId || '',
    semester: user?.studentProfile?.semester?.toString() || '',
    section: user?.studentProfile?.section || '',
    enrollmentYear: user?.studentProfile?.enrollmentYear?.toString() || '',
    parentPhone: user?.studentProfile?.parentPhone || '',
    address: user?.studentProfile?.address || '',
  });
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl || null);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateUser(user!.id, {
        fullName: formData.fullName,
        phone: formData.phone,
        avatarUrl: avatarUri,
      });

      if (user?.studentProfile) {
        await api.updateUser(user.id, {
          branch: formData.branch,
          classId: formData.classId,
          semester: parseInt(formData.semester) || 1,
          section: formData.section,
          enrollmentYear: parseInt(formData.enrollmentYear) || new Date().getFullYear(),
          parentPhone: formData.parentPhone,
          address: formData.address,
        });
      }

      updateUser({ fullName: formData.fullName, phone: formData.phone, avatarUrl: avatarUri });
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFaceEnroll = () => {
    router.push('/face-enroll?mode=enroll');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => router.replace('/login') },
    ]);
  };

  const studentProfile = user?.studentProfile;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.headerGradient} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(!editing)}>
            <Text style={styles.editButtonText}>{editing ? 'Done' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileHeader}>
          <Avatar source={{ uri: avatarUri }} name={user?.fullName} size="xl" style={styles.avatar} />
          <TouchableOpacity style={styles.avatarEditButton} onPress={pickImage}>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.profileName}>{formData.fullName || user?.fullName}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          
          <View style={styles.profileBadges}>
            <Badge variant="info" size="sm">{user?.studentProfile?.branch}</Badge>
            <Badge variant="default" size="sm">Sem {user?.studentProfile?.semester}</Badge>
            <Badge variant="outline" size="sm">{user?.studentProfile?.classId}</Badge>
          </View>
        </View>

        <Card style={styles.sectionCard} variant="elevated">
          <View style={styles.sectionHeader}>
            <Ionicons name="id-card" size={22} color="#2563EB" />
            <Text style={styles.sectionTitle}>Student Information</Text>
          </View>
          
          <View style={styles.form}>
            <Input
              label="Student ID"
              value={formData.studentId}
              onChangeText={v => updateField('studentId', v)}
              placeholder="Enter student ID"
              leftIcon="id-card"
              editable={editing}
            />
            <Input
              label="Full Name"
              value={formData.fullName}
              onChangeText={v => updateField('fullName', v)}
              placeholder="Enter full name"
              leftIcon="person"
              editable={editing}
            />
            <Input
              label="Email"
              value={formData.email}
              onChangeText={v => updateField('email', v)}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              editable={false}
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChangeText={v => updateField('phone', v)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              leftIcon="call"
              editable={editing}
            />
            <Input
              label="Branch"
              value={formData.branch}
              onChangeText={v => updateField('branch', v)}
              placeholder="e.g., CSE, ECE, MECH"
              leftIcon="school"
              editable={editing}
            />
            <Input
              label="Class ID"
              value={formData.classId}
              onChangeText={v => updateField('classId', v)}
              placeholder="e.g., CSE-3A"
              leftIcon="layers"
              editable={editing}
            />
            <Input
              label="Semester"
              value={formData.semester}
              onChangeText={v => updateField('semester', v)}
              placeholder="e.g., 5"
              keyboardType="numeric"
              leftIcon="numeric"
              editable={editing}
            />
            <Input
              label="Section"
              value={formData.section}
              onChangeText={v => updateField('section', v)}
              placeholder="e.g., A"
              leftIcon="grid"
              editable={editing}
            />
            <Input
              label="Enrollment Year"
              value={formData.enrollmentYear}
              onChangeText={v => updateField('enrollmentYear', v)}
              placeholder="e.g., 2021"
              keyboardType="numeric"
              leftIcon="calendar"
              editable={editing}
            />
            <Input
              label="Parent Phone"
              value={formData.parentPhone}
              onChangeText={v => updateField('parentPhone', v)}
              placeholder="Enter parent phone"
              keyboardType="phone-pad"
              leftIcon="call"
              editable={editing}
            />
            <Input
              label="Address"
              value={formData.address}
              onChangeText={v => updateField('address', v)}
              placeholder="Enter address"
              leftIcon="location"
              multiline
              numberOfLines={3}
              editable={editing}
            />
          </View>
        </Card>

        <Card style={styles.sectionCard} variant="elevated">
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={22} color="#2563EB" />
            <Text style={styles.sectionTitle}>Face Verification</Text>
          </View>
          
          <View style={styles.faceSection}>
            <View style={styles.faceStatus}>
              <Ionicons 
                name={user?.faceDescriptor ? 'checkmark-circle' : 'radio-button-off'} 
                size={28} 
                color={user?.faceDescriptor ? '#10B981' : '#94A3B8'} 
              />
              <View style={styles.faceStatusText}>
                <Text style={styles.faceStatusTitle}>
                  {user?.faceDescriptor ? 'Face Enrolled' : 'Face Not Enrolled'}
                </Text>
                <Text style={styles.faceStatusDesc}>
                  {user?.faceDescriptor 
                    ? 'Your face is enrolled for attendance verification' 
                    : 'Enroll your face to use QR + Face attendance'}
                </Text>
              </View>
            </View>
            
            <Button
              title={user?.faceDescriptor ? 'Re-enroll Face' : 'Enroll Face'}
              variant={user?.faceDescriptor ? 'secondary' : 'primary'}
              onPress={handleFaceEnroll}
              disabled={!editing}
            />
          </View>
        </Card>

        <Card style={styles.sectionCard} variant="outlined" gradientColors={['#FEF2F2', '#FEE2E2']}>
          <View style={styles.sectionHeader}>
            <Ionicons name="log-out" size={22} color="#EF4444" />
            <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Account</Text>
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={22} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  scrollContent: { paddingBottom: 30 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  editButton: { paddingHorizontal: 12, paddingVertical: 6 },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  profileHeader: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24, position: 'relative' },
  avatar: { marginTop: -50 },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileName: { fontSize: 24, fontWeight: '700', color: '#1E293B', marginTop: 16 },
  profileEmail: { fontSize: 14, color: '#64748B', marginTop: 4 },
  profileBadges: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  sectionCard: { marginHorizontal: 24, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  form: { gap: 16 },
  faceSection: { gap: 16 },
  faceStatus: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12 },
  faceStatusText: { flex: 1 },
  faceStatusTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  faceStatusDesc: { fontSize: 13, color: '#64748B', marginTop: 2 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
});