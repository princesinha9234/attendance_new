import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Button as AppButton } from '@/components/Button';
import { Card, Badge, Loading, EmptyState, Modal } from '@/components';
import { formatDate, formatTime, getSessionStatusColor } from '@/utils/format';

const Button = AppButton as any;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  moreButton: { padding: 8 },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: -10,
    marginBottom: 20,
  },
  statusInfo: { flex: 1, gap: 2 },
  statusDate: { fontSize: 12, color: '#64748B' },
  statusTime: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  statusActions: { flexDirection: 'row', alignItems: 'center' },
  statsContainer: { paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, minWidth: '45%' },
  statContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statText: { gap: 2 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#647280' },
  sectionCard: { marginHorizontal: 24, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sectionTitle: { flex: 1, marginLeft: 8, fontSize: 16, fontWeight: '700', color: '#1E293B' },
  manualButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  manualButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  attendanceList: { gap: 10 },
  attendanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  studentId: { fontSize: 13, color: '#64748B', marginTop: 2 },
  attendanceStatus: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  method: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  detailsList: { gap: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailContent: { flex: 1, gap: 2 },
  detailLabel: { fontSize: 12, color: '#94A3B8' },
  detailValue: { fontSize: 13, color: '#1E293B', fontWeight: '500' },
  qrActive: { alignItems: 'center', paddingVertical: 4 },
  qrActiveText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  qrExpires: { fontSize: 12, color: '#94A3B8', marginTop: 6 },
  qrModalContent: { alignItems: 'center', gap: 16 },
  qrImageContainer: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16 },
  qrImage: { width: 250, height: 250 },
  qrInstruction: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 12 },
  qrToken: { fontSize: 12, color: '#94A3B8', fontFamily: 'monospace', marginTop: 4 },
  confirmModalContent: { alignItems: 'center', gap: 16 },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  confirmMessage: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  confirmActions: { flexDirection: 'row', width: '100%', marginTop: 8 },
});

interface StatCardProps {
  label: string;
  value: number | string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const StatCard = ({ label, value, color, icon }: StatCardProps) => (
  <Card style={styles.statCard} variant="outlined">
    <View style={styles.statContent}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statText}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  </Card>
);

interface AttendanceRowProps {
  record: any;
}

const AttendanceRow = ({ record }: AttendanceRowProps) => {
  const student = record.student?.user;
  return (
    <View style={styles.attendanceRow}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student?.fullName}</Text>
        <Text style={styles.studentId}>{record.student?.studentId}</Text>
      </View>
      <View style={styles.attendanceStatus}>
        <Badge
          variant={record.status === 'PRESENT' ? 'success' : record.status === 'LATE' ? 'warning' : 'danger'}
          dot
          size="sm"
        >
          {record.status}
        </Badge>
        <Text style={styles.method}>{record.method === 'QR_FACE' ? 'QR+Face' : record.method === 'MANUAL' ? 'Manual' : 'QR'}</Text>
        {record.faceVerified && <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginLeft: 8 }} />}
      </View>
    </View>
  );
};

interface DetailRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}

const DetailRow = ({ icon, label, value }: DetailRowProps) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={18} color="#94A3B8" style={{ width: 24 }} />
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

