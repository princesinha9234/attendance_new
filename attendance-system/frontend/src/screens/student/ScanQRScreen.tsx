import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Platform, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useCameraPermissions } from 'expo-camera';
import { useLocation } from '@/hooks/useLocation';
import { api } from '@/services/api';
import { Button } from '@/components/Button';
import { Card, Loading, Badge } from '@/components';
import { parseQRCodeData } from '@/utils/qr';

interface DetailRowProps {
  label: string;
  value: string;
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

export default function ScanQRScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { getCurrentLocation } = useLocation();
  const [scanned, setScanned] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (scanned) return;
    
    const parsed = parseQRCodeData(data);
    if (!parsed) {
      Alert.alert('Invalid QR Code', 'This QR code is not for attendance');
      setTimeout(() => setScanned(false), 1000);
      return;
    }

    setScanned(true);
    Vibration.vibrate(100);

    setGettingLocation(true);
    const loc = await getCurrentLocation();
    setGettingLocation(false);
    setLocation(loc);

    setVerifying(true);
    try {
      const response = await api.verifyQR(data, loc?.latitude, loc?.longitude);
      
      if (response.error) {
        throw new Error(response.error);
      }

      setSessionData(response.data?.session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'QR verification failed';
      Alert.alert('Error', message);
      setScanned(false);
    } finally {
      setVerifying(false);
    }
  }, [scanned, getCurrentLocation]);

  const handleAttendance = async () => {
    if (!sessionData) return;

    const { faceVerification } = await import('@/hooks/useFaceDetection');
    const { extractFaceDescriptor } = faceVerification();

    router.push({
      pathname: '/student/face-verify',
      params: { sessionId: sessionData.id, sessionData: JSON.stringify(sessionData) },
    });
  };

  const handleManualAttendance = async () => {
    // For demo - in real app this would be teacher-only
    Alert.alert('Manual Attendance', 'This feature is for teachers only');
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={64} color="#94A3B8" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            Camera access is needed to scan QR codes for attendance.
          </Text>
          <Button
            title="Grant Permission"
            variant="primary"
            onPress={() => requestPermission()}
            style={{ marginTop: 20, width: 280 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.scannerContainer}>
        {!scanned && (
          <BarCodeScanner
            onBarCodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
            barcodeTypes={['qr']}
          />
        )}

        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
          </View>
          
          <Text style={styles.scanInstruction}>
            {scanned ? 'QR Code Scanned!' : 'Align QR code within the frame'}
          </Text>
        </View>

        {gettingLocation && (
          <View style={styles.locationBanner}>
            <Loading size="sm" text="Getting location..." color="#FFFFFF" />
          </View>
        )}
      </View>

      {sessionData && (
        <View style={styles.sessionInfo}>
          <Card style={styles.sessionCard} variant="elevated">
            <View style={styles.sessionHeader}>
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
              <Text style={styles.verifiedTitle}>QR Verified Successfully</Text>
            </View>
            
            <View style={styles.sessionDetails}>
              <DetailRow label="Subject" value={sessionData.subjectClassMapping?.subject?.name} />
              <DetailRow label="Class" value={sessionData.subjectClassMapping?.class?.name} />
              <DetailRow label="Teacher" value={sessionData.subjectClassMapping?.teacher?.user?.fullName} />
              <DetailRow label="Time" value={`${new Date(sessionData.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${new Date(sessionData.scheduledEnd).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`} />
              
              {sessionData.requireFaceVerify && (
                <Badge variant="info" size="sm" style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                  Face Verification Required
                </Badge>
              )}

              {sessionData.locationLat && sessionData.locationLng && location && (
                <View style={styles.locationInfo}>
                  <Ionicons name="location" size={16} color="#2563EB" />
                  <Text style={styles.locationText}>
                    Location verified ✓ ({Math.round(location.latitude * 10000) / 10000}, {Math.round(location.longitude * 10000) / 10000})
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.sessionActions}>
              <Button
                title={sessionData.requireFaceVerify ? 'Verify Face & Mark Present' : 'Mark Present'}
                variant="primary"
                size="lg"
                fullWidth
                loading={verifying}
                onPress={handleAttendance}
              />
              
              <Button
                title="Scan Another QR"
                variant="outline"
                size="md"
                fullWidth
                onPress={() => { setScanned(false); setSessionData(null); }}
                style={{ marginTop: 12 }}
              />
            </View>
          </Card>
        </View>
      )}

      {!sessionData && !scanned && (
        <View style={styles.helpSection}>
          <Card style={styles.helpCard}>
            <View style={styles.helpItem}>
              <Ionicons name="qr-code" size={24} color="#2563EB" />
              <Text style={styles.helpText}>Scan the QR code shared by your teacher</Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="location" size={24} color="#2563EB" />
              <Text style={styles.helpText}>Ensure location is enabled for geofencing</Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="scan-face" size={24} color="#2563EB" />
              <Text style={styles.helpText}>Face verification may be required after scanning</Text>
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

}
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  scannerContainer: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 16,
    position: 'relative',
    marginBottom: 24,
  },
  cornerTopLeft: { position: 'absolute', top: -2, left: -2, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#2563EB', borderRadius: 16 },
  cornerTopRight: { position: 'absolute', top: -2, right: -2, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#2563EB', borderRadius: 16 },
  cornerBottomLeft: { position: 'absolute', bottom: -2, left: -2, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#2563EB', borderRadius: 16 },
  cornerBottomRight: { position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#2563EB', borderRadius: 16 },
  scanInstruction: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    borderRadius: 24,
  },
  locationBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  sessionInfo: { padding: 20, paddingTop: 0 },
  sessionCard: { width: '100%' },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  verifiedTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  sessionDetails: { gap: 12, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: '#64748B' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right', flex: 1, marginLeft: 16 },
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  locationText: { fontSize: 13, color: '#2563EB' },
  sessionActions: { gap: 12 },
  helpSection: { padding: 20, paddingTop: 0 },
  helpCard: { gap: 16 },
  helpItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  helpText: { fontSize: 14, color: '#475569', lineHeight: 20, flex: 1, marginTop: 2 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 16, textAlign: 'center' },
  permissionText: { fontSize: 15, color: '#64748B', marginTop: 8, textAlign: 'center', lineHeight: 22 },
});