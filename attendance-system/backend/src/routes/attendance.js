import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { verifyFaceMatch, validateFaceDescriptor } from '../utils/face.js';
import { isWithinGeofence } from '../utils/geofence.js';
import { logAudit, AuditActions } from '../utils/audit.js';

const router = express.Router();

router.post('/mark', authMiddleware, requireRole('STUDENT'), [
  body('sessionId').isUUID(),
  body('faceDescriptor').optional().isArray(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('deviceInfo').optional().isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { sessionId, faceDescriptor, latitude, longitude, deviceInfo } = req.body;
  const studentProfile = req.user.studentProfile;
  
  if (!studentProfile) {
    throw new AppError('Student profile not found', 404);
  }
  
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      subjectClassMapping: {
        include: {
          class: true,
          subject: true,
        },
      },
    },
  });
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  if (session.status !== 'ONGOING') {
    throw new AppError('Session is not active', 400, 'SESSION_INACTIVE');
  }
  
  if (session.qrExpiresAt && new Date() > session.qrExpiresAt) {
    throw new AppError('QR code has expired', 400, 'QR_EXPIRED');
  }
  
  const classId = session.subjectClassMapping.class.id;
  if (studentProfile.classId !== classId) {
    throw new AppError('You are not enrolled in this class', 403, 'WRONG_CLASS');
  }
  
  const existingAttendance = await prisma.attendanceRecord.findUnique({
    where: {
      studentId_sessionId: {
        studentId: studentProfile.id,
        sessionId,
      },
    },
  });
  
  if (existingAttendance) {
    throw new AppError('Attendance already marked for this session', 409, 'ALREADY_MARKED');
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
        `You are ${geofenceResult.distance}m away from class. Allowed: ${geofenceResult.allowedRadius}m`,
        400,
        'OUTSIDE_GEOFENCE'
      );
    }
  }
  
  let faceVerified = false;
  let faceMatchScore = null;
  
  if (session.requireFaceVerify) {
    if (!faceDescriptor || !validateFaceDescriptor(faceDescriptor)) {
      throw new AppError('Face verification required', 400, 'FACE_REQUIRED');
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { faceDescriptor: true },
    });
    
    if (!user?.faceDescriptor) {
      throw new AppError('Face not enrolled. Please enroll your face first.', 400, 'FACE_NOT_ENROLLED');
    }
    
    const storedDescriptor = JSON.parse(user.faceDescriptor);
    const result = verifyFaceMatch(storedDescriptor, faceDescriptor);
    
    faceVerified = result.isMatch;
    faceMatchScore = result.matchScore;
    
    if (!faceVerified) {
      throw new AppError('Face verification failed. Please try again.', 400, 'FACE_MISMATCH');
    }
    
    await logAudit({
      userId: req.user.id,
      action: AuditActions.FACE_VERIFIED,
      entityType: 'AttendanceRecord',
      entityId: sessionId,
      newData: { matchScore: faceMatchScore },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
  
  const status = new Date() > session.scheduledStart ? 'LATE' : 'PRESENT';
  
  const attendance = await prisma.attendanceRecord.create({
    data: {
      studentId: studentProfile.id,
      sessionId,
      markedById: req.user.id,
      status,
      method: session.requireFaceVerify ? 'QR_FACE' : 'QR_ONLY',
      latitude,
      longitude,
      faceVerified,
      faceMatchScore,
      deviceInfo,
    },
    include: {
      session: {
        include: {
          subjectClassMapping: {
            include: {
              subject: true,
              class: true,
            },
          },
        },
      },
    },
  });
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.ATTENDANCE_MARKED,
    entityType: 'AttendanceRecord',
    entityId: attendance.id,
    newData: { sessionId, status, method: attendance.method },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  req.io?.to(`session:${sessionId}`).emit('attendance-marked', {
    studentId: studentProfile.id,
    studentName: req.user.fullName,
    status,
    timestamp: attendance.markedAt,
  });
  
  res.status(201).json({
    message: 'Attendance marked successfully',
    attendance: {
      id: attendance.id,
      status: attendance.status,
      method: attendance.method,
      markedAt: attendance.markedAt,
      faceVerified: attendance.faceVerified,
      faceMatchScore: attendance.faceMatchScore,
      session: {
        subject: attendance.session.subjectClassMapping.subject.name,
        class: attendance.session.subjectClassMapping.class.name,
      },
    },
  });
}));

router.post('/manual', authMiddleware, requireRole('TEACHER'), [
  body('sessionId').isUUID(),
  body('studentId').isUUID(),
  body('status').isIn(['PRESENT', 'ABSENT', 'LATE']),
  body('notes').optional().isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }
  
  const { sessionId, studentId, status, notes } = req.body;
  
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      subjectClassMapping: {
        include: { class: true },
      },
    },
  });
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  if (session.teacherId !== req.user.teacherProfile?.id) {
    throw new AppError('Not authorized for this session', 403);
  }
  
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: { user: true },
  });
  
  if (!student) {
    throw new AppError('Student not found', 404);
  }
  
  if (student.classId !== session.subjectClassMapping.class.id) {
    throw new AppError('Student not in this class', 403);
  }
  
  const existingAttendance = await prisma.attendanceRecord.findUnique({
    where: {
      studentId_sessionId: {
        studentId,
        sessionId,
      },
    },
  });
  
  let attendance;
  if (existingAttendance) {
    attendance = await prisma.attendanceRecord.update({
      where: { id: existingAttendance.id },
      data: {
        status,
        markedById: req.user.id,
        method: 'MANUAL',
        notes,
        markedAt: new Date(),
      },
      include: {
        session: {
          include: {
            subjectClassMapping: {
              include: { subject: true, class: true },
            },
          },
        },
      },
    });
  } else {
    attendance = await prisma.attendanceRecord.create({
      data: {
        studentId,
        sessionId,
        markedById: req.user.id,
        status,
        method: 'MANUAL',
        notes,
      },
      include: {
        session: {
          include: {
            subjectClassMapping: {
              include: { subject: true, class: true },
            },
          },
        },
      },
    });
  }
  
  await logAudit({
    userId: req.user.id,
    action: AuditActions.ATTENDANCE_MANUAL,
    entityType: 'AttendanceRecord',
    entityId: attendance.id,
    newData: { studentId, sessionId, status, method: 'MANUAL' },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  req.io?.to(`session:${sessionId}`).emit('attendance-manual', {
    studentId,
    studentName: student.user.fullName,
    status,
    markedBy: req.user.fullName,
    timestamp: attendance.markedAt,
  });
  
  res.json({
    message: 'Attendance updated successfully',
    attendance: {
      id: attendance.id,
      status: attendance.status,
      method: attendance.method,
      markedAt: attendance.markedAt,
      student: {
        id: student.id,
        name: student.user.fullName,
        studentId: student.studentId,
      },
    },
  });
}));

