import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit, AuditActions } from '../utils/audit.js';

const router = express.Router();

router.post('/', authMiddleware, requireRole('PLATFORM_OWNER'), [
  body('name').trim().notEmpty(),
  body('code').trim().notEmpty(),
  body('address').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('state').trim().notEmpty(),
  body('country').optional().trim(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { name, code, address, city, state, country } = req.body;
  
  const existing = await prisma.institution.findUnique({ where: { code } });
  if (existing) {
    throw new AppError('Institution code already exists', 409, 'CODE_EXISTS');
  }
  
  const institution = await prisma.institution.create({
    data: {
      name,
      code: code.toUpperCase(),
      address,
      city,
      state,
      country: country || 'India',
      ownerId: req.user.id,
    },
  });
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.INSTITUTION_CREATED,
    entityType: 'Institution',
    entityId: institution.id,
    newData: { name, code },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.status(201).json({ institution });
}));

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const where = req.user.role === 'PLATFORM_OWNER' 
    ? {} 
    : { id: req.user.teacherProfile?.institutionId };
  
  const institutions = await prisma.institution.findMany({
    where,
    include: {
      _count: { select: { teachers: true, classes: true, subjects: true } },
      owner: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  res.json({ institutions });
}));

router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const institution = await prisma.institution.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      teachers: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
      classes: {
        include: { _count: { select: { students: true } } },
      },
      subjects: true,
    },
  });
  
  if (!institution) {
    throw new AppError('Institution not found', 404);
  }
  
  if (req.user.role === 'TEACHER' && institution.id !== req.user.teacherProfile?.institutionId) {
    throw new AppError('Not authorized', 403);
  }
  
  res.json({ institution });
}));

router.put('/:id', authMiddleware, requireRole('PLATFORM_OWNER'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, address, city, state, country } = req.body;
  
  const institution = await prisma.institution.update({
    where: { id },
    data: { name, address, city, state, country },
  });
  
  res.json({ institution });
}));

router.delete('/:id', authMiddleware, requireRole('PLATFORM_OWNER'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await prisma.institution.delete({ where: { id } });
  
  res.json({ message: 'Institution deleted' });
}));

export default router;