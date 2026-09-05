import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Card, Badge, Loading, EmptyState, Modal } from '@/components';
import { formatDate, getAttendanceStatusColor } from '@/utils/format';

export default function ClassStatsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classStats, setClassStats] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classDetail, setClassDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchStats = async () => {
    if (!user?.teacherProfile?.id) return;
    
    try {
      const classesRes = await (api as any).getClasses({ page: 1, limit: 50 });
      const resData = classesRes.data as any;
      const classesList = Array.isArray(resData) ? resData : (resData?.classes || resData?.data || []);
      
      const teacherClasses = classesList.filter((c: any) => 
        c.classTeacherId === user.teacherProfile?.id || 
        c.subjectMappings?.some((m: any) => m.teacherId === user.teacherProfile?.id)
      );

      const statsPromises = teacherClasses.map(async (clazz: any) => {
        try {
          const response = await api.getClassAttendanceSummary(clazz.id);
          return { class: clazz, summary: response.data?.summary || [] };
        } catch {
          return { class: clazz, summary: [] };
        }
      });

      const results = await Promise.all(statsPromises);
      setClassStats(results);
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleClassPress = (clazz: any) => {
    setSelectedClass(clazz.class.id);
    setClassDetail(clazz);
    setShowDetail(true);
  };

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
      <LinearGradient colors={['#059669', '#047857']} style={styles.headerGradient} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Class Analytics</Text>
          <View style={{ width: 44 }} />
        </View>

        {classStats.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No classes assigned"
            message="You don't have any classes assigned yet"
          />
        ) : (
          <View style={styles.classesList}>
            {classStats.map(({ class: clazz, summary }) => {
              const totalStudents = summary.length;
              const totalSessions = summary.reduce((acc: number, s: any) => acc + s.overall.total, 0);
              const totalPresent = summary.reduce((acc: number, s: any) => acc + s.overall.present, 0);
              const avgAttendance = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

              return (
                <TouchableOpacity
                  key={clazz.id}
                  style={styles.classCard}
                  onPress={() => handleClassPress({ class: clazz, summary })}
                  activeOpacity={0.8}
                >
                  <View style={styles.classHeader}>
                    <View style={styles.classIcon}>
                      <Ionicons name="school" size={24} color="#059669" />
                    </View>
                    <View style={styles.classInfo}>
                      <Text style={styles.className}>{clazz.name}</Text>
                      <Text style={styles.classBranch}>{clazz.branch} • Sem {clazz.semester} • Sec {clazz.section}</Text>
                    </View>
                    <View style={styles.classStats}>
                      <Text style={[styles.classAttendance, { color: avgAttendance >= 75 ? '#10B981' : avgAttendance >= 50 ? '#F59E0B' : '#EF4444' }]}>
                        {avgAttendance}%
                      </Text>
                      <Text style={styles.classStudents}>{totalStudents} students</Text>
                    </View>
                  </View>

                  <View style={styles.subjectStats}>
                    {summary.slice(0, 3).map((subjectStat: any) => (
                      <View key={subjectStat.studentId} style={styles.subjectStat}>
                        <Text style={styles.subjectName}>{subjectStat.bySubject?.[Object.keys(subjectStat.bySubject)[0]]?.subject || 'Subject'}</Text>
                        <View style={styles.subjectBreakdown}>
                          <Badge variant="success" size="sm">{subjectStat.bySubject?.[Object.keys(subjectStat.bySubject)[0]]?.present || 0} P</Badge>
                          <Badge variant="danger" size="sm">{subjectStat.bySubject?.[Object.keys(subjectStat.bySubject)[0]]?.absent || 0} A</Badge>
                          <Badge variant="warning" size="sm">{subjectStat.bySubject?.[Object.keys(subjectStat.bySubject)[0]]?.late || 0} L</Badge>
                        </View>
                      </View>
                    ))}
                    {summary.length > 3 && (
                      <Text style={styles.moreSubjects}>+{summary.length - 3} more subjects</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={showDetail} onClose={() => setShowDetail(false)} size="lg" title="Class Details">
        {classDetail && (
          <View style={styles.detailContent}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailClassName}>{classDetail.class.name}</Text>
              <Text style={styles.detailClassInfo}>{classDetail.class.branch} • Semester {classDetail.class.semester} • Section {classDetail.class.section}</Text>
            </View>

            <View style={styles.detailTable}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCell}>Student</Text>
                <Text style={styles.tableCell}>Roll No.</Text>
                <Text style={styles.tableCell}>Present</Text>
                <Text style={styles.tableCell}>Absent</Text>
                <Text style={styles.tableCell}>Late</Text>
                <Text style={styles.tableCell}>Total</Text>
                <Text style={styles.tableCell}>Rate</Text>
              </View>
              {classDetail.summary.map((student: any) => (
                <View key={student.studentId} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{student.studentName}</Text>
                  <Text style={styles.tableCell}>{student.rollNumber}</Text>
                  <Text style={[styles.tableCell, { color: '#10B981', fontWeight: '600' }]}>{student.overall.present}</Text>
                  <Text style={[styles.tableCell, { color: '#EF4444' }]}>{student.overall.absent}</Text>
                  <Text style={[styles.tableCell, { color: '#F59E0B' }]}>{student.overall.late}</Text>
                  <Text style={styles.tableCell}>{student.overall.total}</Text>
                  <Text style={[styles.tableCell, { fontWeight: '600', color: student.overall.total > 0 ? (student.overall.present / student.overall.total >= 0.75 ? '#10B981' : student.overall.present / student.overall.total >= 0.5 ? '#F59E0B' : '#EF4444') : '#6B7280' }]}>
                    {student.overall.total > 0 ? Math.round((student.overall.present / student.overall.total) * 100) : 0}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Modal>
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
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  classesList: { gap: 16 },
  classCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  classHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  classIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  classInfo: { flex: 1, gap: 2 },
  className: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  classBranch: { fontSize: 13, color: '#64748B' },
  classStats: { alignItems: 'flex-end', gap: 2 },
  classAttendance: { fontSize: 24, fontWeight: '700' },
  classStudents: { fontSize: 12, color: '#94A3B8' },
  subjectStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectStat: { flex: 1, minWidth: '30%', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, gap: 6 },
  subjectName: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
  subjectBreakdown: { flexDirection: 'row', gap: 4 },
  moreSubjects: { fontSize: 12, color: '#94A3B8', marginTop: 8 },
  detailContent: { padding: 8 },
  detailHeader: { marginBottom: 20, gap: 4 },
  detailClassName: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  detailClassInfo: { fontSize: 14, color: '#64748B' },
  detailTable: { maxHeight: 400 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F1F5F9', borderRadius: 8, marginBottom: 8 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tableCell: { fontSize: 13, color: '#1E293B' },
});