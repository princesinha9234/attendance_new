import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Card, CardHeader, CardFooter, Badge, Avatar, EmptyState, Loading } from '@/components';
import { formatDate, formatRelativeTime, getAttendanceStatusColor } from '@/utils/format';

export default function StudentDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [sessionsRes, attendanceRes] = await Promise.all([
        api.getUpcomingSessions(),
        api.getMyAttendance({ limit: 10 }),
      ]);

      if (sessionsRes.data?.sessions) {
        setUpcomingSessions(sessionsRes.data.sessions);
      }
      if (attendanceRes.data) {
        const records = Array.isArray(attendanceRes.data)
          ? attendanceRes.data
          : attendanceRes.data.data;
        setRecentAttendance(records);
        setStats({
          present: records.filter((r: any) => r.status === 'PRESENT').length,
          absent: records.filter((r: any) => r.status === 'ABSENT').length,
          late: records.filter((r: any) => r.status === 'LATE').length,
          total: records.length,
        });
      }
    } catch (error) {
      console.error('Fetch dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading size="lg" text="Loading dashboard..." />
      </View>
    );
  }

  const studentProfile = user?.studentProfile;
  const nextSession = upcomingSessions[0];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.headerGradient} />
      
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Avatar name={user?.fullName} size="lg" status="online" />
            <View style={styles.userDetails}>
              <Text style={styles.greeting}>Good morning,</Text>
              <Text style={styles.userName}>{user?.fullName}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/student/profile' as any)}>
            <Ionicons name="settings" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Attendance</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Present" value={stats.present} color="#10B981" icon="checkmark-circle" />
            <StatCard label="Absent" value={stats.absent} color="#EF4444" icon="close-circle" />
            <StatCard label="Late" value={stats.late} color="#F59E0B" icon="time" />
            <StatCard label="Total" value={stats.total} color="#2563EB" icon="document" />
          </View>
        </View>

        {nextSession && (
          <View style={styles.nextSessionSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Next Session</Text>
              <TouchableOpacity onPress={() => router.push('/student/scan-qr' as any)}>
                <Text style={styles.seeAll}>Scan QR</Text>
              </TouchableOpacity>
            </View>
            <Card variant="gradient" gradientColors={['#2563EB', '#1D4ED8']} style={styles.nextSessionCard}>
              <View style={styles.nextSessionContent}>
                <View>
                  <Text style={styles.nextSessionSubject}>{nextSession.subjectClassMapping?.subject?.name}</Text>
                  <Text style={styles.nextSessionClass}>{nextSession.subjectClassMapping?.class?.name}</Text>
                  <Text style={styles.nextSessionTeacher}>{nextSession.subjectClassMapping?.teacher?.user?.fullName}</Text>
                </View>
                <View style={styles.nextSessionTime}>
                  <Text style={styles.nextSessionDate}>{formatDate(nextSession.scheduledStart)}</Text>
                  <Text style={styles.nextSessionTimeText}>{new Date(nextSession.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} - {new Date(nextSession.scheduledEnd).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                  {nextSession.requireFaceVerify && (
                    <Badge variant="info" size="sm" style={{ marginTop: 8 }}>Face Verify Required</Badge>
                  )}
                </View>
              </View>
              <CardFooter>
                <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/student/scan-qr' as any)}>
                  <Ionicons name="qr-code" size={20} color="#FFFFFF" />
                  <Text style={styles.scanButtonText}>Scan QR to Attend</Text>
                </TouchableOpacity>
              </CardFooter>
            </Card>
          </View>
        )}

        <View style={styles.upcomingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
          </View>
          {upcomingSessions.length > 1 ? (
            <View style={styles.sessionsList}>
              {upcomingSessions.slice(1, 4).map((session: any) => (
                <SessionCard key={session.id} session={session} onPress={() => router.push('/student/scan-qr' as any)} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="📅"
              title="No upcoming sessions"
              message="Your next classes will appear here"
            />
          )}
        </View>

        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Attendance</Text>
            <TouchableOpacity onPress={() => router.push('/student/attendance-history' as any)}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentAttendance.length > 0 ? (
            <View style={styles.attendanceList}>
              {recentAttendance.slice(0, 5).map((record: any) => (
                <AttendanceCard key={record.id} record={record} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="📋"
              title="No attendance records"
              message="Your attendance history will appear here"
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: number;
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

interface SessionCardProps {
  session: any;
  onPress: () => void;
}

const SessionCard = ({ session, onPress }: SessionCardProps) => (
  <TouchableOpacity style={styles.sessionCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.sessionCardContent}>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionSubject}>{session.subjectClassMapping?.subject?.name}</Text>
        <Text style={styles.sessionClass}>{session.subjectClassMapping?.class?.name} • {session.subjectClassMapping?.teacher?.user?.fullName}</Text>
      </View>
      <View style={styles.sessionTime}>
        <Text style={styles.sessionDate}>{formatDate(session.scheduledStart)}</Text>
        <Text style={styles.sessionTimeText}>{new Date(session.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

interface AttendanceCardProps {
  record: any;
}

const AttendanceCard = ({ record }: AttendanceCardProps) => (
  <Card style={styles.attendanceCard}>
    <View style={styles.attendanceCardContent}>
      <View style={styles.attendanceInfo}>
        <Text style={styles.attendanceSubject}>{record.session?.subjectClassMapping?.subject?.name}</Text>
        <Text style={styles.attendanceClass}>{record.session?.subjectClassMapping?.class?.name} • {formatRelativeTime(record.markedAt)}</Text>
      </View>
      <View style={styles.attendanceStatus}>
        <Badge
          variant={record.status === 'PRESENT' ? 'success' : record.status === 'LATE' ? 'warning' : 'danger'}
          dot
          size="md"
        >
          {record.status}
        </Badge>
        <Text style={styles.attendanceMethod}>{record.method === 'QR_FACE' ? 'QR + Face' : record.method === 'MANUAL' ? 'Manual' : 'QR Only'}</Text>
      </View>
    </View>
  </Card>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 30 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  userDetails: { gap: 2 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  profileButton: { padding: 8 },
  statsSection: { paddingHorizontal: 24, marginTop: 10, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  seeAll: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%' },
  statContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statText: { gap: 2 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#64748B' },
  nextSessionSection: { paddingHorizontal: 24, marginBottom: 24 },
  nextSessionCard: { width: '100%' },
  nextSessionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  nextSessionSubject: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  nextSessionClass: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  nextSessionTeacher: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  nextSessionTime: { alignItems: 'flex-end', gap: 2 },
  nextSessionDate: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  nextSessionTimeText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  scanButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  upcomingSection: { paddingHorizontal: 24, marginBottom: 24 },
  sessionsList: { gap: 10 },
  sessionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  sessionCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  sessionInfo: { flex: 1 },
  sessionSubject: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  sessionClass: { fontSize: 13, color: '#64748B', marginTop: 2 },
  sessionTime: { alignItems: 'flex-end', gap: 2 },
  sessionDate: { fontSize: 12, color: '#94A3B8' },
  sessionTimeText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  recentSection: { paddingHorizontal: 24 },
  attendanceList: { gap: 10 },
  attendanceCard: { padding: 16 },
  attendanceCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  attendanceInfo: { flex: 1 },
  attendanceSubject: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  attendanceClass: { fontSize: 13, color: '#64748B', marginTop: 2 },
  attendanceStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attendanceMethod: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
});