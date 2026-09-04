export const parseQRCodeData = (qrData: string): { sessionId: string; token: string } | null => {
  try {
    const parsed = JSON.parse(qrData);
    if (parsed.type !== 'ATTENDANCE_QR') {
      return null;
    }
    return { sessionId: parsed.sessionId, token: parsed.token };
  } catch {
    return null;
  }
};

export const isQRCodeExpired = (expiresAt: string): boolean => {
  return new Date() > new Date(expiresAt);
};

export const generateQRCodeData = (sessionId: string, token: string): string => {
  return JSON.stringify({
    sessionId,
    token,
    timestamp: Date.now(),
    type: 'ATTENDANCE_QR',
  });
};