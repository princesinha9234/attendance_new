import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit, AuditActions } from '../utils/audit.js';

const router = express.Router();

router.post('/', authMiddleware, requireRole('PLATFORM_OWNER', 'TEACHER'), [
  body('name').trim().notEmpty(),
  body('branch').trim().notEmpty(),
  body('semester').isInt({ min: 1, max: 10 }),
  body('section').trim().notEmpty(),
  body('academicYear').trim().notEmpty(),
  body('institutionId').isUUID(),
  body('classTeacherId').optional().isUUID(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { name, branch, semester, section, academicYear, institutionId, classTeacherId } = req.body;
  
  if (req.user.role === 'TEACHER' && req.user.teacherProfile?.institutionId !== institutionId) {
    throw new AppError('Not authorized for this institution', 403);
  }
  
  const clazz = await prisma.class.create({
    data: {
      name,
      branch,
      semester,
      section,
      academicYear,
      institutionId,
      classTeacherId,
    },
    include: {
      institution: true,
      classTeacher: { select: { id: true, fullName: true } },
    },
  });
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.CLASS_CREATED,
    entityType: 'Class',
    entityId: clazz.id,
    newData: { name, branch, semester, section },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.status(201).json({ class: clazz });
}));

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { institutionId, branch, semester, page = 1, limit = 20 } = req.query;
  
  let where = {};
  
  if (req.user.role === 'TEACHER') {
    where.institutionId = req.user.teacherProfile?.institutionId;
  } else if (institutionId) {
    where.institutionId = institutionId;
  }
  
  if (branch) where.branch = branch;
  if (semester) where.semester = parseInt(semester);
  
  const [classes, total] = await Promise.all([
    prisma.class.findMany({
      where,
      include: {
        institution: true,
        classTeacher: { select: { id: true, fullName: true } },
        _count: { select: { students: true, sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.class.count({ where }),
  ]);
  
  res.json({
    classes,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
}));

router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const clazz = await prisma.class.findUnique({
    where: { id },
    include: {
      institution: true,
      classTeacher: { select: { id: true, fullName: true, email: true } },
      students: {
        include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
      },
      subjectMappings: {
        include: {
          subject: true,
          teacher: { include: { user: { select: { id: true, fullName: true } } } },
        },
      },
    },
  });
  
  if (!clazz) {
    throw new AppError('Class not found', 404);
  }
  
  if (req.user.role === 'TEACHER' && clazz.institutionId !== req.user.teacherProfile?.institutionId) {
    throw new AppError('Not authorized', 403);
  }
  
  res.json({ class: clazz });
}));

router.put('/:id', authMiddleware, requireRole('PLATFORM_OWNER', 'TEACHER'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, branch, semester, section, academicYear, classTeacherId } = req.body;
  
  const clazz = await prisma.class.findUnique({ where: { id } });
  if (!clazz) {
    throw new AppError('Class not found', 404);
  }
  
  if (req.user.role === 'TEACHER' && clazz.institutionId !== req.user.teacherProfile?.institutionId) {
    throw new AppError('Not authorized', 403);
  }
  
  const updated = await prisma.class.update({
    where: { id },
    data: { name, branch, semester, section, academicYear, classTeacherId },
    include: { institution: true, classTeacher: { select: { id: true, fullName: true } } },
  });
  
  res.json({ class: updated });
}));

router.delete('/:id', authMiddleware, requireRole('PLATFORM_OWNER'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await prisma.class.delete({ where: { id } });
  
  res.json({ message: 'Class deleted' });
}));

router.post('/:id/students', authMiddleware, requireRole('PLATFORM_OWNER', 'TEACHER'), [
  body('studentIds').isArray(),
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { studentIds } = req.body;
  
  const clazz = await prisma.class.findUnique({ where: { id } });
  if (!clazz) {
    throw new AppError('Class not found', 404);
  }
  
  if (req.user.role === 'TEACHER' && clazz.institutionId !== req.user.teacherProfile?.institutionId) {
    throw new AppError('Not authorized', 403);
  }
  
  await prisma.studentProfile.updateMany({
    where: { id: { in: studentIds } },
    data: { classId: id },
  });
  
  res.json({ message: 'Students added to class' });
}));

export default router;