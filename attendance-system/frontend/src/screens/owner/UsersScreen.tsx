import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Card, Badge, Loading, EmptyState, Modal, Input, Button } from '@/components';

interface UserCardProps {
  user: any;
  onDelete: (id: string, name: string) => void;
  onToggle: (id: string, active: boolean) => void;
}

const UserCard = ({ user, onDelete, onToggle }: UserCardProps) => {
  const isStudent = user.role === 'STUDENT';
  const isTeacher = user.role === 'TEACHER';

  return (
    <Card style={styles.userCard}>
      <View style={styles.userRow}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.fullName}</Text>
          <View style={styles.userMeta}>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
          </View>
        </View>

        <View style={styles.userBadges}>
          <Badge
            variant={user.role === 'STUDENT' ? 'info' : user.role === 'TEACHER' ? 'success' : 'default'}
            size="sm"
          >
            {user.role}
          </Badge>
          {isStudent && user.studentProfile && (
            <Badge variant="outline" size="xs">{user.studentProfile.branch}</Badge>
          )}
          {isTeacher && user.teacherProfile && (
            <Badge variant="outline" size="xs">{user.teacherProfile.department}</Badge>
          )}
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity onPress={() => onToggle(user.id, user.isActive)} style={styles.toggleButton}>
            <Ionicons name={user.isActive ? 'checkmark-circle' : 'close-circle'} size={22} color={user.isActive ? '#10B981' : '#EF4444'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(user.id, user.fullName)} style={styles.deleteButton}>
            <Ionicons name="trash" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
};

