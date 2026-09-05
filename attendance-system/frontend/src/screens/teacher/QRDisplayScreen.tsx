import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/Button';
import { Card, Loading, Badge } from '@/components';
import { formatDate, formatTime } from '@/utils/format';

interface InstructionRowProps {
  number: number;
  text: string;
}

const InstructionRow = ({ number, text }: InstructionRowProps) => (
  <View style={styles.instructionRow}>
    <View style={styles.instructionNumber}>{number}</View>
    <Text style={styles.instructionText}>{text}</Text>
  </View>
);

export default function QRDisplayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuth();
  const [qrData, setQrData] = useState<string>('');
  const [qrImage, setQrImage] = useState<string>('');
  const [generating, setGenerating] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [expired, setExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const fetchSession = async () => {
    try {
      const response = await api.getSession(params.sessionId);
      if (response.data) {
        setSession(response.data);
      }
    } catch (error) {
      console.error('Fetch session error:', error);
    }
  };

  const generateQR = async () => {
    setGenerating(true);
    try {
      const response = await api.generateQR(params.sessionId);
      if (response.error) throw new Error(response.error);
      
      setQrData(response.data?.token || '');
      setQrImage(response.data?.qrCode || '');
      setExpired(false);
      
      if (response.data?.expiresAt) {
        const expiry = new Date(response.data.expiresAt).getTime();
        const updateTimer = setInterval(() => {
          const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
          setTimeRemaining(remaining);
          if (remaining === 0) {
            setExpired(true);
            clearInterval(updateTimer);
          }
        }, 1000);
        return () => clearInterval(updateTimer);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to generate QR');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchSession();
    generateQR();
  }, [params.sessionId]);

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loading size="lg" text="Loading session..." />
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
          <Text style={styles.headerTitle}>Attendance QR Code</Text>
          <TouchableOpacity onPress={() => generateQR()} style={styles.refreshButton} disabled={generating}>
            <Ionicons name={generating ? 'refresh' : 'refresh'} size={24} color="#FFFFFF" style={{ transform: generating ? [{ rotate: '360deg' }] : [] }} />
          </TouchableOpacity>
        </View>

        <Card style={styles.sessionCard} variant="gradient" gradientColors={['#059669', '#047857']}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionSubject}>{session.subjectClassMapping?.subject?.name}</Text>
            <Text style={styles.sessionClass}>{session.subjectClassMapping?.class?.name} • {session.subjectClassMapping?.subject?.code}</Text>
            <View style={styles.sessionMeta}>
              <Text style={styles.sessionMetaText}>{formatDate(session.scheduledStart)}</Text>
              <Text style={styles.sessionMetaText}>{formatTime(session.scheduledStart)} - {formatTime(session.scheduledEnd)}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.qrSection}>
          {generating ? (
            <Card style={styles.qrCard} variant="elevated">
              <Loading size="lg" text="Generating QR Code..." color="#059669" />
            </Card>
          ) : expired ? (
            <Card style={styles.qrCard} variant="outlined" gradientColors={['#FEF2F2', '#FEE2E2']}>
              <View style={styles.expiredContent}>
                <Ionicons name="time" size={48} color="#EF4444" />
                <Text style={styles.expiredTitle}>QR Code Expired</Text>
                <Text style={styles.expiredText}>The QR code has expired. Generate a new one to continue.</Text>
                <Button title="Generate New QR" variant="danger" onPress={generateQR} style={{ marginTop: 16, width: '80%' }} />
              </View>
            </Card>
          ) : (
            <Card style={styles.qrCard} variant="elevated">
              <View style={styles.qrContainer}>
                <View style={styles.qrFrame}>
                  {qrImage ? (
                    <Image source={{ uri: qrImage }} style={styles.qrImage} />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Loading size="md" color="#059669" />
                    </View>
                  )}
                </View>
                
                <View style={styles.qrStatus}>
                  <Badge variant="success" size="sm" dot>ACTIVE</Badge>
                  <Text style={styles.timerText}>{formatTimeRemaining(timeRemaining)} remaining</Text>
                </View>

                <View style={styles.qrInstructions}>
                  <Text style={styles.instructionTitle}>Instructions for Students:</Text>
                  <InstructionRow number={1} text="Open the Attendance app" />
                  <InstructionRow number={2} text="Tap 'Scan QR Code'" />
                  <InstructionRow number={3} text="Scan this QR code" />
                  <InstructionRow number={4} text="Verify face (if required)" />
                  <InstructionRow number={5} text="Attendance marked!" />
                </View>

                <View style={styles.qrDetails}>
                  <Text style={styles.detailLabel}>Session Token</Text>
                  <Text style={styles.detailValue}>{qrData?.substring(0, 24)}...</Text>
                </View>

                <View style={styles.qrActions}>
                  <Button title="Regenerate QR" variant="outline" onPress={generateQR} style={{ flex: 1, marginRight: 8 }} />
                  <Button title="Save QR Image" variant="primary" onPress={() => Alert.alert('Feature', 'Save to gallery coming soon')} style={{ flex: 1, marginLeft: 8 }} />
                </View>
              </View>
            </Card>
          )}

          {session.requireFaceVerify && (
            <Card style={styles.infoCard} variant="outlined" gradientColors={['#FEF3C7', '#FDE68A']}>
              <View style={styles.infoRow}>
                <Ionicons name="scan-face" size={24} color="#F59E0B" />
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Face Verification Required</Text>
                  <Text style={styles.infoDesc}>Students must verify their face after scanning the QR code</Text>
                </View>
              </View>
            </Card>
          )}

          {session.locationLat && session.locationLng && (
            <Card style={styles.infoCard} variant="outlined" gradientColors={['#DBEAFE', '#BFDBFE']}>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={24} color="#2563EB" />
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Geofencing Active</Text>
                  <Text style={styles.infoDesc}>Students must be within {session.allowedRadius}m of the classroom</Text>
                </View>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
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
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, gap: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  refreshButton: { padding: 8 },
  sessionCard: { width: '100%', padding: 20 },
  sessionInfo: { alignItems: 'center', gap: 4 },
  sessionSubject: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  sessionClass: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  sessionMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  sessionMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  qrSection: { gap: 16 },
  qrCard: { width: '100%', padding: 24 },
  qrContainer: { alignItems: 'center', gap: 20 },
  qrFrame: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  qrImage: { width: 250, height: 250 },
  qrPlaceholder: { width: 250, height: 250, justifyContent: 'center', alignItems: 'center' },
  qrStatus: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  timerText: { fontSize: 14, fontWeight: '600', color: '#059669', fontFamily: 'monospace' },
  qrInstructions: { width: '100%', gap: 8, marginTop: 8 },
  instructionTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  instructionNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  instructionText: { fontSize: 14, color: '#475569' },
  qrDetails: { width: '100%', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'center', gap: 4 },
  detailLabel: { fontSize: 12, color: '#94A3B8' },
  detailValue: { fontSize: 12, fontWeight: '600', color: '#1E293B', fontFamily: 'monospace' },
  qrActions: { flexDirection: 'row', width: '100%', marginTop: 16 },
  infoCard: { width: '100%' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  infoDesc: { fontSize: 13, color: '#64748B', marginTop: 2 },
  expiredContent: { alignItems: 'center', gap: 12 },
  expiredTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  expiredText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});