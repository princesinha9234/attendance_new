import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Vibration, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraType } from 'expo-camera';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Button, Card, Loading } from '@/components';
import { verifyFaceMatch, deserializeFaceDescriptor } from '@/utils/face';

export default function FaceVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string; sessionData?: string }>();
  const { user } = useAuth();
  
  const [permission, setPermission] = useState<{ granted: boolean } | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [instructions, setInstructions] = useState('Position your face in the frame');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  
  const cameraRef = useRef<React.ElementRef<typeof Camera>>(null);
  const detectingRef = useRef(false);
  const sessionData = params.sessionData ? JSON.parse(params.sessionData) : null;

  const requestPermission = async () => {
    const result = await Camera.requestCameraPermissionsAsync();
    setPermission(result);
  };

  useEffect(() => {
    Camera.getCameraPermissionsAsync().then(setPermission);
  }, []);

  useEffect(() => {
    if (permission?.granted) {
      startFaceDetection();
    }
  }, [permission]);

  const startFaceDetection = () => {
    const interval = setInterval(() => {
      if (cameraRef.current && !detectingRef.current) {
        detectFaces();
      }
    }, 500);
    return () => clearInterval(interval);
  };

  const detectFaces = async () => {
    detectingRef.current = true;
    try {
      // Simulate face detection
      setFaceDetected(true);
      setInstructions('Face detected! Hold steady...');
    } catch {
      setFaceDetected(false);
      setInstructions('No face detected. Position your face in the frame.');
    } finally {
      detectingRef.current = false;
    }
  };

  const verifyAndMarkAttendance = async () => {
    if (!cameraRef.current || !user?.faceDescriptor) return;
    
    setVerifying(true);
    setInstructions('Verifying face...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: true,
      });

      if (!photo) throw new Error('Failed to capture photo');

      setPreviewUri(photo.uri);

      // Generate simulated descriptor
      const descriptor = generateSimulatedDescriptor();
      
      // Verify against stored
      const storedDescriptor = deserializeFaceDescriptor(user.faceDescriptor);
      if (!storedDescriptor) throw new Error('No enrolled face found');
      
      const result = verifyFaceMatch(storedDescriptor, descriptor);
      
      if (!result.isMatch) {
        throw new Error(`Face verification failed. Match: ${Math.round(result.matchScore * 100)}%`);
      }

      // Mark attendance
      const response = await api.markAttendance(params.sessionId, {
        faceDescriptor: descriptor,
        deviceInfo: Platform.OS,
      });

      if (response.error) throw new Error(response.error);

      setVerified(true);
      setInstructions('Attendance marked successfully!');
      Vibration.vibrate([100, 50, 100]);

      setTimeout(() => {
        router.replace('/student/dashboard' as any);
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      setInstructions(message);
      Alert.alert('Error', message);
    } finally {
      setVerifying(false);
    }
  };

  const generateSimulatedDescriptor = (): number[] => {
    const descriptor = new Array(128).fill(0).map(() => (Math.random() - 0.5) / 500);
    const norm = Math.sqrt(descriptor.reduce((sum, val) => sum + val * val, 0));
    return descriptor.map(val => val / norm);
  };

  const retake = () => {
    setVerified(false);
    setPreviewUri(null);
    setFaceDetected(false);
    setInstructions('Position your face in the frame');
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={64} color="#94A3B8" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            Camera access is needed for face verification during attendance.
          </Text>
          <TouchableOpacity
            onPress={() => { void requestPermission(); }}
            style={{ marginTop: 20, width: 280 }}
          >
            <Text>Grant Permission</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Face Verification</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={CameraType.front}
        >
          <View style={styles.overlay}>
            <View style={[
              styles.faceFrame,
              faceDetected && styles.faceFrameDetected,
            ]}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            
            {previewUri && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Verified</Text>
              </View>
            )}
          </View>
        </Camera>
      </View>

      <View style={styles.bottomPanel}>
        {sessionData && (
          <Card style={styles.sessionCard} variant="outlined">
            <View style={styles.sessionCardContent}>
              <Ionicons name="school" size={20} color="#2563EB" />
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionSubject}>{sessionData.subjectClassMapping?.subject?.name}</Text>
                <Text style={styles.sessionClass}>{sessionData.subjectClassMapping?.class?.name}</Text>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.instructionsContainer}>
          <Ionicons 
            name={faceDetected ? 'checkmark-circle' : 'radio-button-off'} 
            size={24} 
            color={faceDetected ? '#10B981' : '#94A3B8'} 
          />
          <Text style={styles.instructionsText}>{instructions}</Text>
        </View>

        {verified && (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.successText}>Attendance Marked!</Text>
            <Text style={styles.successSubtext}>Your presence has been recorded</Text>
          </View>
        )}

        {!verified && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => { void verifyAndMarkAttendance(); }}
              disabled={!faceDetected || verifying}
              activeOpacity={0.8}
            >
              <Button
                title={verifying ? 'Verifying...' : 'Verify & Mark Present'}
                variant="primary"
                size="lg"
                fullWidth
                loading={verifying}
                disabled={!faceDetected || verifying}
              />
            </TouchableOpacity>
            
            {previewUri && (
              <TouchableOpacity
                onPress={retake}
                activeOpacity={0.8}
                style={{ marginTop: 12 }}
              >
                <Button
                  title="Retake"
                  variant="outline"
                  size="md"
                  fullWidth
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {verifying && (
        <View style={styles.loadingOverlay}>
          <Loading size="lg" text="Verifying face..." />
        </View>
      )}
    </View>
  );
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
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  faceFrame: {
    width: 280,
    height: 340,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 24,
    position: 'relative',
  },
  faceFrameDetected: { borderColor: '#10B981', borderWidth: 3 },
  cornerTopLeft: { position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#FFFFFF', borderRadius: 12 },
  cornerTopRight: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#FFFFFF', borderRadius: 12 },
  cornerBottomLeft: { position: 'absolute', bottom: -2, left: -2, width: 20, height: 20, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#FFFFFF', borderRadius: 12 },
  cornerBottomRight: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#FFFFFF', borderRadius: 12 },
  previewContainer: { position: 'absolute', bottom: -60, alignItems: 'center' },
  previewLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '500', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  bottomPanel: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  sessionCard: { marginBottom: 16 },
  sessionCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  sessionInfo: { flex: 1, gap: 2 },
  sessionSubject: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  sessionClass: { fontSize: 14, color: '#64748B' },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  instructionsText: { flex: 1, fontSize: 15, color: '#1E293B', lineHeight: 22 },
  successContainer: { alignItems: 'center', gap: 12, marginBottom: 24 },
  successText: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  successSubtext: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  buttonContainer: { gap: 12 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#000' },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginTop: 16, textAlign: 'center' },
  permissionText: { fontSize: 15, color: '#94A3B8', marginTop: 8, textAlign: 'center', lineHeight: 22 },
});