export default function UsersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'STUDENT' | 'TEACHER' | 'PLATFORM_OWNER'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'STUDENT' as 'STUDENT' | 'TEACHER' | 'PLATFORM_OWNER',
    phone: '',
    studentId: '',
    branch: '',
    classId: '',
    semester: '',
    enrollmentYear: '',
    employeeId: '',
    department: '',
    designation: '',
    institutionId: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchUsers = async (pageNum = 1, append = false) => {
    try {
      const response = await api.getUsers({ 
        page: pageNum, 
        limit: 20, 
        role: roleFilter === 'all' ? undefined : roleFilter,
        search: search || undefined,
      });

      if (response.data) {
        if (append) {
          setUsers(prev => [...prev, ...response.data!]);
        } else {
          setUsers(response.data);
        }
        setHasMore(response.pagination?.page < response.pagination?.pages);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [roleFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleCreate = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (formData.role === 'STUDENT' && (!formData.studentId || !formData.branch || !formData.classId || !formData.semester)) {
      Alert.alert('Error', 'Please fill in all student details');
      return;
    }

    if (formData.role === 'TEACHER' && (!formData.employeeId || !formData.department || !formData.institutionId)) {
      Alert.alert('Error', 'Please fill in all teacher details');
      return;
    }

    setCreating(true);
    try {
      const response = await api.register({ ...formData, semester: parseInt(formData.semester) || 1, enrollmentYear: parseInt(formData.enrollmentYear) || new Date().getFullYear() });
      if (response.error) throw new Error(response.error);
      
      Alert.alert('Success', 'User created successfully');
      setShowCreateModal(false);
      setFormData({ email: '', password: '', fullName: '', role: 'STUDENT', phone: '', studentId: '', branch: '', classId: '', semester: '', enrollmentYear: '', employeeId: '', department: '', designation: '', institutionId: '' });
      fetchUsers(1);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    Alert.alert('Delete User', `Are you sure you want to delete "${name}"? This will deactivate their account.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.deleteUser(id);
          fetchUsers(1);
        } catch (error) {
          Alert.alert('Error', 'Failed to delete user');
        }
      }},
    ]);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    // In a real app, you'd have an endpoint to toggle active status
    Alert.alert(currentActive ? 'Deactivate User' : 'Activate User', `Are you sure you want to ${currentActive ? 'deactivate' : 'activate'} this user?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: currentActive ? 'Deactivate' : 'Activate', style: currentActive ? 'destructive' : 'default', onPress: async () => {
        fetchUsers(1);
      }},
    ]);
  };

  if (loading && users.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loading size="lg" text="Loading users..." />
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
          <Text style={styles.headerTitle}>User Management</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Card style={styles.filterCard} variant="elevated">
          <View style={styles.searchRow}>
            <Input
              placeholder="Search users..."
              value={search}
              onChangeText={setSearch}
              leftIcon="search"
              rightIcon={search ? 'close' : undefined}
              rightIconOnPress={() => setSearch('')}
              style={{ flex: 1 }}
            />
          </View>

          <View style={styles.roleFilters}>
            {(['all', 'STUDENT', 'TEACHER', 'PLATFORM_OWNER'] as const).map(role => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleFilter,
                  roleFilter === role && styles.roleFilterActive,
                ]}
                onPress={() => setRoleFilter(role)}
              >
                <Text style={[
                  styles.roleFilterText,
                  roleFilter === role && styles.roleFilterTextActive,
                ]}>
                  {role === 'all' ? 'All' : role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {users.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No users found"
            message={search ? 'Try adjusting your search or filters' : 'No users registered yet'}
            action={{ label: 'Add User', onPress: () => setShowCreateModal(true) }}
          />
        ) : (
          <FlatList
            data={users}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <UserCard user={item} onDelete={handleDelete} onToggle={handleToggleActive} />}
            ListEmptyComponent={() => null}
            onEndReached={() => { if (hasMore && !loading) { setPage(p => p + 1); fetchUsers(page + 1, true); } }}
            onEndReachedThreshold={0.1}
            contentContainerStyle={styles.listContent}
          />
        )}

        {loading && users.length > 0 && (
          <View style={styles.loadingMore}>
            <Loading size="sm" text="Loading more..." />
          </View>
        )}
      </ScrollView>

      <Modal visible={showCreateModal} onClose={() => setShowCreateModal(false)} size="lg" title="Create User">
        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={styles.roleSelector}>
            {(['STUDENT', 'TEACHER', 'PLATFORM_OWNER'] as const).map(role => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.modalRoleOption,
                  formData.role === role && styles.modalRoleOptionActive,
                ]}
                onPress={() => setFormData({ ...formData, role })}
              >
                <Text style={[
                  styles.modalRoleText,
                  formData.role === role && styles.modalRoleTextActive,
                ]}>{role}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Full Name"
            placeholder="Enter full name"
            value={formData.fullName}
            onChangeText={v => setFormData({ ...formData, fullName: v })}
            leftIcon="person"
          />
          <Input
            label="Email"
            placeholder="Enter email"
            value={formData.email}
            onChangeText={v => setFormData({ ...formData, email: v })}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail"
          />
          <Input
            label="Password"
            placeholder="Min 8 characters"
            value={formData.password}
            onChangeText={v => setFormData({ ...formData, password: v })}
            secureTextEntry
            leftIcon="lock-closed"
          />
          <Input
            label="Phone (Optional)"
            placeholder="Enter phone number"
            value={formData.phone}
            onChangeText={v => setFormData({ ...formData, phone: v })}
            keyboardType="phone-pad"
            leftIcon="call"
          />

          {formData.role === 'STUDENT' && (
            <>
              <Input label="Student ID" placeholder="e.g., CS2021001" value={formData.studentId} onChangeText={v => setFormData({ ...formData, studentId: v })} leftIcon="id-card" />
              <Input label="Branch" placeholder="e.g., CSE" value={formData.branch} onChangeText={v => setFormData({ ...formData, branch: v })} leftIcon="school" />
              <Input label="Class ID" placeholder="e.g., CSE-3A" value={formData.classId} onChangeText={v => setFormData({ ...formData, classId: v })} leftIcon="layers" />
              <Input label="Semester" placeholder="e.g., 5" value={formData.semester} onChangeText={v => setFormData({ ...formData, semester: v })} keyboardType="numeric" leftIcon="numeric" />
              <Input label="Enrollment Year" placeholder="e.g., 2021" value={formData.enrollmentYear} onChangeText={v => setFormData({ ...formData, enrollmentYear: v })} keyboardType="numeric" leftIcon="calendar" />
            </>
          )}

          {formData.role === 'TEACHER' && (
            <>
              <Input label="Employee ID" placeholder="e.g., EMP001" value={formData.employeeId} onChangeText={v => setFormData({ ...formData, employeeId: v })} leftIcon="id-card" />
              <Input label="Department" placeholder="e.g., Computer Science" value={formData.department} onChangeText={v => setFormData({ ...formData, department: v })} leftIcon="school" />
              <Input label="Designation" placeholder="e.g., Professor" value={formData.designation} onChangeText={v => setFormData({ ...formData, designation: v })} leftIcon="briefcase" />
              <Input label="Institution ID" placeholder="Enter institution ID" value={formData.institutionId} onChangeText={v => setFormData({ ...formData, institutionId: v })} leftIcon="business" />
            </>
          )}

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={() => setShowCreateModal(false)} style={{ flex: 1, marginRight: 8 }} />
            <Button title="Create User" variant="primary" loading={creating} onPress={handleCreate} style={{ flex: 1, marginLeft: 8 }} />
          </View>
        </ScrollView>
      </Modal>
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
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  filterCard: { width: '100%', padding: 16 },
  searchRow: { marginBottom: 16 },
  roleFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleFilter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  roleFilterActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  roleFilterText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  roleFilterTextActive: { color: '#FFFFFF' },
  listContent: { gap: 12, paddingBottom: 20 },
  userCard: { padding: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  userMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  userEmail: { fontSize: 13, color: '#64748B' },
  userPhone: { fontSize: 13, color: '#94A3B8' },
  userBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginVertical: 8 },
  userActions: { flexDirection: 'row', gap: 12 },
  toggleButton: { padding: 8 },
  deleteButton: { padding: 8 },
  modalContent: { gap: 16 },
  roleSelector: { flexDirection: 'row', gap: 10 },
  modalRoleOption: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  modalRoleOptionActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  modalRoleText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  modalRoleTextActive: { color: '#FFFFFF' },
  modalActions: { flexDirection: 'row', marginTop: 8 },
});