import React, { ComponentProps, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Card, Badge, Loading, EmptyState } from '@/components';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState({
    totalInstitutions: 0,
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSessions: 0,
    totalAttendanceRecords: 0,
    avgAttendanceRate: 0,
  });
  const [institutionStats, setInstitutionStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    try {
      const [statsRes, instRes] = await Promise.all([
        api.getUserStats(),
        api.getInstitutions(),
      ]);

      if (statsRes.data) {
        setPlatformStats(statsRes.data);
      }

      if (instRes.data?.institutions) {
        const statsPromises = instRes.data.institutions.map(async (inst: any) => {
          try {
            // In real app, you'd have an analytics endpoint per institution
            return {
              ...inst,
              attendanceRate: Math.floor(Math.random() * 30) + 70,
              activeUsers: Math.floor(Math.random() * 500) + 100,
              sessionsThisMonth: Math.floor(Math.random() * 200) + 50,
            };
          } catch {
            return {
              ...inst,
              attendanceRate: 0,
              activeUsers: 0,
              sessionsThisMonth: 0,
            };
          }
        });

        const results = await Promise.all(statsPromises);
        setInstitutionStats(results);
      }
    } catch (error) {
      console.error('Fetch analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loading size="lg" text="Loading analytics..." />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.headerGradient} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Platform Analytics</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Platform Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Institutions" value={platformStats.totalInstitutions} color="#7C3AED" icon="business" />
            <StatCard label="Total Users" value={platformStats.totalUsers} color="#059669" icon="people" />
            <StatCard label="Students" value={platformStats.totalStudents} color="#2563EB" icon="school" />
            <StatCard label="Teachers" value={platformStats.totalTeachers} color="#F59E0B" icon="person" />
            <StatCard label="Classes" value={platformStats.totalClasses} color="#EC4899" icon="layers" />
            <StatCard label="Sessions" value={platformStats.totalSessions} color="#10B981" icon="calendar" />
            <StatCard label="Attendance" value={platformStats.totalAttendanceRecords} color="#8B5CF6" icon="document" />
            <StatCard label="Avg. Attendance" value={`${platformStats.avgAttendanceRate || 0}%`} color="#EF4444" icon="trending-up" />
          </View>
        </View>

        <View style={styles.institutionsSection}>
          <Text style={styles.sectionTitle}>Institution Performance</Text>
          {institutionStats.length > 0 ? (
            <View style={styles.institutionsList}>
              {institutionStats.map((inst: any) => (
                <InstitutionPerformanceCard key={inst.id} institution={inst} />
              ))}
            </View>
          ) : (
            <EmptyState icon="🏫" title="No institutions" message="Create institutions to see analytics" />
          )}
        </View>

        <View style={styles.growthSection}>
          <Text style={styles.sectionTitle}>Growth Metrics</Text>
          <View style={styles.growthGrid}>
            <GrowthCard label="New Users (30d)" value="+247" trend="up" color="#10B981" />
            <GrowthCard label="New Sessions (30d)" value="+1,234" trend="up" color="#2563EB" />
            <GrowthCard label="Attendance Rate" value="+2.3%" trend="up" color="#059669" />
            <GrowthCard label="Active Institutions" value="+5" trend="up" color="#7C3AED" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  color: string;
  icon: ComponentProps<typeof Ionicons>['name'];
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

interface InstitutionPerformanceCardProps {
  institution: any;
}

const InstitutionPerformanceCard = ({ institution }: InstitutionPerformanceCardProps) => (
  <Card style={styles.instCard} variant="elevated">
    <View style={styles.instHeader}>
      <View style={styles.instInfo}>
        <Text style={styles.instName}>{institution.name}</Text>
        <Text style={styles.instLocation}>{institution.city}, {institution.state}</Text>
      </View>
      <View style={styles.instRate}>
        <Text style={[styles.instRateValue, { color: institution.attendanceRate >= 80 ? '#10B981' : institution.attendanceRate >= 60 ? '#F59E0B' : '#EF4444' }]}>
          {institution.attendanceRate}%
        </Text>
        <Text style={styles.instRateLabel}>Attendance Rate</Text>
      </View>
    </View>
    <View style={styles.instMetrics}>
      <Metric label="Active Users" value={institution.activeUsers} />
      <Metric label="Sessions (30d)" value={institution.sessionsThisMonth} />
      <Metric label="Classes" value={institution._count?.classes || 0} />
      <Metric label="Subjects" value={institution._count?.subjects || 0} />
    </View>
  </Card>
);

interface MetricProps {
  label: string;
  value: number;
}

const Metric = ({ label, value }: MetricProps) => (
  <View style={styles.metric}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

interface GrowthCardProps {
  label: string;
  value: string;
  trend: 'up' | 'down';
  color: string;
}

const GrowthCard = ({ label, value, trend, color }: GrowthCardProps) => (
  <Card style={styles.growthCard} variant="outlined">
    <View style={styles.growthContent}>
      <View style={[styles.growthIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={trend === 'up' ? 'trending-up' : 'trending-down'} size={24} color={color} />
      </View>
      <View style={styles.growthText}>
        <Text style={[styles.growthValue, { color }]}>{value}</Text>
        <Text style={styles.growthLabel}>{label}</Text>
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
    height: 140,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, gap: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  statsSection: { gap: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%' },
  statContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statText: { gap: 2 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#64748B' },
  institutionsSection: { gap: 16 },
  institutionsList: { gap: 16 },
  instCard: { width: '100%', padding: 20 },
  instHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  instInfo: { flex: 1 },
  instName: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  instLocation: { fontSize: 13, color: '#64748B', marginTop: 2 },
  instRate: { alignItems: 'flex-end', gap: 2 },
  instRateValue: { fontSize: 28, fontWeight: '700' },
  instRateLabel: { fontSize: 12, color: '#64748B' },
  instMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metric: { flex: 1, minWidth: '40%', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, alignItems: 'center', gap: 4 },
  metricValue: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  metricLabel: { fontSize: 11, color: '#64748B' },
  growthSection: { gap: 16 },
  growthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  growthCard: { flex: 1, minWidth: '45%', padding: 16 },
  growthContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  growthIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  growthText: { gap: 2 },
  growthValue: { fontSize: 20, fontWeight: '700' },
  growthLabel: { fontSize: 12, color: '#64748B' },
});