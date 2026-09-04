import express from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { generateQRToken, generateQRCodeData, generateQRCodeImage, parseQRCodeData, calculateQRExpiry, isQRCodeExpired } from '../utils/qr.js';
import { logAudit, AuditActions } from '../utils/audit.js';
import { isWithinGeofence } from '../utils/geofence.js';

const router = express.Router();

router.post('/generate', authMiddleware, requireRole('TEACHER'), [
  body('sessionId').isUUID(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { sessionId } = req.body;
  
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      subjectClassMapping: {
        include: {
          subject: true,
          class: true,
          teacher: true,
        },
      },
    },
  });
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  if (session.teacherId !== req.user.teacherProfile?.id) {
    throw new AppError('Not authorized for this session', 403);
  }
  
  if (session.status !== 'SCHEDULED' && session.status !== 'ONGOING') {
    throw new AppError('Cannot generate QR for this session status', 400);
  }
  
  const token = generateQRToken();
  const expiresAt = calculateQRExpiry();
  const qrData = generateQRCodeData(sessionId, token);
  const qrImage = await generateQRCodeImage(qrData);
  
  await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      qrCodeData: token,
      qrExpiresAt: expiresAt,
      status: 'ONGOING',
      actualStart: new Date(),
    },
  });
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.QR_GENERATED,
    entityType: 'ClassSession',
    entityId: sessionId,
    newData: { token, expiresAt: expiresAt.toISOString() },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  req.io?.to(`session:${sessionId}`).emit('qr-generated', {
    sessionId,
    qrCode: qrImage,
    expiresAt: expiresAt.toISOString(),
  });
  
  res.json({
    qrCode: qrImage,
    token,
    expiresAt: expiresAt.toISOString(),
    session: {
      id: session.id,
      subject: session.subjectClassMapping.subject.name,
      class: session.subjectClassMapping.class.name,
    },
  });
}));

router.post('/verify', [
  body('qrData').notEmpty(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { qrData, latitude, longitude } = req.body;
  
  let parsed;
  try {
    parsed = parseQRCodeData(qrData);
  } catch {
    throw new AppError('Invalid QR code', 400, 'INVALID_QR');
  }
  
  const session = await prisma.classSession.findUnique({
    where: { qrCodeData: parsed.token },
    include: {
      subjectClassMapping: {
        include: {
          subject: true,
          class: true,
          teacher: {
            include: { user: true },
          },
        },
      },
    },
  });
  
  if (!session) {
    throw new AppError('Invalid or expired QR code', 400, 'INVALID_QR');
  }
  
  if (isQRCodeExpired(session.qrExpiresAt)) {
    throw new AppError('QR code has expired', 400, 'QR_EXPIRED');
  }
  
  if (session.status !== 'ONGOING') {
    throw new AppError('Session is not active', 400, 'SESSION_INACTIVE');
  }
  
  let geofenceResult = { isWithin: true, distance: 0, allowedRadius: session.allowedRadius || 50 };
  
  if (session.locationLat && session.locationLng && latitude && longitude) {
    geofenceResult = isWithinGeofence(
      latitude,
      longitude,
      session.locationLat,
      session.locationLng,
      session.allowedRadius
    );
    
    if (!geofenceResult.isWithin) {
      throw new AppError(
        `You are ${geofenceResult.distance}m away. Allowed radius: ${geofenceResult.allowedRadius}m`,
        400,
        'OUTSIDE_GEOFENCE'
      );
    }
  }
  
  await logAudit({
    userId: req.user?.id,
    action: AuditActions.QR_VERIFIED,
    entityType: 'ClassSession',
    entityId: session.id,
    newData: { geofence: geofenceResult },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.json({
    valid: true,
    session: {
      id: session.id,
      subject: session.subjectClassMapping.subject.name,
      subjectCode: session.subjectClassMapping.subject.code,
      class: session.subjectClassMapping.class.name,
      teacher: session.subjectClassMapping.teacher.user.fullName,
      scheduledStart: session.scheduledStart,
      scheduledEnd: session.scheduledEnd,
      requireFaceVerify: session.requireFaceVerify,
      geofence: geofenceResult,
    },
  });
}));

router.get('/session/:sessionId/status', authMiddleware, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      qrCodeData: true,
      qrExpiresAt: true,
      actualStart: true,
      actualEnd: true,
      requireFaceVerify: true,
    },
  });
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  const isExpired = session.qrExpiresAt ? isQRCodeExpired(session.qrExpiresAt) : false;
  
  res.json({
    session: {
      ...session,
      qrExpired: isExpired,
      isActive: session.status === 'ONGOING' && !isExpired,
    },
  });
}));

export default router;