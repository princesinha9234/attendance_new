import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/Button';
import { Card, Input, Badge, Loading } from '@/components';

export default function CreateSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [subjectMappings, setSubjectMappings] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    subjectClassMappingId: '',
    scheduledStart: '',
    scheduledEnd: '',
    locationLat: '',
    locationLng: '',
    allowedRadius: '50',
    requireFaceVerify: true,
  });
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');

  const fetchSubjectMappings = async () => {
    try {
      if (!user?.teacherProfile?.id) return;
      
      // We'll need to add an endpoint for this, for now use a mock
      const response = await api.getSessions({ limit: 1 });
      // In real app, fetch from /api/subject-class-mappings?teacherId=...
      setSubjectMappings([
        { id: '1', subject: { name: 'Database Management Systems', code: 'CS301' }, class: { name: 'CSE-3A' } },
        { id: '2', subject: { name: 'Operating Systems', code: 'CS302' }, class: { name: 'CSE-3A' } },
        { id: '3', subject: { name: 'Computer Networks', code: 'CS401' }, class: { name: 'CSE-3B' } },
      ]);
    } catch (error) {
      console.error('Fetch mappings error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjectMappings();
  }, []);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const combineDateTime = (dateStr: string, timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  };

  const handleCreate = async () => {
    if (!formData.subjectClassMappingId) {
      Alert.alert('Error', 'Please select a subject and class');
      return;
    }

    const scheduledStart = combineDateTime(formData.scheduledStart, startTime);
    const scheduledEnd = combineDateTime(formData.scheduledEnd, endTime);

    if (new Date(scheduledStart) >= new Date(scheduledEnd)) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setCreating(true);
    try {
      const response = await api.createSession({
        subjectClassMappingId: formData.subjectClassMappingId,
        scheduledStart,
        scheduledEnd,
        locationLat: formData.locationLat ? parseFloat(formData.locationLat) : undefined,
        locationLng: formData.locationLng ? parseFloat(formData.locationLng) : undefined,
        allowedRadius: parseFloat(formData.allowedRadius) || 50,
        requireFaceVerify: formData.requireFaceVerify,
      });

      if (response.error) throw new Error(response.error);

      Alert.alert('Success', 'Session created successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loading size="lg" text="Loading..." />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#059669', '#047857']} style={styles.headerGradient} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Session</Text>
          <View style={{ width: 44 }} />
        </View>

        <Card style={styles.sectionCard} variant="elevated">
          <View style={styles.sectionHeader}>
            <Ionicons name="school" size={22} color="#059669" />
            <Text style={styles.sectionTitle}>Subject & Class</Text>
          </View>

          <Input
            label="Select Subject & Class"
            placeholder="Choose subject and class"
            value={subjectMappings.find(m => m.id === formData.subjectClassMappingId) 
              ? `${subjectMappings.find(m => m.id === formData.subjectClassMappingId)?.subject?.name} - ${subjectMappings.find(m => m.id === formData.subjectClassMappingId)?.class?.name}`
              : ''
            }
            editable={false}
            leftIcon="layers"
            rightIcon="chevron-down"
          />

          <View style={styles.mappingOptions}>
            {subjectMappings.map(mapping => (
              <TouchableOpacity
                key={mapping.id}
                style={[
                  styles.mappingOption,
                  formData.subjectClassMappingId === mapping.id && styles.mappingOptionSelected,
                ]}
                onPress={() => updateField('subjectClassMappingId', mapping.id)}
              >
                <View style={styles.mappingInfo}>
                  <Text style={styles.mappingSubject}>{mapping.subject?.name} ({mapping.subject?.code})</Text>
                  <Text style={styles.mappingClass}>{mapping.class?.name}</Text>
                </View>
                <Ionicons
                  name={formData.subjectClassMappingId === mapping.id ? 'checkmark-circle' : 'radio-button-off'}
                  size={24}
                  color={formData.subjectClassMappingId === mapping.id ? '#059669' : '#94A3B8'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.sectionCard} variant="elevated">
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={22} color="#059669" />
            <Text style={styles.sectionTitle}>Date & Time</Text>
          </View>

          <View style={styles.datetimeRow}>
            <Input
              label="Date"
              value={date.toISOString().split('T')[0]}
              onChangeText={v => { setDate(new Date(v)); updateField('scheduledStart', v); updateField('scheduledEnd', v); }}
              editable={false}
              leftIcon="calendar"
              rightIcon="chevron-down"
            />
          </View>

          <View style={styles.timeRow}>
            <Input
              label="Start Time"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="09:00"
              leftIcon="time"
              editable={false}
              rightIcon="chevron-down"
            />
            <Input
              label="End Time"
              value={endTime}
              onChangeText={setEndTime}
              placeholder="10:30"
              leftIcon="time"
              editable={false}
              rightIcon="chevron-down"
            />
          </View>
        </Card>

        <Card style={styles.sectionCard} variant="elevated">
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={22} color="#059669" />
            <Text style={styles.sectionTitle}>Location (Geofencing)</Text>
          </View>

          <Input
            label="Latitude (Optional)"
            value={formData.locationLat}
            onChangeText={v => updateField('locationLat', v)}
            placeholder="e.g., 12.9716"
            keyboardType="decimal-pad"
            leftIcon="navigate"
          />
          <Input
            label="Longitude (Optional)"
            value={formData.locationLng}
            onChangeText={v => updateField('locationLng', v)}
            placeholder="e.g., 77.5946"
            keyboardType="decimal-pad"
            leftIcon="navigate"
          />
          <Input
            label="Allowed Radius (meters)"
            value={formData.allowedRadius}
            onChangeText={v => updateField('allowedRadius', v)}
            placeholder="50"
            keyboardType="numeric"
            leftIcon="radio"
            helperText="Students within this radius can mark attendance"
          />

          <View style={styles.helpText}>
            <Ionicons name="information-circle" size={16} color="#94A3B8" />
            <Text style={styles.helpTextContent}>
              Leave location empty to disable geofencing. Students can then mark attendance from anywhere.
            </Text>
          </View>
        </Card>

        <Card style={styles.sectionCard} variant="elevated">
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={22} color="#059669" />
            <Text style={styles.sectionTitle}>Verification Settings</Text>
          </View>

          <TouchableOpacity style={[styles.toggleRow, formData.requireFaceVerify && styles.toggleRowActive]} onPress={() => updateField('requireFaceVerify', (!formData.requireFaceVerify).toString())}>
            <View style={[
              styles.toggleTrack,
              formData.requireFaceVerify && styles.toggleTrackActive,
            ]}>
              <View style={[
                styles.toggleThumb,
                formData.requireFaceVerify && styles.toggleThumbActive,
              ]} />
            </View>
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>Require Face Verification</Text>
              <Text style={styles.toggleDesc}>Students must verify their face after scanning QR</Text>
            </View>
          </TouchableOpacity>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Create Session"
            variant="primary"
            size="lg"
            fullWidth
            loading={creating}
            onPress={handleCreate}
          />
          <Button
            title="Cancel"
            variant="outline"
            size="md"
            fullWidth
            onPress={() => router.back()}
            style={{ marginTop: 12 }}
          />
        </View>
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
    height: 120,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, gap: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  sectionCard: { width: '100%' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  mappingOptions: { gap: 10, marginTop: 12 },
  mappingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mappingOptionSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  mappingInfo: { flex: 1 },
  mappingSubject: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  mappingClass: { fontSize: 13, color: '#64748B', marginTop: 2 },
  datetimeRow: { marginBottom: 16 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeRow: { flexDirection: 'row', gap: 12 },
  helpText: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 12, backgroundColor: '#F0FDF4', borderRadius: 10 },
  helpTextContent: { flex: 1, fontSize: 13, color: '#166534', lineHeight: 19 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12 },
  toggleRowActive: { backgroundColor: '#ECFDF5' },
  toggleTrack: { width: 52, height: 28, borderRadius: 14, backgroundColor: '#E2E8F0', justifyContent: 'center', paddingHorizontal: 2 },
  toggleTrackActive: { backgroundColor: '#059669' },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  toggleThumbActive: { marginLeft: 24 },
  toggleText: { flex: 1, marginLeft: 12 },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  toggleDesc: { fontSize: 13, color: '#64748B', marginTop: 2 },
  buttonContainer: { marginTop: 8, gap: 12 },
});