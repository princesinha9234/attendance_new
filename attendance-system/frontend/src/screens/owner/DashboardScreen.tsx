import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Card, Badge, Loading, EmptyState } from '@/components';

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalStudents: 0, totalTeachers: 0, totalInstitutions: 0 });
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, instRes, usersRes] = await Promise.all([
        api.getUserStats(),
        api.getInstitutions(),
        api.getUsers({ limit: 10 }),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (instRes.data?.institutions) setInstitutions(instRes.data.institutions.slice(0, 5));
      if (usersRes.data) setRecentUsers(usersRes.data);
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
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loading size="lg" text="Loading dashboard..." />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.headerGradient} />
      
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.fullName}</Text>
            <Text style={styles.userRole}>Platform Owner</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/owner/profile')}>
            <Ionicons name="settings" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Platform Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Institutions" value={stats.totalInstitutions} color="#7C3AED" icon="business" />
            <StatCard label="Total Users" value={stats.totalUsers} color="#059669" icon="people" />
            <StatCard label="Students" value={stats.totalStudents} color="#2563EB" icon="school" />
            <StatCard label="Teachers" value={stats.totalTeachers} color="#F59E0B" icon="person" />
          </View>
        </View>

        <View style={styles.institutionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Institutions</Text>
            <TouchableOpacity onPress={() => router.push('/owner/institutions')}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {institutions.length > 0 ? (
            <View style={styles.institutionsList}>
              {institutions.map((inst: any) => (
                <InstitutionCard key={inst.id} institution={inst} onPress={() => router.push('/owner/institutions')} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="🏫"
              title="No institutions yet"
              message="Create your first institution to get started"
              action={{ label: 'Create Institution', onPress: () => router.push('/owner/institutions') }}
            />
          )}
        </View>

        <View style={styles.recentUsersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Users</Text>
            <TouchableOpacity onPress={() => router.push('/owner/users')}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentUsers.length > 0 ? (
            <View style={styles.usersList}>
              {recentUsers.slice(0, 5).map((user: any) => (
                <UserCard key={user.id} user={user} />
              ))}
            </View>
          ) : (
            <EmptyState icon="👥" title="No users yet" message="Users will appear here as they register" />
          )}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionButton icon="add" label="Add Institution" color="#7C3AED" onPress={() => router.push('/owner/institutions')} />
            <ActionButton icon="person-add" label="Add User" color="#059669" onPress={() => router.push('/owner/users')} />
            <ActionButton icon="analytics" label="View Analytics" color="#2563EB" onPress={() => router.push('/owner/analytics')} />
            <ActionButton icon="settings" label="Settings" color="#6B7280" onPress={() => router.push('/owner/profile')} />
          </View>
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

interface InstitutionCardProps {
  institution: any;
  onPress: () => void;
}

const InstitutionCard = ({ institution, onPress }: InstitutionCardProps) => (
  <TouchableOpacity style={styles.institutionCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.institutionInfo}>
      <Text style={styles.institutionName}>{institution.name}</Text>
      <Text style={styles.institutionLocation}>{institution.city}, {institution.state}</Text>
      <Text style={styles.institutionCode}>Code: {institution.code}</Text>
    </View>
    <View style={styles.institutionStats}>
      <Text style={styles.institutionStatLabel}>Teachers</Text>
      <Text style={styles.institutionStatValue}>{institution._count?.teachers || 0}</Text>
      <Text style={styles.institutionStatLabel}>Classes</Text>
      <Text style={styles.institutionStatValue}>{institution._count?.classes || 0}</Text>
    </View>
  </TouchableOpacity>
);

interface UserCardProps {
  user: any;
}

const UserCard = ({ user }: UserCardProps) => (
  <View style={styles.userCard}>
    <View style={styles.userInfo}>
      <Text style={styles.userName}>{user.fullName}</Text>
      <Text style={styles.userEmail}>{user.email}</Text>
    </View>
    <Badge
      variant={user.role === 'STUDENT' ? 'info' : user.role === 'TEACHER' ? 'success' : 'default'}
      size="sm"
    >
      {user.role}
    </Badge>
  </View>
);

interface ActionButtonProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

const ActionButton = ({ icon, label, color, onPress }: ActionButtonProps) => (
  <TouchableOpacity style={[styles.actionButton, { borderColor: color }]} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.actionIcon, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
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
  seeAll: { fontSize: 14, fontWeight: '600', color: '#7C3AED' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%' },
  statContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statText: { gap: 2 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#64748B' },
  institutionsSection: { paddingHorizontal: 24, marginBottom: 24 },
  institutionsList: { gap: 12 },
  institutionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  institutionInfo: { flex: 1 },
  institutionName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  institutionLocation: { fontSize: 13, color: '#64748B', marginTop: 2 },
  institutionCode: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  institutionStats: { flexDirection: 'row', gap: 20 },
  institutionStatLabel: { fontSize: 11, color: '#94A3B8' },
  institutionStatValue: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  recentUsersSection: { paddingHorizontal: 24, marginBottom: 24 },
  usersList: { gap: 10 },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  userEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },
  quickActions: { paddingHorizontal: 24 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
});