router.get('/session/:sessionId', authMiddleware, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { status, page = 1, limit = 50 } = req.query;
  
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      subjectClassMapping: {
        include: { class: true, subject: true },
      },
    },
  });
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  const isTeacher = req.user.role === 'TEACHER' && session.teacherId === req.user.teacherProfile?.id;
  const isStudent = req.user.role === 'STUDENT';
  
  if (!isTeacher && !isStudent) {
    throw new AppError('Not authorized', 403);
  }
  
  const where = {
    sessionId,
    ...(status && { status }),
    ...(isStudent && { studentId: req.user.studentProfile?.id }),
  };
  
  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      include: {
        student: {
          include: { user: true },
        },
        markedBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { markedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.attendanceRecord.count({ where }),
  ]);
  
  res.json({
    records,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
    session: {
      id: session.id,
      subject: session.subjectClassMapping.subject.name,
      class: session.subjectClassMapping.class.name,
      status: session.status,
    },
  });
}));

router.get('/my-records', authMiddleware, requireRole('STUDENT'), asyncHandler(async (req, res) => {
  const { startDate, endDate, subjectId, status, page = 1, limit = 20 } = req.query;
  const studentId = req.user.studentProfile?.id;
  
  if (!studentId) {
    throw new AppError('Student profile not found', 404);
  }
  
  const where = {
    studentId,
    ...(startDate && endDate && {
      markedAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }),
    ...(subjectId && {
      session: {
        subjectClassMapping: { subjectId },
      },
    }),
    ...(status && { status }),
  };
  
  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      include: {
        session: {
          include: {
            subjectClassMapping: {
              include: { subject: true, class: true },
            },
          },
        },
      },
      orderBy: { markedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.attendanceRecord.count({ where }),
  ]);
  
  const stats = await prisma.attendanceRecord.groupBy({
    by: ['status'],
    where: { studentId },
    _count: true,
  });
  
  const statsMap = stats.reduce((acc, s) => {
    acc[s.status] = s._count;
    return acc;
  }, {});
  
  res.json({
    records,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    stats: {
      present: statsMap.PRESENT || 0,
      absent: statsMap.ABSENT || 0,
      late: statsMap.LATE || 0,
      total: records.length,
    },
  });
}));

router.get('/class/:classId/summary', authMiddleware, requireRole('TEACHER'), asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { subjectId, startDate, endDate } = req.query;
  
  const teacherProfile = req.user.teacherProfile;
  if (!teacherProfile) {
    throw new AppError('Teacher profile not found', 404);
  }
  
  const classMappings = await prisma.subjectClassMapping.findMany({
    where: {
      classId,
      teacherId: teacherProfile.id,
    },
    include: { subject: true },
  });
  
  const subjectIds = classMappings.map(m => m.subjectId);
  const sessionIds = await prisma.classSession.findMany({
    where: {
      subjectClassMappingId: { in: classMappings.map(m => m.id) },
      ...(subjectId && { subjectClassMapping: { subjectId } }),
      ...(startDate && endDate && {
        scheduledStart: { gte: new Date(startDate), lte: new Date(endDate) },
      }),
    },
    select: { id: true },
  });
  
  const sessionIdList = sessionIds.map(s => s.id);
  
  const students = await prisma.studentProfile.findMany({
    where: { classId, user: { isActive: true } },
    include: { user: true },
  });
  
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { sessionId: { in: sessionIdList } },
    include: { session: { include: { subjectClassMapping: { include: { subject: true } } } } },
  });
  
  const summary = students.map(student => {
    const studentRecords = attendanceRecords.filter(r => r.studentId === student.id);
    const bySubject = {};
    
    classMappings.forEach(mapping => {
      const subjectRecords = studentRecords.filter(r => r.session.subjectClassMapping.subjectId === mapping.subjectId);
      bySubject[mapping.subject.code] = {
        subject: mapping.subject.name,
        present: subjectRecords.filter(r => r.status === 'PRESENT').length,
        absent: subjectRecords.filter(r => r.status === 'ABSENT').length,
        late: subjectRecords.filter(r => r.status === 'LATE').length,
        total: subjectRecords.length,
      };
    });
    
    return {
      studentId: student.id,
      studentName: student.user.fullName,
      rollNumber: student.studentId,
      overall: {
        present: studentRecords.filter(r => r.status === 'PRESENT').length,
        absent: studentRecords.filter(r => r.status === 'ABSENT').length,
        late: studentRecords.filter(r => r.status === 'LATE').length,
        total: studentRecords.length,
      },
      bySubject,
    };
  });
  
  res.json({ summary, totalStudents: students.length });
}));

export default router;