export default function SessionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showingQR, setShowingQR] = useState(false);
  const [qrData, setQrData] = useState<string>('');
  const [qrImage, setQrImage] = useState<string>('');
  const [generatingQR, setGeneratingQR] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const fetchSession = async () => {
    try {
      const response = await api.getSession(params.id);
      if (response.data) {
        setSession(response.data);
      }
    } catch (error) {
      console.error('Fetch session error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await api.getSessionAttendance(params.id);
      if (response.data) {
        setAttendance(response.data.data);
      }
    } catch (error) {
      console.error('Fetch attendance error:', error);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchAttendance();
  }, [params.id]);

  const generateQR = async () => {
    setGeneratingQR(true);
    try {
      const response = await api.generateQR(params.id);
      if (response.error) throw new Error(response.error);
      
      setQrData(response.data?.token || '');
      setQrImage(response.data?.qrCode || '');
      setShowingQR(true);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to generate QR');
    } finally {
      setGeneratingQR(false);
    }
  };

  const startSession = async () => {
    setStarting(true);
    try {
      const response = await api.startSession(params.id, {});
      if (response.error) throw new Error(response.error);
      fetchSession();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  const endSession = async () => {
    setEnding(true);
    try {
      const response = await api.endSession(params.id);
      if (response.error) throw new Error(response.error);
      fetchSession();
      fetchAttendance();
      setShowEndConfirm(false);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to end session');
    } finally {
      setEnding(false);
    }
  };

  const handleManualAttendance = () => {
    router.push(`/teacher/manual-attendance?sessionId=${params.id}` as any);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loading size="lg" text="Loading session..." />
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <EmptyState icon="📋" title="Session not found" message="This session may have been deleted" />
      </View>
    );
  }

  const subject = session.subjectClassMapping?.subject?.name;
  const className = session.subjectClassMapping?.class?.name;
  const subjectCode = session.subjectClassMapping?.subject?.code;
  const teacher = session.subjectClassMapping?.teacher?.user?.fullName;

  const presentCount = attendance.filter((r: any) => r.status === 'PRESENT').length;
  const absentCount = attendance.filter((r: any) => r.status === 'ABSENT').length;
  const lateCount = attendance.filter((r: any) => r.status === 'LATE').length;
  const totalStudents = session.subjectClassMapping?.class?.students?.length || 0;
  const attendancePercentage = totalStudents > 0 ? Math.round((presentCount + lateCount) / totalStudents * 100) : 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#059669', '#047857']} style={styles.headerGradient} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{subject}</Text>
            <Text style={styles.headerSubtitle}>{className} • {subjectCode}</Text>
          </View>
          <TouchableOpacity style={styles.moreButton} onPress={() => {}}>
            <Ionicons name="ellipsis-horizontal" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.statusBar}>
          <Badge variant={session.status === 'SCHEDULED' ? 'info' : session.status === 'ONGOING' ? 'success' : 'default'} size="md">
            {session.status}
          </Badge>
          <View style={styles.statusInfo}>
            <Text style={styles.statusDate}>{formatDate(session.scheduledStart)}</Text>
            <Text style={styles.statusTime}>{formatTime(session.scheduledStart)} - {formatTime(session.scheduledEnd)}</Text>
          </View>
          {session.teacherId === user?.teacherProfile?.id && session.status !== 'COMPLETED' && (
            <View style={styles.statusActions}>
              {session.status === 'SCHEDULED' && (
                <Button title="Start" variant="primary" size="sm" onPress={startSession} loading={starting} style={{ marginRight: 8 }} />
              )}
              {session.status === 'ONGOING' && (
                <>
                  <Button title="QR Code" variant="outline" size="sm" onPress={generateQR} loading={generatingQR} style={{ marginRight: 8 }} />
                  <Button title="End" variant="danger" size="sm" onPress={() => setShowEndConfirm(true)} loading={ending} />
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.statsContainer}>
          <StatCard label="Present" value={presentCount} color="#10B981" icon="checkmark-circle" />
          <StatCard label="Absent" value={absentCount} color="#EF4444" icon="close-circle" />
          <StatCard label="Late" value={lateCount} color="#F59E0B" icon="time" />
          <StatCard label="Rate" value={`${attendancePercentage}%`} color="#059669" icon="trending-up" />
        </View>

        <Card style={styles.sectionCard} variant="elevated">
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={22} color="#059669" />
            <Text style={styles.sectionTitle}>Attendance Records</Text>
            <TouchableOpacity onPress={handleManualAttendance} style={styles.manualButton}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.manualButtonText}>Manual</Text>
            </TouchableOpacity>
          </View>

          {attendance.length > 0 ? (
            <View style={styles.attendanceList}>
              {attendance.map((record: any) => (
                <AttendanceRow key={record.id} record={record} />
              ))}
            </View>
          ) : (
            <EmptyState icon="👥" title="No attendance yet" message="Students will appear here as they mark attendance" />
          )}
        </Card>

        {session.qrCodeData && session.status === 'ONGOING' && (
          <Card style={styles.sectionCard} variant="outlined" gradientColors={['#ECFDF5', '#D1FAE5']}>
            <View style={styles.sectionHeader}>
              <Ionicons name="qr-code" size={22} color="#059669" />
              <Text style={styles.sectionTitle}>Active QR Code</Text>
            </View>
            <View style={styles.qrActive}>
              <Text style={styles.qrActiveText}>QR code is active. Students can scan to mark attendance.</Text>
              <Text style={styles.qrExpires}>Expires: {session.qrExpiresAt ? formatTime(session.qrExpiresAt) : 'Soon'}</Text>
              <Button title="Show QR Code" variant="primary" size="sm" onPress={generateQR} loading={generatingQR} style={{ marginTop: 12 }} />
            </View>
          </Card>
        )}

        <Card style={styles.sectionCard} variant="elevated">
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={22} color="#059669" />
            <Text style={styles.sectionTitle}>Session Details</Text>
          </View>
          
          <View style={styles.detailsList}>
            <DetailRow icon="person" label="Teacher" value={teacher} />
            <DetailRow icon="school" label="Class" value={className} />
            <DetailRow icon="book" label="Subject" value={`${subject} (${subjectCode})`} />
            <DetailRow icon="calendar" label="Date" value={formatDate(session.scheduledStart)} />
            <DetailRow icon="time" label="Time" value={`${formatTime(session.scheduledStart)} - ${formatTime(session.scheduledEnd)}`} />
            {session.locationLat && session.locationLng && (
              <DetailRow icon="location" label="Location" value={`${session.locationLat.toFixed(4)}, ${session.locationLng.toFixed(4)}`} />
            )}
            {session.allowedRadius && (
              <DetailRow icon="radio" label="Allowed Radius" value={`${session.allowedRadius}m`} />
            )}
            <DetailRow icon={session.requireFaceVerify ? 'shield-checkmark' : 'shield'} label="Face Verification" value={session.requireFaceVerify ? 'Required' : 'Not Required'} />
            {session.actualStart && (
              <DetailRow icon="play-circle" label="Actual Start" value={formatTime(session.actualStart)} />
            )}
            {session.actualEnd && (
              <DetailRow icon="stop-circle" label="Actual End" value={formatTime(session.actualEnd)} />
            )}
          </View>
        </Card>
      </ScrollView>

      <Modal visible={showingQR} onClose={() => setShowingQR(false)} size="lg" title="QR Code for Attendance">
        <View style={styles.qrModalContent}>
          {qrImage ? (
            <View style={styles.qrImageContainer}>
              <Image source={{ uri: qrImage }} style={styles.qrImage} />
            </View>
          ) : (
            <Loading text="Generating QR..." />
          )}
          <Text style={styles.qrInstruction}>Students scan this QR to mark attendance</Text>
          <Text style={styles.qrToken}>Token: {qrData?.substring(0, 16)}...</Text>
        </View>
      </Modal>

      <Modal visible={showEndConfirm} onClose={() => setShowEndConfirm(false)} size="sm" title="End Session">
        <View style={styles.confirmModalContent}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={styles.confirmTitle}>End Session?</Text>
          <Text style={styles.confirmMessage}>
            This will stop the QR code and mark the session as completed. Students will no longer be able to mark attendance.
          </Text>
          <View style={styles.confirmActions}>
            <Button title="Cancel" variant="outline" onPress={() => setShowEndConfirm(false)} style={{ flex: 1, marginRight: 8 }} />
            <Button title="End Session" variant="danger" onPress={endSession} loading={ending} style={{ flex: 1, marginLeft: 8 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}