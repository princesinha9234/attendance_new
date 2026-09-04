import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/Button';
import { Card, Badge, Loading, EmptyState, Modal, Input } from '@/components';

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  leftIcon?: string;
  helperText?: string;
  style?: object;
}

const FormInput = Input as React.ComponentType<FormInputProps>;

interface InstitutionFormData {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

interface InstitutionCount {
  teachers?: number;
  classes?: number;
  subjects?: number;
}

interface Institution {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  _count?: InstitutionCount;
}

interface InstitutionCardProps {
  institution: Institution;
  onDelete: (id: string, name: string) => void;
}

export default function InstitutionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<InstitutionFormData>({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
  });
  const [creating, setCreating] = useState<boolean>(false);

  const fetchInstitutions = async (): Promise<void> => {
    try {
      const response = await api.getInstitutions();
      if (response.data?.institutions) {
        setInstitutions(response.data.institutions);
      }
    } catch (error) {
      console.error('Fetch institutions error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleCreate = async () => {
    if (!formData.name || !formData.code || !formData.address || !formData.city || !formData.state) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const response = await api.createInstitution(formData);
      if (response.error) throw new Error(response.error);
      
      Alert.alert('Success', 'Institution created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', code: '', address: '', city: '', state: '', country: 'India' });
      fetchInstitutions();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create institution');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    Alert.alert('Delete Institution', `Are you sure you want to delete "${name}"? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.deleteInstitution(id);
          fetchInstitutions();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete institution');
        }
      }},
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loading size="lg" text="Loading institutions..." />
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
          <Text style={styles.headerTitle}>Institutions</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {institutions.length === 0 ? (
          <EmptyState
            icon="🏫"
            title="No institutions yet"
            message="Create your first institution to get started"
            action={{ label: 'Create Institution', onPress: () => setShowCreateModal(true) }}
          />
        ) : (
          <View style={styles.institutionsList}>
            {institutions.map((inst: any) => (
              <InstitutionCard key={inst.id} institution={inst} onDelete={handleDelete} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showCreateModal} onClose={() => setShowCreateModal(false)} size="md" title="Create Institution">
        <View style={styles.modalContent}>
          <FormInput
            label="Institution Name"
            value={formData.name}
            onChangeText={v => setFormData({ ...formData, name: v })}
            leftIcon="business"
          />
          <FormInput
            label="Institution Code"
            value={formData.code}
            onChangeText={v => setFormData({ ...formData, code: v.toUpperCase() })}
            leftIcon="hash"
            helperText="Unique short code for the institution"
          />
          <FormInput
            label="Address"
            value={formData.address}
            onChangeText={v => setFormData({ ...formData, address: v })}
            leftIcon="location"
          />
          <View style={styles.row}>
            <FormInput
              label="City"
              value={formData.city}
              onChangeText={v => setFormData({ ...formData, city: v })}
              leftIcon="map"
              style={{ flex: 1 }}
            />
            <FormInput
              label="State"
              value={formData.state}
              onChangeText={v => setFormData({ ...formData, state: v })}
              leftIcon="map"
              style={{ flex: 1 }}
            />
          </View>
          <FormInput
            label="Country"
            value={formData.country}
            onChangeText={(v: string) => setFormData({ ...formData, country: v })}
            leftIcon="globe"
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={[styles.modalButton, styles.modalCancelButton, { marginRight: 8 }]}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={creating}
              style={[styles.modalButton, styles.modalCreateButton, { marginLeft: 8 }]}
            >
              <Text style={styles.modalCreateText}>{creating ? 'Creating...' : 'Create'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InstitutionCard({ institution, onDelete }: { institution: any; onDelete: (id: string, name: string) => void }) {
  return (
  <TouchableOpacity style={styles.institutionCard} activeOpacity={0.8}>
    <View style={styles.institutionMain}>
      <View style={styles.institutionIcon}>
        <Ionicons name="business" size={28} color="#7C3AED" />
      </View>
      <View style={styles.institutionInfo}>
        <Text style={styles.institutionName}>{institution.name}</Text>
        <Text style={styles.institutionLocation}>{institution.address}, {institution.city}, {institution.state}</Text>
        <View style={styles.institutionMeta}>
          <Badge variant="outline" size="sm">Code: {institution.code}</Badge>
          <Badge variant="default" size="sm">{institution.country}</Badge>
        </View>
      </View>
    </View>
    <View style={styles.institutionStats}>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{institution._count?.teachers || 0}</Text>
        <Text style={styles.statLabel}>Teachers</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{institution._count?.classes || 0}</Text>
        <Text style={styles.statLabel}>Classes</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{institution._count?.subjects || 0}</Text>
        <Text style={styles.statLabel}>Subjects</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(institution.id, institution.name)}>
        <Ionicons name="trash" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
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
  institutionsList: { gap: 16 },
  institutionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  institutionMain: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  institutionIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F5F0FF', justifyContent: 'center', alignItems: 'center' },
  institutionInfo: { flex: 1, gap: 4 },
  institutionName: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  institutionLocation: { fontSize: 13, color: '#64748B' },
  institutionMeta: { flexDirection: 'row', gap: 6, marginTop: 6 },
  institutionStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  statLabel: { fontSize: 11, color: '#94A3B8' },
  deleteButton: { padding: 8 },
  modalContent: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  modalActions: { flexDirection: 'row', marginTop: 8 },
  modalButton: { flex: 1, minHeight: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalCancelButton: { borderWidth: 1, borderColor: '#CBD5E1' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  modalCreateButton: { backgroundColor: '#7C3AED' },
  modalCreateText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});