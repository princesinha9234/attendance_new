import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { verifyFaceMatch, deserializeFaceDescriptor } from '@/utils/face';

export default function FaceEnrollScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const params = useLocalSearchParams<{ mode?: 'enroll' | 'verify' }>();
  const mode = params.mode || 'enroll';
  
  const [permission, requestPermission] = useCameraPermissions();
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [instructions, setInstructions] = useState('Position your face in the frame');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  
  const cameraRef = useRef<CameraView>(null);
  const detectingRef = useRef(false);

  const isVerifyMode = mode === 'verify';

  useEffect(() => {
    if (permission?.granted) {
      startFaceDetection();
    }
  }, [permission]);

  const startFaceDetection = async () => {
    // Face detection would run here in a real implementation
    // For demo, we'll simulate it
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
      // In a real app, use face-api.js or similar
      // For demo, we'll simulate face detection
      setFaceDetected(true);
      setInstructions('Face detected! Hold steady...');
    } catch {
      setFaceDetected(false);
      setInstructions('No face detected. Position your face in the frame.');
    } finally {
      detectingRef.current = false;
    }
  };

  const captureAndEnroll = async () => {
    if (!cameraRef.current) return;
    
    setEnrolling(true);
    setInstructions('Processing...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: true,
      });

      if (!photo) throw new Error('Failed to capture photo');

      setPreviewUri(photo.uri);

      // Generate face descriptor (simulated)
      const descriptor = generateSimulatedDescriptor();
      
      if (isVerifyMode) {
        // Verify against stored descriptor
        if (!user?.faceDescriptor) {
          throw new Error('No enrolled face found');
        }
        
        const storedDescriptor = deserializeFaceDescriptor(user.faceDescriptor);
        if (!storedDescriptor) throw new Error('Invalid stored face data');
        
        const result = verifyFaceMatch(storedDescriptor, descriptor);
        
        if (!result.isMatch) {
          throw new Error(`Face verification failed. Match: ${Math.round(result.matchScore * 100)}%`);
        }
        
        Alert.alert('Success', `Face verified! Match: ${Math.round(result.matchScore * 100)}%`);
        router.back();
      } else {
        // Enroll new face
        const response = await api.enrollFace(descriptor);
        
        if (response.error) throw new Error(response.error);
        
        updateUser({ faceDescriptor: JSON.stringify(descriptor) });
        setEnrolled(true);
        setInstructions('Face enrolled successfully!');
        
        setTimeout(() => router.back(), 1500);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Face enrollment failed';
      setInstructions(message);
      Alert.alert('Error', message);
    } finally {
      setEnrolling(false);
    }
  };

  const generateSimulatedDescriptor = (): number[] => {
    const descriptor = new Array(128).fill(0).map(() => (Math.random() - 0.5) / 500);
    const norm = Math.sqrt(descriptor.reduce((sum, val) => sum + val * val, 0));
    return descriptor.map(val => val / norm);
  };

  const retake = () => {
    setEnrolled(false);
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
            This app needs camera access for face verification during attendance.
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
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          type={CameraType.front}
          videoStabilizationMode="auto"
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
                <Text style={styles.previewLabel}>{isVerifyMode ? 'Verification' : 'Enrolled'}</Text>
              </View>
            )}
          </View>
        </CameraView>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.instructionsContainer}>
          <Ionicons 
            name={faceDetected ? 'checkmark-circle' : 'radio-button-off'} 
            size={24} 
            color={faceDetected ? '#10B981' : '#94A3B8'} 
          />
          <Text style={styles.instructionsText}>{instructions}</Text>
        </View>

        {enrolled && (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.successText}>Face enrolled successfully!</Text>
            <Text style={styles.successSubtext}>You can now use face verification for attendance</Text>
          </View>
        )}

        {!enrolled && (
          <View style={styles.buttonContainer}>
            <Button
              title={enrolling ? 'Processing...' : isVerifyMode ? 'Verify Face' : 'Enroll Face'}
              variant="primary"
              size="lg"
              fullWidth
              loading={enrolling}
              disabled={!faceDetected || enrolling}
              onPress={captureAndEnroll}
            />
            
            {previewUri && (
              <Button
                title="Retake"
                variant="outline"
                size="md"
                fullWidth
                onPress={retake}
                style={{ marginTop: 12 }}
              />
            )}

            <TouchableOpacity onPress={() => router.back()} style={styles.skipButton}>
              <Text style={styles.skipText}>{isVerifyMode ? 'Cancel' : 'Skip for now'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {enrolling && (
        <View style={styles.loadingOverlay}>
          <Loading size="lg" text="Analyzing face..." />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
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
  skipButton: { alignItems: 'center', marginTop: 8 },
  skipText: { fontSize: 14, color: '#64748B' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#000' },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginTop: 16, textAlign: 'center' },
  permissionText: { fontSize: 15, color: '#94A3B8', marginTop: 8, textAlign: 'center', lineHeight: 22 },
});