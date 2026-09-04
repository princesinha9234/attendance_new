import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit, AuditActions } from '../utils/audit.js';
import { isWithinGeofence } from '../utils/geofence.js';

const router = express.Router();

router.post('/', authMiddleware, requireRole('TEACHER'), [
  body('subjectClassMappingId').isUUID(),
  body('scheduledStart').isISO8601(),
  body('scheduledEnd').isISO8601(),
  body('locationLat').optional().isFloat({ min: -90, max: 90 }),
  body('locationLng').optional().isFloat({ min: -180, max: 180 }),
  body('allowedRadius').optional().isFloat({ min: 1, max: 1000 }),
  body('requireFaceVerify').optional().isBoolean(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { subjectClassMappingId, scheduledStart, scheduledEnd, locationLat, locationLng, allowedRadius, requireFaceVerify } = req.body;
  
  const mapping = await prisma.subjectClassMapping.findUnique({
    where: { id: subjectClassMappingId },
    include: { class: true, subject: true, teacher: true },
  });
  
  if (!mapping) {
    throw new AppError('Subject-class mapping not found', 404);
  }
  
  if (mapping.teacherId !== req.user.teacherProfile?.id) {
    throw new AppError('Not authorized for this subject', 403);
  }
  
  const session = await prisma.classSession.create({
    data: {
      subjectClassMappingId,
      teacherId: req.user.teacherProfile.id,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      locationLat,
      locationLng,
      allowedRadius: allowedRadius || 50,
      requireFaceVerify: requireFaceVerify !== false,
      status: 'SCHEDULED',
    },
    include: {
      subjectClassMapping: {
        include: { subject: true, class: true, teacher: { include: { user: true } } },
      },
    },
  });
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.SESSION_CREATED,
    entityType: 'ClassSession',
    entityId: session.id,
    newData: { subjectClassMappingId, scheduledStart, scheduledEnd },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.status(201).json({ session });
}));

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { classId, subjectId, teacherId, status, startDate, endDate, page = 1, limit = 20 } = req.query;
  
  let where = {};
  
  if (req.user.role === 'TEACHER') {
    where.teacherId = req.user.teacherProfile?.id;
  } else if (teacherId) {
    where.teacherId = teacherId;
  }
  
  if (classId) {
    where.subjectClassMapping = { classId };
  }
  if (subjectId) {
    where.subjectClassMapping = { ...where.subjectClassMapping, subjectId };
  }
  if (status) where.status = status;
  if (startDate && endDate) {
    where.scheduledStart = { gte: new Date(startDate), lte: new Date(endDate) };
  }
  
  const [sessions, total] = await Promise.all([
    prisma.classSession.findMany({
      where,
      include: {
        subjectClassMapping: {
          include: { subject: true, class: true, teacher: { include: { user: true } } },
        },
        _count: { select: { attendanceRecords: true } },
      },
      orderBy: { scheduledStart: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.classSession.count({ where }),
  ]);
  
  res.json({ sessions, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
}));

router.get('/upcoming', authMiddleware, requireRole('STUDENT'), asyncHandler(async (req, res) => {
  const studentProfile = req.user.studentProfile;
  if (!studentProfile) throw new AppError('Student profile not found', 404);
  
  const classMappings = await prisma.subjectClassMapping.findMany({
    where: { classId: studentProfile.classId },
    select: { id: true },
  });
  
  const mappingIds = classMappings.map(m => m.id);
  
  const sessions = await prisma.classSession.findMany({
    where: {
      subjectClassMappingId: { in: mappingIds },
      scheduledStart: { gte: new Date() },
      status: { in: ['SCHEDULED', 'ONGOING'] },
    },
    include: {
      subjectClassMapping: { include: { subject: true, class: true, teacher: { include: { user: true } } } },
    },
    orderBy: { scheduledStart: 'asc' },
    take: 20,
  });
  
  res.json({ sessions });
}));

router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const session = await prisma.classSession.findUnique({
    where: { id },
    include: {
      subjectClassMapping: {
        include: { subject: true, class: true, teacher: { include: { user: true } } },
      },
      attendanceRecords: {
        include: { student: { include: { user: true } }, markedBy: { select: { fullName: true } } },
        orderBy: { markedAt: 'desc' },
      },
    },
  });
  
  if (!session) throw new AppError('Session not found', 404);
  
  if (req.user.role === 'TEACHER' && session.teacherId !== req.user.teacherProfile?.id) {
    throw new AppError('Not authorized', 403);
  }
  
  if (req.user.role === 'STUDENT' && session.subjectClassMapping.classId !== req.user.studentProfile?.classId) {
    throw new AppError('Not authorized', 403);
  }
  
  res.json({ session });
}));

