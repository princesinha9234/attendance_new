import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/Button';
import { Card, Badge, Loading, EmptyState } from '@/components';

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

const StatCard = ({ label, value, color }: StatCardProps) => (
  <Card style={styles.statCard} variant="outlined">
    <View style={styles.statContent}>
      <View style={styles.statText}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  </Card>
);

interface StudentRowProps {
  student: any;
  onMarkAttendance: (id: string, status: string) => void;
  saving: boolean;
}

const StudentRow = ({ student, onMarkAttendance, saving }: StudentRowProps) => {
  const attendance = student.attendance;
  const user = student.user;

  return (
    <Card style={styles.studentCard}>
      <View style={styles.studentRow}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{user?.fullName}</Text>
          <Text style={styles.studentId}>{student.studentId}</Text>
        </View>

        <View style={styles.attendanceActions}>
          {attendance ? (
            <View style={styles.currentStatus}>
              <Badge
                variant={attendance.status === 'PRESENT' ? 'success' : attendance.status === 'LATE' ? 'warning' : 'danger'}
                dot
                size="sm"
              >
                {attendance.status}
              </Badge>
              <Text style={styles.method}>{attendance.method === 'MANUAL' ? 'Manual' : attendance.method === 'QR_FACE' ? 'QR+Face' : 'QR'}</Text>
              {attendance.faceVerified && <Ionicons name="checkmark-shield" size={16} color="#10B981" style={{ marginLeft: 8 }} />}
            </View>
          ) : (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.presentBtn, saving && styles.saving]}
                onPress={() => !saving && onMarkAttendance(student.id, 'PRESENT')}
                disabled={saving}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.lateBtn, saving && styles.saving]}
                onPress={() => !saving && onMarkAttendance(student.id, 'LATE')}
                disabled={saving}
              >
                <Ionicons name="time" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.absentBtn, saving && styles.saving]}
                onPress={() => !saving && onMarkAttendance(student.id, 'ABSENT')}
                disabled={saving}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

export default function ManualAttendanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'unmarked'>('all');

  const fetchData = async () => {
    try {
      const [sessionRes, attendanceRes] = await Promise.all([
        api.getSession(params.sessionId),
        api.getSessionAttendance(params.sessionId),
      ]);

      if (sessionRes.data) {
        setSession(sessionRes.data);
      }

      if (attendanceRes.data) {
        const attendanceMap = new Map(attendanceRes.data.map((r: any) => [r.studentId, r]));
        
        const classStudents = sessionRes.data?.subjectClassMapping?.class?.students || [];
        
        const studentsWithStatus = classStudents.map((student: any) => {
          const record = attendanceMap.get(student.id);
          return {
            ...student,
            attendance: record ? {
              status: record.status,
              method: record.method,
              faceVerified: record.faceVerified,
              id: record.id,
            } : null,
          };
        });

        setStudents(studentsWithStatus);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.sessionId]);

  const handleMarkAttendance = async (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setSaving(prev => ({ ...prev, [studentId]: true }));
    try {
      const response = await api.manualAttendance({
        sessionId: params.sessionId,
        studentId,
        status,
      });

      if (response.error) throw new Error(response.error);

      setStudents(prev => prev.map(s => 
        s.id === studentId ? { ...s, attendance: { status, method: 'MANUAL', faceVerified: false } } : s
      ));
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to mark attendance');
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const filteredStudents = students.filter(student => {
    if (filter === 'all') return true;
    if (filter === 'unmarked') return !student.attendance;
    return student.attendance?.status === filter.toUpperCase();
  });

  const presentCount = students.filter(s => s.attendance?.status === 'PRESENT').length;
  const absentCount = students.filter(s => s.attendance?.status === 'ABSENT').length;
  const lateCount = students.filter(s => s.attendance?.status === 'LATE').length;
  const unmarkedCount = students.filter(s => !s.attendance).length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loading size="lg" text="Loading students..." />
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#059669', '#047857']} style={styles.headerGradient} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manual Attendance</Text>
          <View style={{ width: 44 }} />
        </View>

        <Card style={styles.sessionCard} variant="gradient" gradientColors={['#059669', '#047857']}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionSubject}>{session.subjectClassMapping?.subject?.name}</Text>
            <Text style={styles.sessionClass}>{session.subjectClassMapping?.class?.name}</Text>
          </View>
        </Card>

        <View style={styles.statsContainer}>
          <StatCard label="Present" value={presentCount} color="#10B981" />
          <StatCard label="Absent" value={absentCount} color="#EF4444" />
          <StatCard label="Late" value={lateCount} color="#F59E0B" />
          <StatCard label="Unmarked" value={unmarkedCount} color="#6B7280" />
        </View>

        <View style={styles.filterContainer}>
          {(['all', 'unmarked', 'present', 'absent', 'late'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterButton,
                filter === f && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === f && styles.filterButtonTextActive,
              ]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && (
                  <Text style={[
                    styles.filterCount,
                    filter === f && styles.filterCountActive,
                  ]}>
                    {students.filter(s => 
                      f === 'unmarked' ? !s.attendance : s.attendance?.status === f.toUpperCase()
                    ).length}
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredStudents.length > 0 ? (
          <View style={styles.studentsList}>
            {filteredStudents.map((student: any) => (
              <StudentRow
                key={student.id}
                student={student}
                onMarkAttendance={handleMarkAttendance}
                saving={saving[student.id]}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="👥"
            title={filter === 'unmarked' ? 'All students marked!' : 'No students found'}
            message={filter === 'unmarked' ? 'Every student has been marked for this session' : `No ${filter} students in this session`}
          />
        )}
      </ScrollView>
    </View>
  );
}

}
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
  sessionCard: { width: '100%', padding: 20 },
  sessionInfo: { alignItems: 'center', gap: 4 },
  sessionSubject: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  sessionClass: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%' },
  statContent: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#64748B' },
  filterContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterButtonActive: { backgroundColor: '#059669', borderColor: '#059669' },
  filterButtonText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  filterButtonTextActive: { color: '#FFFFFF' },
  filterCount: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  filterCountActive: { color: 'rgba(255,255,255,0.8)' },
  studentsList: { gap: 10 },
  studentCard: { padding: 0 },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  studentId: { fontSize: 13, color: '#64748B', marginTop: 2 },
  attendanceActions: { flex: 1, alignItems: 'flex-end' },
  currentStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  method: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  presentBtn: { backgroundColor: '#10B981' },
  lateBtn: { backgroundColor: '#F59E0B' },
  absentBtn: { backgroundColor: '#EF4444' },
  saving: { opacity: 0.6 },
});