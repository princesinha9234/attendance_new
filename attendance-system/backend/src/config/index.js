import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:19006',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  qrCode: {
    expiryMinutes: parseInt(process.env.QR_CODE_EXPIRY_MINUTES) || 10,
    baseUrl: process.env.QR_CODE_BASE_URL || 'http://localhost:3000/api/attendance/verify-qr',
  },
  
  faceRecognition: {
    matchThreshold: parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.6,
    detectionThreshold: parseFloat(process.env.FACE_DETECTION_THRESHOLD) || 0.5,
  },
  
  geofencing: {
    defaultAllowedRadius: parseFloat(process.env.DEFAULT_ALLOWED_RADIUS) || 50,
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
    path: process.env.UPLOAD_PATH || './uploads',
  },
  
  database: {
    url: process.env.DATABASE_URL,
  },
};