router.put('/:id/start', authMiddleware, requireRole('TEACHER'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { locationLat, locationLng, allowedRadius } = req.body;
  
  const session = await prisma.classSession.findUnique({ where: { id } });
  if (!session) throw new AppError('Session not found', 404);
  if (session.teacherId !== req.user.teacherProfile?.id) throw new AppError('Not authorized', 403);
  if (session.status !== 'SCHEDULED') throw new AppError('Session already started or completed', 400);
  
  const updated = await prisma.classSession.update({
    where: { id },
    data: {
      status: 'ONGOING',
      actualStart: new Date(),
      ...(locationLat && { locationLat }),
      ...(locationLng && { locationLng }),
      ...(allowedRadius && { allowedRadius }),
    },
  });
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.SESSION_STARTED,
    entityType: 'ClassSession',
    entityId: id,
    newData: { locationLat, locationLng, allowedRadius },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  req.io?.to(`session:${id}`).emit('session-started', { sessionId: id });
  
  res.json({ session: updated });
}));

router.put('/:id/end', authMiddleware, requireRole('TEACHER'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const session = await prisma.classSession.findUnique({ where: { id } });
  if (!session) throw new AppError('Session not found', 404);
  if (session.teacherId !== req.user.teacherProfile?.id) throw new AppError('Not authorized', 403);
  if (session.status !== 'ONGOING') throw new AppError('Session not in progress', 400);
  
  const updated = await prisma.classSession.update({
    where: { id },
    data: { status: 'COMPLETED', actualEnd: new Date(), qrCodeData: null, qrExpiresAt: null },
  });
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.SESSION_ENDED,
    entityType: 'ClassSession',
    entityId: id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  req.io?.to(`session:${id}`).emit('session-ended', { sessionId: id });
  
  res.json({ session: updated });
}));

router.put('/:id/geofence', authMiddleware, requireRole('TEACHER'), [
  body('locationLat').isFloat({ min: -90, max: 90 }),
  body('locationLng').isFloat({ min: -180, max: 180 }),
  body('allowedRadius').isFloat({ min: 1, max: 1000 }),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  
  const { id } = req.params;
  const { locationLat, locationLng, allowedRadius } = req.body;
  
  const session = await prisma.classSession.findUnique({ where: { id } });
  if (!session) throw new AppError('Session not found', 404);
  if (session.teacherId !== req.user.teacherProfile?.id) throw new AppError('Not authorized', 403);
  
  const updated = await prisma.classSession.update({
    where: { id },
    data: { locationLat, locationLng, allowedRadius },
  });
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.GEOFENCE_SET,
    entityType: 'ClassSession',
    entityId: id,
    newData: { locationLat, locationLng, allowedRadius },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.json({ session: updated });
}));

router.delete('/:id', authMiddleware, requireRole('TEACHER'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const session = await prisma.classSession.findUnique({ where: { id } });
  if (!session) throw new AppError('Session not found', 404);
  if (session.teacherId !== req.user.teacherProfile?.id) throw new AppError('Not authorized', 403);
  if (session.status === 'COMPLETED') throw new AppError('Cannot delete completed session', 400);
  
  await prisma.classSession.delete({ where: { id } });
  
  res.json({ message: 'Session deleted' });
}));

export default router;