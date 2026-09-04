import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Card, Badge, EmptyState, Loading } from '@/components';
import { formatDate, formatRelativeTime, getAttendanceStatusColor } from '@/utils/format';

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');

  const fetchRecords = async (pageNum = 1, append = false) => {
    try {
      const status = filter === 'all' ? undefined : filter.toUpperCase();
      const response = await api.getMyAttendance({ 
        page: pageNum, 
        limit: 20,
        status,
      });

      if (response.data) {
        if (append) {
          setRecords(prev => [...prev, ...response.data!]);
        } else {
          setRecords(response.data);
        }
        setHasMore(response.pagination?.page < response.pagination?.pages);
      }
    } catch (error) {
      console.error('Fetch attendance error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.getMyAttendance({ limit: 1000 });
      if (response.data) {
        const data = response.data;
        setStats({
          present: data.filter((r: any) => r.status === 'PRESENT').length,
          absent: data.filter((r: any) => r.status === 'ABSENT').length,
          late: data.filter((r: any) => r.status === 'LATE').length,
          total: data.length,
        });
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  useEffect(() => {
    fetchRecords(1);
    fetchStats();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords(1);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchRecords(page + 1, true);
      setPage(page + 1);
    }
  };

  const filteredRecords = records.filter(r => 
    filter === 'all' || r.status.toLowerCase() === filter
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.headerGradient} />
      
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
        contentContainerStyle={styles.scrollContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance History</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.statsContainer}>
          <StatCard label="Present" value={stats.present} color="#10B981" icon="checkmark-circle" />
          <StatCard label="Absent" value={stats.absent} color="#EF4444" icon="close-circle" />
          <StatCard label="Late" value={stats.late} color="#F59E0B" icon="time" />
          <StatCard label="Total" value={stats.total} color="#2563EB" icon="document" />
        </View>

        <View style={styles.filterContainer}>
          {(['all', 'present', 'absent', 'late'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterButton,
                filter === f && styles.filterButtonActive,
              ]}
              onPress={() => { setFilter(f); setPage(1); fetchRecords(1); }}
            >
              <Text style={[
                styles.filterButtonText,
                filter === f && styles.filterButtonTextActive,
              ]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && filteredRecords.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Loading size="lg" text="Loading attendance..." />
          </View>
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No attendance records"
            message={filter === 'all' ? 'Your attendance history will appear here' : `No ${filter} records found`}
          />
        ) : (
          <View style={styles.recordsList}>
            {filteredRecords.map(record => (
              <AttendanceRecordCard key={record.id} record={record} />
            ))}
            
            {hasMore && !loading && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            )}
            
            {loading && records.length > 0 && (
              <View style={styles.loadingMore}>
                <Loading size="sm" text="Loading more..." />
              </View>
            )}
          </View>
        )}
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

interface AttendanceRecordCardProps {
  record: any;
}

const AttendanceRecordCard = ({ record }: AttendanceRecordCardProps) => {
  const session = record.session;
  const subject = session?.subjectClassMapping?.subject?.name;
  const className = session?.subjectClassMapping?.class?.name;
  const teacher = session?.subjectClassMapping?.teacher?.user?.fullName;
  const date = formatDate(record.markedAt);
  const time = new Date(record.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <Card style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordSubject}>
          <Text style={styles.recordSubjectName}>{subject}</Text>
          <Text style={styles.recordClass}>{className}</Text>
        </View>
        <Badge
          variant={record.status === 'PRESENT' ? 'success' : record.status === 'LATE' ? 'warning' : 'danger'}
          dot
          size="md"
        >
          {record.status}
        </Badge>
      </View>

      <View style={styles.recordDetails}>
        <DetailRow icon="person" label="Teacher" value={teacher} />
        <DetailRow icon="time" label="Date & Time" value={`${date} at ${time}`} />
        <DetailRow icon={record.method === 'QR_FACE' ? 'scan-face' : record.method === 'MANUAL' ? 'create' : 'qr-code'} 
          label="Method" 
          value={record.method === 'QR_FACE' ? 'QR + Face' : record.method === 'MANUAL' ? 'Manual by Teacher' : 'QR Only'} 
        />
        {record.faceVerified && (
          <DetailRow icon="checkmark-shield" label="Face Verified" value={`${Math.round((record.faceMatchScore || 1) * 100)}% match`} />
        )}
        {record.latitude && record.longitude && (
          <DetailRow icon="location" label="Location" value={`${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}`} />
        )}
      </View>
    </Card>
  );
};

interface DetailRowProps {
  icon: string;
  label: string;
  value: string;
}

const DetailRow = ({ icon, label, value }: DetailRowProps) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={18} color="#94A3B8" style={{ width: 24 }} />
    <View style={styles.detailContent} flex={1}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
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
  statsContainer: { paddingHorizontal: 24, marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, minWidth: '45%' },
  statContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statText: { gap: 2 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#64748B' },
  filterContainer: { paddingHorizontal: 24, flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  filterButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterButtonText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  filterButtonTextActive: { color: '#FFFFFF' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  recordsList: { paddingHorizontal: 24, gap: 12 },
  recordCard: { padding: 16 },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  recordSubject: { flex: 1 },
  recordSubjectName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  recordClass: { fontSize: 13, color: '#64748B', marginTop: 2 },
  recordDetails: { gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailContent: { flex: 1, gap: 2 },
  detailLabel: { fontSize: 12, color: '#94A3B8' },
  detailValue: { fontSize: 13, color: '#1E293B', fontWeight: '500' },
  loadMoreButton: { padding: 16, alignItems: 'center', marginTop: 8 },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  loadingMore: { padding: 16, alignItems: 'center' },
});