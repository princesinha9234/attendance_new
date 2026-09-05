import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Card, Badge, EmptyState, Loading } from '@/components';
import {
  formatDate,
  formatRelativeTime,
} from '@/utils/format';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Session {
  id: string;
  subjectId?: string;
  subject?: string;
  classId?: string;
  className?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  attendanceCount?: number;
  totalStudents?: number;
  latitude?: number;
  longitude?: number;
}

interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  totalStudents: number;
  attendanceRate: number;
}

const getSubjectName = (session: Session): string => {
  if (session.subject) {
    return session.subject;
  }

  if (session.subjectId) {
    return session.subjectId;
  }

  return 'Subject';
};

const getClassName = (session: Session): string => {
  if (session.className) {
    return session.className;
  }

  if (session.classId) {
    return session.classId;
  }

  return 'Class';
};

const formatTime = (time?: string): string => {
  if (!time) {
    return '--:--';
  }

  const parts = time.split(':');

  if (parts.length < 2) {
    return time;
  }

  const hour = Number(parts[0]);
  const minute = parts[1];

  if (Number.isNaN(hour)) {
    return time;
  }

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
};

interface OngoingSessionCardProps {
  session: Session;
  onPress: () => void;
  onQrPress: () => void;
}

const OngoingSessionCard = ({
  session,
  onPress,
  onQrPress,
}: OngoingSessionCardProps) => {
  return (
    <Card style={styles.ongoingCard}>
      <View style={styles.ongoingHeader}>
        <View style={styles.ongoingIconContainer}>
          <Ionicons
            name="radio"
            size={22}
            color="#fff"
          />
        </View>

        <View style={styles.ongoingTitleContainer}>
          <Text style={styles.ongoingTitle}>
            Ongoing Session
          </Text>

          <Text style={styles.ongoingSubtitle}>
            Students can mark attendance now
          </Text>
        </View>

        <View style={styles.liveDot} />
      </View>

      <View style={styles.ongoingInfo}>
        <Text style={styles.ongoingSubject}>
          {getSubjectName(session)}
        </Text>

        <Text style={styles.ongoingClass}>
          {getClassName(session)}
        </Text>

        <View style={styles.ongoingTime}>
          <Ionicons
            name="time-outline"
            size={16}
            color="#666"
          />

          <Text style={styles.ongoingTimeText}>
            {formatTime(session.startTime)} -{' '}
            {formatTime(session.endTime)}
          </Text>
        </View>
      </View>

      <View style={styles.ongoingActions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Ionicons
            name="eye-outline"
            size={18}
            color="#333"
          />

          <Text style={styles.secondaryButtonText}>
            View
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onQrPress}
          activeOpacity={0.8}
        >
          <Ionicons
            name="qr-code-outline"
            size={18}
            color="#fff"
          />

          <Text style={styles.primaryButtonText}>
            Show QR
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    activeSessions: 0,
    totalStudents: 0,
    attendanceRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Expo Router typed routes can reject dynamically-created
   * paths even when the route exists.
   *
   * Casting to Href keeps the navigation type-safe at runtime
   * while allowing dynamic query strings.
   */
  const navigate = useCallback(
    (path: string) => {
      router.push(path as Href<string>);
    },
    [router]
  );

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const response = await api.getSessions({
        limit: 20,
      });

      const responseData = response?.data;

      let sessionList: Session[] = [];

      if (Array.isArray(responseData)) {
        sessionList = responseData as Session[];
      } else if (
        responseData &&
        Array.isArray(
          (responseData as { sessions?: unknown }).sessions
        )
      ) {
        sessionList = (
          responseData as { sessions?: Session[] }
        ).sessions as Session[];
      } else if (
        responseData &&
        Array.isArray(
          (responseData as { data?: unknown }).data
        )
      ) {
        sessionList = (responseData as { data: Session[] }).data;
      }

      setSessions(sessionList);

      const activeSessions = sessionList.filter(
        (session) =>
          session.status?.toLowerCase() === 'active' ||
          session.status?.toLowerCase() === 'ongoing'
      );

      const totalStudents = sessionList.reduce(
        (total, session) =>
          total + (session.totalStudents || 0),
        0
      );

      const totalAttendance = sessionList.reduce(
        (total, session) =>
          total + (session.attendanceCount || 0),
        0
      );

      const attendanceRate =
        totalStudents > 0
          ? Math.round(
              (totalAttendance / totalStudents) * 100
            )
          : 0;

      setStats({
        totalSessions: sessionList.length,
        activeSessions: activeSessions.length,
        totalStudents,
        attendanceRate,
      });
    } catch (err: any) {
      console.error(
        'Dashboard fetch error:',
        err
      );

      setError(
        err?.message ||
          'Failed to load dashboard data.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const ongoingSessions = sessions.filter(
    (session) =>
      session.status?.toLowerCase() === 'active' ||
      session.status?.toLowerCase() === 'ongoing'
  );

  const recentSessions = sessions
    .filter(
      (session) =>
        session.status?.toLowerCase() !== 'active' &&
        session.status?.toLowerCase() !== 'ongoing'
    )
    .slice(0, 5);

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>
                Welcome back,
              </Text>

              <Text style={styles.userName}>
                {(user as any)?.name || 'Teacher'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() =>
                navigate('/teacher/profile')
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-outline"
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.headerDate}>
            {formatDate(new Date().toISOString())}
          </Text>
        </LinearGradient>

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="warning-outline"
              size={20}
              color="#B91C1C"
            />

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="calendar-outline"
            title="Sessions"
            value={String(stats.totalSessions)}
          />

          <StatCard
            icon="radio-outline"
            title="Active"
            value={String(stats.activeSessions)}
          />

          <StatCard
            icon="people-outline"
            title="Students"
            value={String(stats.totalStudents)}
          />

          <StatCard
            icon="stats-chart-outline"
            title="Attendance"
            value={`${stats.attendanceRate}%`}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Quick Actions
          </Text>

          <View style={styles.quickActions}>
            <QuickAction
              icon="add-circle-outline"
              title="Create Session"
              onPress={() =>
                navigate('/teacher/create-session')
              }
            />

            <QuickAction
              icon="stats-chart-outline"
              title="Class Stats"
              onPress={() =>
                navigate('/teacher/class-stats')
              }
            />

            <QuickAction
              icon="calendar-outline"
              title="All Sessions"
              onPress={() =>
                navigate('/teacher/sessions')
              }
            />
          </View>
        </View>

        {/* Ongoing Sessions */}
        {ongoingSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Ongoing Sessions
            </Text>

            {ongoingSessions.map((session) => (
              <OngoingSessionCard
                key={session.id}
                session={session}
                onPress={() =>
                  navigate(
                    `/teacher/session-detail?id=${session.id}`
                  )
                }
                onQrPress={() =>
                  navigate(
                    `/teacher/qr-display?sessionId=${session.id}`
                  )
                }
              />
            ))}
          </View>
        )}

        {/* Recent Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Recent Sessions
            </Text>

            {recentSessions.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  navigate('/teacher/sessions')
                }
              >
                <Text style={styles.viewAllText}>
                  View All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {recentSessions.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              message="Create your first attendance session to get started."
              icon="calendar-outline"
            />
          ) : (
            recentSessions.map((session) => (
              <RecentSessionCard
                key={session.id}
                session={session}
                onPress={() =>
                  navigate(
                    `/teacher/session-detail?id=${session.id}`
                  )
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

interface StatCardProps {
  icon: IoniconName;
  title: string;
  value: string;
}

function StatCard({
  icon,
  title,
  value,
}: StatCardProps) {
  return (
    <Card style={styles.statCard}>
      <Ionicons
        name={icon}
        size={24}
        color="#4F46E5"
      />

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statTitle}>
        {title}
      </Text>
    </Card>
  );
}

interface QuickActionProps {
  icon: IoniconName;
  title: string;
  onPress: () => void;
}

function QuickAction({
  icon,
  title,
  onPress,
}: QuickActionProps) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.quickActionIcon}>
        <Ionicons
          name={icon}
          size={26}
          color="#4F46E5"
        />
      </View>

      <Text style={styles.quickActionText}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

interface RecentSessionCardProps {
  session: Session;
  onPress: () => void;
}

function RecentSessionCard({
  session,
  onPress,
}: RecentSessionCardProps) {
  const status =
    session.status?.toLowerCase() || 'completed';

  let badgeText = 'Completed';

  if (status === 'cancelled') {
    badgeText = 'Cancelled';
  } else if (status === 'scheduled') {
    badgeText = 'Scheduled';
  } else if (status === 'completed') {
    badgeText = 'Completed';
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Card style={styles.sessionCard}>
        <View style={styles.sessionIcon}>
          <Ionicons
            name="calendar-outline"
            size={22}
            color="#4F46E5"
          />
        </View>

        <View style={styles.sessionInfo}>
          <Text
            style={styles.sessionSubject}
            numberOfLines={1}
          >
            {getSubjectName(session)}
          </Text>

          <Text
            style={styles.sessionClass}
            numberOfLines={1}
          >
            {getClassName(session)}
          </Text>

          <View style={styles.sessionTime}>
            <Ionicons
              name="time-outline"
              size={14}
              color="#777"
            />

            <Text style={styles.sessionTimeText}>
              {formatTime(session.startTime)}
              {session.endTime
                ? ` - ${formatTime(session.endTime)}`
                : ''}
            </Text>
          </View>
        </View>

        <View style={styles.sessionRight}>
          <Badge
            variant={
              status === 'cancelled'
                ? 'danger'
                : status === 'scheduled'
                ? 'warning'
                : 'success'
            }
          >
            {badgeText}
          </Badge>

          {session.date && (
            <Text style={styles.sessionDate}>
              {formatRelativeTime(session.date)}
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  scrollContent: {
    paddingBottom: 30,
  },

  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  welcomeText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 3,
  },

  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },

  headerDate: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },

  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  errorContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorText: {
    flex: 1,
    marginLeft: 10,
    color: '#B91C1C',
    fontSize: 14,
  },

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginTop: 16,
  },

  statCard: {
    width: '46%',
    marginHorizontal: '2%',
    marginBottom: 12,
    padding: 16,
    alignItems: 'flex-start',
  },

  statValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },

  statTitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },

  section: {
    marginTop: 22,
    paddingHorizontal: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  viewAllText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  quickAction: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },

  ongoingCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  ongoingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ongoingIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ongoingTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },

  ongoingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  ongoingSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },

  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },

  ongoingInfo: {
    marginTop: 16,
  },

  ongoingSubject: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  ongoingClass: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },

  ongoingTime: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  ongoingTimeText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#6B7280',
  },

  ongoingActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },

  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    marginLeft: 7,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    marginLeft: 7,
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },

  sessionCard: {
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sessionInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  sessionSubject: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  sessionClass: {
    marginTop: 3,
    fontSize: 12,
    color: '#6B7280',
  },

  sessionTime: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },

  sessionTimeText: {
    marginLeft: 5,
    fontSize: 11,
    color: '#777',
  },

  sessionRight: {
    alignItems: 'flex-end',
  },

  sessionDate: {
    marginTop: 7,
    fontSize: 10,
    color: '#9CA3AF',
  },
});