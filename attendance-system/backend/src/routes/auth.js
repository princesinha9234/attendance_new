import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { config } from '../config/index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { logAudit, AuditActions } from '../utils/audit.js';

const router = express.Router();

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
  
  return { accessToken, refreshToken };
};

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('fullName').trim().notEmpty(),
  body('role').isIn(['STUDENT', 'TEACHER', 'PLATFORM_OWNER']),
  body('phone').optional().isMobilePhone(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { email, password, fullName, role, phone, ...profileData } = req.body;
  
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  }
  
  const passwordHash = await bcrypt.hash(password, 12);
  
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role,
      phone,
      ...(role === 'STUDENT' && {
        studentProfile: {
          create: {
            studentId: profileData.studentId,
            branch: profileData.branch,
            classId: profileData.classId,
            semester: profileData.semester,
            enrollmentYear: profileData.enrollmentYear,
            section: profileData.section,
            parentPhone: profileData.parentPhone,
            address: profileData.address,
          },
        },
      }),
      ...(role === 'TEACHER' && {
        teacherProfile: {
          create: {
            employeeId: profileData.employeeId,
            department: profileData.department,
            designation: profileData.designation,
            subjects: profileData.subjects || [],
            institutionId: profileData.institutionId,
          },
        },
      }),
    },
    include: {
      studentProfile: true,
      teacherProfile: true,
    },
  });
  
  const tokens = generateTokens(user);
  
  await logAudit({
    userId: user.id,
    action: AuditActions.USER_CREATED,
    entityType: 'User',
    entityId: user.id,
    newData: { email, role, fullName },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.status(201).json({
    message: 'Registration successful',
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      studentProfile: user.studentProfile,
      teacherProfile: user.teacherProfile,
    },
    ...tokens,
  });
}));

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { email, password } = req.body;
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      studentProfile: true,
      teacherProfile: true,
    },
  });
  
  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }
  
  const tokens = generateTokens(user);
  
  await logAudit({
    userId: user.id,
    action: AuditActions.USER_LOGIN,
    entityType: 'User',
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      faceDescriptor: user.faceDescriptor ? true : false,
      studentProfile: user.studentProfile,
      teacherProfile: user.teacherProfile,
    },
    ...tokens,
  });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new AppError('Refresh token required', 400, 'TOKEN_REQUIRED');
  }
  
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }
  
  if (decoded.type !== 'refresh') {
    throw new AppError('Invalid token type', 401, 'INVALID_TOKEN');
  }
  
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, isActive: true },
  });
  
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401, 'USER_INACTIVE');
  }
  
  const tokens = generateTokens(user);
  
  res.json({ ...tokens });
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      await logAudit({
        userId: decoded.userId,
        action: AuditActions.USER_LOGOUT,
        entityType: 'User',
        entityId: decoded.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch {}
  }
  
  res.json({ message: 'Logged out successfully' });
}));

router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new AppError('Not authenticated', 401);
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, config.jwt.secret);
  
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      phone: true,
      faceDescriptor: true,
      createdAt: true,
      studentProfile: true,
      teacherProfile: {
        include: {
          institution: true,
        },
      },
    },
  });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.json({ user });
}));

export default router;