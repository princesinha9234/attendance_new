import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit, AuditActions } from '../utils/audit.js';

const router = express.Router();

router.get('/', authMiddleware, requireRole('PLATFORM_OWNER', 'TEACHER'), asyncHandler(async (req, res) => {
  const { role, page = 1, limit = 20, search } = req.query;
  
  const where = {
    isActive: true,
    ...(role && { role }),
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(req.user.role === 'TEACHER' && {
      teacherProfile: { institutionId: req.user.teacherProfile.institutionId },
    }),
  };
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
        studentProfile: {
          select: { studentId: true, branch: true, classId: true, semester: true },
        },
        teacherProfile: {
          select: { employeeId: true, department: true, designation: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  
  res.json({
    users,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
}));

router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
      studentProfile: true,
      teacherProfile: {
        include: { institution: true },
      },
    },
  });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  if (req.user.role === 'STUDENT' && req.user.id !== id) {
    throw new AppError('Not authorized', 403);
  }
  
  if (req.user.role === 'TEACHER' && user.teacherProfile?.institutionId !== req.user.teacherProfile?.institutionId) {
    throw new AppError('Not authorized', 403);
  }
  
  res.json({ user });
}));

router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, avatarUrl, password, ...profileData } = req.body;
  
  if (req.user.role !== 'PLATFORM_OWNER' && req.user.id !== id) {
    throw new AppError('Not authorized', 403);
  }
  
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (phone) updateData.phone = phone;
  if (avatarUrl) updateData.avatarUrl = avatarUrl;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12);
  
  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      phone: true,
      avatarUrl: true,
    },
  });
  
  if (req.user.role === 'STUDENT' && req.user.studentProfile) {
    await prisma.studentProfile.update({
      where: { userId: id },
      data: {
        ...(profileData.branch && { branch: profileData.branch }),
        ...(profileData.classId && { classId: profileData.classId }),
        ...(profileData.semester && { semester: profileData.semester }),
        ...(profileData.section && { section: profileData.section }),
        ...(profileData.parentPhone && { parentPhone: profileData.parentPhone }),
        ...(profileData.address && { address: profileData.address }),
      },
    });
  }
  
  if (req.user.role === 'TEACHER' && req.user.teacherProfile) {
    await prisma.teacherProfile.update({
      where: { userId: id },
      data: {
        ...(profileData.department && { department: profileData.department }),
        ...(profileData.designation && { designation: profileData.designation }),
        ...(profileData.subjects && { subjects: profileData.subjects }),
      },
    });
  }
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.USER_UPDATED,
    entityType: 'User',
    entityId: id,
    newData: updateData,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.json({ user: updatedUser });
}));

router.delete('/:id', authMiddleware, requireRole('PLATFORM_OWNER'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (id === req.user.id) {
    throw new AppError('Cannot delete yourself', 400);
  }
  
  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.USER_DELETED,
    entityType: 'User',
    entityId: id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.json({ message: 'User deactivated' });
}));

router.get('/stats/overview', authMiddleware, requireRole('PLATFORM_OWNER'), asyncHandler(async (req, res) => {
  const [totalUsers, totalStudents, totalTeachers, totalInstitutions] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
    prisma.user.count({ where: { role: 'TEACHER', isActive: true } }),
    prisma.institution.count(),
  ]);
  
  res.json({ totalUsers, totalStudents, totalTeachers, totalInstitutions });
}));

export default router;