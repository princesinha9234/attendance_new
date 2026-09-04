import { useState, useCallback, useRef, useEffect } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { Alert } from 'react-native';
import { validateFaceDescriptor } from '@/utils/face';

export interface FaceDetectionResult {
  faces: FaceDetector.Face[];
  descriptor?: number[];
}

export function useFaceDetection() {
  const [permission, requestPermission] = useCameraPermissions();
  const [faceDetected, setFaceDetected] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const detectorRef = useRef<FaceDetector.FaceDetector | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (permission?.granted) {
      initFaceDetector();
    }
    
    return () => {
      detectorRef.current?.destroy();
    };
  }, [permission]);

  const initFaceDetector = async () => {
    try {
      detectorRef.current = await FaceDetector.createFaceDetectorAsync({
        mode: FaceDetector.FaceDetectorMode.fast,
        detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
        runClassifications: FaceDetector.FaceDetectorClassifications.all,
        minDetectionInterval: 100,
        tracking: true,
      });
    } catch (err) {
      console.error('Face detector init error:', err);
      setError('Failed to initialize face detection');
    }
  };

  const detectFaces = useCallback(async (uri: string): Promise<FaceDetectionResult> => {
    if (!detectorRef.current) {
      return { faces: [] };
    }

    try {
      const faces = await detectorRef.current.detectFacesAsync(uri);
      setFaceDetected(faces.length > 0);
      return { faces };
    } catch (err) {
      console.error('Face detection error:', err);
      return { faces: [] };
    }
  }, []);

  const extractFaceDescriptor = useCallback(async (): Promise<number[] | null> => {
    if (!cameraRef.current) return null;
    
    setDetecting(true);
    setError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: true,
      });

      if (!photo) {
        setError('Failed to capture photo');
        return null;
      }

      const faces = await detectorRef.current?.detectFacesAsync(photo.uri);
      
      if (!faces || faces.length === 0) {
        setError('No face detected. Please position your face in the frame.');
        return null;
      }

      if (faces.length > 1) {
        setError('Multiple faces detected. Please ensure only your face is visible.');
        return null;
      }

      const face = faces[0];
      
      if (face.rollAngle && Math.abs(face.rollAngle) > 30) {
        setError('Please keep your head straight');
        return null;
      }

      if (face.yawAngle && Math.abs(face.yawAngle) > 30) {
        setError('Please face the camera directly');
        return null;
      }

      // Generate a simulated descriptor for demo purposes
      // In production, you'd use a proper face recognition library like face-api.js
      const descriptor = generateSimulatedDescriptor(face);
      
      if (!validateFaceDescriptor(descriptor)) {
        setError('Failed to generate face descriptor');
        return null;
      }

      setFaceDescriptor(descriptor);
      return descriptor;
    } catch (err) {
      console.error('Face extraction error:', err);
      setError('Face verification failed. Please try again.');
      return null;
    } finally {
      setDetecting(false);
    }
  }, []);

  const generateSimulatedDescriptor = (face: FaceDetector.Face): number[] => {
    const base = [
      face.bounds?.origin?.x || 0,
      face.bounds?.origin?.y || 0,
      face.bounds?.size?.width || 0,
      face.bounds?.size?.height || 0,
      face.rollAngle || 0,
      face.yawAngle || 0,
      face.smilingProbability || 0,
      face.leftEyeOpenProbability || 0,
      face.rightEyeOpenProbability || 0,
    ];

    const descriptor = new Array(128).fill(0);
    for (let i = 0; i < 128; i++) {
      descriptor[i] = (base[i % base.length] + Math.random() * 0.1) / 1000;
    }
    
    const norm = Math.sqrt(descriptor.reduce((sum, val) => sum + val * val, 0));
    return descriptor.map(val => val / norm);
  };

  const verifyFace = useCallback(async (storedDescriptor: number[]): Promise<{ isMatch: boolean; matchScore: number }> => {
    const liveDescriptor = await extractFaceDescriptor();
    if (!liveDescriptor) {
      return { isMatch: false, matchScore: 0 };
    }

    let sum = 0;
    for (let i = 0; i < 128; i++) {
      const diff = storedDescriptor[i] - liveDescriptor[i];
      sum += diff * diff;
    }
    const distance = Math.sqrt(sum);
    const matchScore = 1 - distance;
    
    return {
      isMatch: distance <= 0.6,
      matchScore: Math.max(0, Math.min(1, matchScore)),
    };
  }, [extractFaceDescriptor]);

  const reset = useCallback(() => {
    setFaceDetected(false);
    setFaceDescriptor(null);
    setError(null);
  }, []);

  return {
    cameraRef,
    permission,
    requestPermission,
    faceDetected,
    detecting,
    faceDescriptor,
    error,
    detectFaces,
    extractFaceDescriptor,
    verifyFace,
    reset,
  };
}