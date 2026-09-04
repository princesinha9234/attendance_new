import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit, AuditActions } from '../utils/audit.js';

const router = express.Router();

router.post('/', authMiddleware, requireRole('PLATFORM_OWNER', 'TEACHER'), [
  body('code').trim().notEmpty(),
  body('name').trim().notEmpty(),
  body('credits').optional().isInt({ min: 1, max: 6 }),
  body('institutionId').isUUID(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { code, name, credits, institutionId } = req.body;
  
  if (req.user.role === 'TEACHER' && req.user.teacherProfile?.institutionId !== institutionId) {
    throw new AppError('Not authorized for this institution', 403);
  }
  
  const existing = await prisma.subject.findFirst({
    where: { code, institutionId },
  });
  if (existing) {
    throw new AppError('Subject code already exists in this institution', 409);
  }
  
  const subject = await prisma.subject.create({
    data: { code: code.toUpperCase(), name, credits: credits || 3, institutionId },
    include: { institution: true },
  });
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.SUBJECT_ASSIGNED,
    entityType: 'Subject',
    entityId: subject.id,
    newData: { code, name },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.status(201).json({ subject });
}));

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { institutionId, page = 1, limit = 50 } = req.query;
  
  let where = {};
  if (req.user.role === 'TEACHER') {
    where.institutionId = req.user.teacherProfile?.institutionId;
  } else if (institutionId) {
    where.institutionId = institutionId;
  }
  
  const [subjects, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      include: {
        institution: true,
        classMappings: {
          include: { class: true, teacher: { include: { user: { select: { fullName: true } } } } },
        },
      },
      orderBy: { code: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.subject.count({ where }),
  ]);
  
  res.json({ subjects, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
}));

router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      institution: true,
      classMappings: {
        include: {
          class: true,
          teacher: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        },
      },
    },
  });
  
  if (!subject) {
    throw new AppError('Subject not found', 404);
  }
  
  res.json({ subject });
}));

router.post('/assign', authMiddleware, requireRole('PLATFORM_OWNER', 'TEACHER'), [
  body('classId').isUUID(),
  body('subjectId').isUUID(),
  body('teacherId').isUUID(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { classId, subjectId, teacherId } = req.body;
  
  const clazz = await prisma.class.findUnique({ where: { id: classId } });
  if (!clazz) throw new AppError('Class not found', 404);
  
  if (req.user.role === 'TEACHER' && clazz.institutionId !== req.user.teacherProfile?.institutionId) {
    throw new AppError('Not authorized', 403);
  }
  
  const mapping = await prisma.subjectClassMapping.upsert({
    where: { classId_subjectId: { classId, subjectId } },
    create: { classId, subjectId, teacherId },
    update: { teacherId },
    include: {
      subject: true,
      class: true,
      teacher: { include: { user: { select: { id: true, fullName: true } } } },
    },
  });
  
  res.json({ mapping });
}));

router.delete('/assign/:classId/:subjectId', authMiddleware, requireRole('PLATFORM_OWNER', 'TEACHER'), asyncHandler(async (req, res) => {
  const { classId, subjectId } = req.params;
  
  const mapping = await prisma.subjectClassMapping.findUnique({
    where: { classId_subjectId: { classId, subjectId } },
  });
  
  if (!mapping) throw new AppError('Mapping not found', 404);
  
  const clazz = await prisma.class.findUnique({ where: { id: classId } });
  if (req.user.role === 'TEACHER' && clazz?.institutionId !== req.user.teacherProfile?.institutionId) {
    throw new AppError('Not authorized', 403);
  }
  
  await prisma.subjectClassMapping.delete({
    where: { classId_subjectId: { classId, subjectId } },
  });
  
  res.json({ message: 'Subject unassigned from class' });
}));

export default router;