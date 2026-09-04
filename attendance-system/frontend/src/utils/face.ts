export const calculateFaceDistance = (descriptor1: number[], descriptor2: number[]): number => {
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

export const verifyFaceMatch = (
  storedDescriptor: number[],
  liveDescriptor: number[],
  threshold = 0.6
): { isMatch: boolean; distance: number; matchScore: number } => {
  const distance = calculateFaceDistance(storedDescriptor, liveDescriptor);
  const matchScore = 1 - distance;
  return {
    isMatch: distance <= threshold,
    distance,
    matchScore: Math.max(0, Math.min(1, matchScore)),
  };
};

export const validateFaceDescriptor = (descriptor: unknown): descriptor is number[] => {
  if (!Array.isArray(descriptor)) return false;
  if (descriptor.length !== 128) return false;
  return descriptor.every(val => typeof val === 'number' && !isNaN(val));
};

export const serializeFaceDescriptor = (descriptor: number[]): string => {
  return JSON.stringify(descriptor);
};

export const deserializeFaceDescriptor = (descriptorString: string): number[] | null => {
  try {
    const parsed = JSON.parse(descriptorString);
    return validateFaceDescriptor(parsed) ? parsed : null;
  } catch {
    return null;
  }
};