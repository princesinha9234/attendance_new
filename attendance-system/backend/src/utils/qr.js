import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

export const generateQRToken = () => {
  return uuidv4().replace(/-/g, '').substring(0, 32);
};

export const generateQRCodeData = (sessionId, token) => {
  return JSON.stringify({
    sessionId,
    token,
    timestamp: Date.now(),
    type: 'ATTENDANCE_QR',
  });
};

export const generateQRCodeImage = async (data) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const parseQRCodeData = (qrData) => {
  try {
    const parsed = JSON.parse(qrData);
    if (parsed.type !== 'ATTENDANCE_QR') {
      throw new Error('Invalid QR code type');
    }
    return parsed;
  } catch {
    throw new Error('Invalid QR code format');
  }
};

export const isQRCodeExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

export const calculateQRExpiry = (minutes = config.qrCode.expiryMinutes) => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};