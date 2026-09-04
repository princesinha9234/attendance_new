import { config } from '../config/index.js';

export const deserializeFaceDescriptor = (descriptorString) => {
  try {
    return JSON.parse(descriptorString);
  } catch {
    return null;
  }
};

export const serializeFaceDescriptor = (descriptor) => {
  return JSON.stringify(Array.from(descriptor));
};

export const calculateFaceDistance = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
    return Infinity;
  }
  
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

export const verifyFaceMatch = (storedDescriptor, liveDescriptor, threshold = config.faceRecognition.matchThreshold) => {
  const distance = calculateFaceDistance(storedDescriptor, liveDescriptor);
  const matchScore = 1 - distance;
  return {
    isMatch: distance <= threshold,
    distance,
    matchScore: Math.max(0, Math.min(1, matchScore)),
  };
};

export const validateFaceDescriptor = (descriptor) => {
  if (!Array.isArray(descriptor)) return false;
  if (descriptor.length !== 128) return false;
  return descriptor.every(val => typeof val === 'number' && !isNaN(val));
};