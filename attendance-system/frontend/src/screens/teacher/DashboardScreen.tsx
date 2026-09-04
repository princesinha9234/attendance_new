import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Card, Badge, EmptyState, Loading } from '@/components';
import { formatDate, formatRelativeTime, getSessionStatusColor } from '@/utils/format';

export default function TeacherDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [ongoingSessions, setOngoingSessions] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, scheduled: 0, ongoing: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [sessionsRes] = await Promise.all([
        api.getSessions({ limit: 50 }),
      ]);

      if (sessionsRes.data) {
        const sessions = sessionsRes.data;
        setUpcomingSessions(sessions.filter((s: any) => s.status === 'SCHEDULED').slice(0, 5));
        setOngoingSessions(sessions.filter((s: any) => s.status === 'ONGOING'));
        setRecentSessions(sessions.filter((s: any) => s.status === 'COMPLETED').slice(0, 5));
        setStats({
          total: sessions.length,
          scheduled: sessions.filter((s: any) => s.status === 'SCHEDULED').length,
          ongoing: sessions.filter((s: any) => s.status === 'ONGOING').length,
          completed: sessions.filter((s: any) => s.status === 'COMPLETED').length,
        });
      }
    } catch (error) {
      console.error('Fetch dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading size="lg" text="Loading dashboard..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#059669', '#047857']} style={styles.headerGradient} />
      
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{user?.fullName}</Text>
            <Text style={styles.userRole}>{user?.teacherProfile?.designation} • {user?.teacherProfile?.department}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/teacher/profile')}>
            <Ionicons name="settings" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Session Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Total" value={stats.total} color="#059669" icon="document" />
            <StatCard label="Scheduled" value={stats.scheduled} color="#3B82F6" icon="calendar" />
            <StatCard label="Ongoing" value={stats.ongoing} color="#10B981" icon="play-circle" />
            <StatCard label="Completed" value={stats.completed} color="#6B7280" icon="checkmark-circle" />
          </View>
        </View>

        {ongoingSessions.length > 0 && (
          <View style={styles.ongoingSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ongoing Sessions</Text>
            </View>
            <View style={styles.sessionsList}>
              {ongoingSessions.map((session: any) => (
                <OngoingSessionCard key={session.id} session={session} onPress={() => router.push(`/teacher/session-detail?id=${session.id}`)} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.upcomingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
            <TouchableOpacity onPress={() => router.push('/teacher/create-session')}>
              <Text style={styles.seeAll}>Create New</Text>
            </TouchableOpacity>
          </View>
          {upcomingSessions.length > 0 ? (
            <View style={styles.sessionsList}>
              {upcomingSessions.map((session: any) => (
                <SessionCard key={session.id} session={session} onPress={() => router.push(`/teacher/session-detail?id=${session.id}`)} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="📅"
              title="No upcoming sessions"
              message="Create a new session to get started"
              action={{ label: 'Create Session', onPress: () => router.push('/teacher/create-session') }}
            />
          )}
        </View>

        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <TouchableOpacity onPress={() => router.push('/teacher/class-stats')}>
              <Text style={styles.seeAll}>View Analytics</Text>
            </TouchableOpacity>
          </View>
          {recentSessions.length > 0 ? (
            <View style={styles.sessionsList}>
              {recentSessions.map((session: any) => (
                <SessionCard key={session.id} session={session} onPress={() => router.push(`/teacher/session-detail?id=${session.id}`)} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="📊"
              title="No completed sessions"
              message="Your completed sessions will appear here"
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
  icon: string;
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

interface OngoingSessionCardProps {
  session: any;
  onPress: () => void;
}

const OngoingSessionCard = ({ session, onPress }: OngoingSessionCardProps) => (
  <TouchableOpacity style={styles.ongoingCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.ongoingCardHeader}>
      <View style={styles.ongoingStatus}>
        <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
        <Text style={styles.ongoingStatusText}>LIVE</Text>
      </View>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); router.push(`/teacher/qr-display?sessionId=${session.id}`); }} style={styles.qrButton}>
        <Ionicons name="qr-code" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
    <View style={styles.sessionInfo}>
      <Text style={styles.sessionSubject}>{session.subjectClassMapping?.subject?.name}</Text>
      <Text style={styles.sessionClass}>{session.subjectClassMapping?.class?.name}</Text>
    </View>
    <View style={styles.sessionTime}>
      <Text style={styles.sessionTimeText}>{new Date(session.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} - {new Date(session.scheduledEnd).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
    </View>
  </TouchableOpacity>
);

interface SessionCardProps {
  session: any;
  onPress: () => void;
}

const SessionCard = ({ session, onPress }: SessionCardProps) => (
  <TouchableOpacity style={styles.sessionCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.sessionCardHeader}>
      <Badge
        variant={session.status === 'SCHEDULED' ? 'info' : session.status === 'COMPLETED' ? 'default' : 'success'}
        size="sm"
      >
        {session.status}
      </Badge>
      <Text style={styles.sessionDate}>{formatDate(session.scheduledStart)}</Text>
    </View>
    <View style={styles.sessionInfo}>
      <Text style={styles.sessionSubject}>{session.subjectClassMapping?.subject?.name}</Text>
      <Text style={styles.sessionClass}>{session.subjectClassMapping?.class?.name}</Text>
    </View>
    <View style={styles.sessionTime}>
      <Text style={styles.sessionTimeText}>{new Date(session.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
    </View>
  </TouchableOpacity>
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
  userInfo: { gap: 4 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  userRole: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  profileButton: { padding: 8 },
  statsSection: { paddingHorizontal: 24, marginTop: 10, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  seeAll: { fontSize: 14, fontWeight: '600', color: '#059669' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%' },
  statContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statText: { gap: 2 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#64748B' },
  ongoingSection: { paddingHorizontal: 24, marginBottom: 24 },
  ongoingCard: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  ongoingCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ongoingStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  ongoingStatusText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  qrButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  sessionInfo: { gap: 4 },
  sessionSubject: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  sessionClass: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  sessionTime: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  sessionTimeText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  upcomingSection: { paddingHorizontal: 24, marginBottom: 24 },
  recentSection: { paddingHorizontal: 24 },
  sessionsList: { gap: 12 },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sessionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 100 },
  sessionDate: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 16 },
  sessionInfo: { flex: 1, gap: 4 },
  sessionSubject: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  sessionClass: { fontSize: 13, color: '#64748B' },
  sessionTime: { alignItems: 'flex-end', gap: 2 },
  sessionTimeText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
});