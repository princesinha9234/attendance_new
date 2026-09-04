import express from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateFaceDescriptor, serializeFaceDescriptor } from '../utils/face.js';
import { logAudit, AuditActions } from '../utils/audit.js';

const router = express.Router();

router.post('/enroll', authMiddleware, [
  body('faceDescriptor').isArray(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { faceDescriptor } = req.body;
  
  if (!validateFaceDescriptor(faceDescriptor)) {
    throw new AppError('Invalid face descriptor. Must be 128-dimensional array.', 400, 'INVALID_DESCRIPTOR');
  }
  
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, faceDescriptor: true },
  });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  const serialized = serializeFaceDescriptor(faceDescriptor);
  
  await prisma.user.update({
    where: { id: req.user.id },
    data: { faceDescriptor: serialized },
  });
  
  await prisma.faceEnrollment.upsert({
    where: { userId: req.user.id },
    create: {
      userId: req.user.id,
      descriptors: JSON.stringify([faceDescriptor]),
    },
    update: {
      descriptors: JSON.stringify([faceDescriptor]),
      updatedAt: new Date(),
    },
  });
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.FACE_ENROLLED,
    entityType: 'FaceEnrollment',
    entityId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.json({
    message: 'Face enrolled successfully',
    enrolled: true,
  });
}));

router.get('/status', authMiddleware, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { faceDescriptor: true },
  });
  
  const enrollment = await prisma.faceEnrollment.findUnique({
    where: { userId: req.user.id },
    select: { enrolledAt: true, updatedAt: true, isActive: true },
  });
  
  res.json({
    enrolled: !!user?.faceDescriptor,
    enrollmentDate: enrollment?.enrolledAt,
    lastUpdated: enrollment?.updatedAt,
    isActive: enrollment?.isActive ?? false,
  });
}));

router.delete('/enroll', authMiddleware, asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { faceDescriptor: null },
  });
  
  await prisma.faceEnrollment.update({
    where: { userId: req.user.id },
    data: { isActive: false },
  });
  
  await logAudit({
    userId: req.user.id,
    action: 'FACE_UNENROLLED',
    entityType: 'FaceEnrollment',
    entityId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.json({ message: 'Face enrollment removed' });
}));

export default router;