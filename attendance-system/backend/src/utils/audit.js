import prisma from '../config/prisma.js';

export const logAudit = async (data) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldData: data.oldData ? JSON.stringify(data.oldData) : null,
        newData: data.newData ? JSON.stringify(data.newData) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

export const AuditActions = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  ATTENDANCE_MARKED: 'ATTENDANCE_MARKED',
  ATTENDANCE_MANUAL: 'ATTENDANCE_MANUAL',
  QR_GENERATED: 'QR_GENERATED',
  QR_VERIFIED: 'QR_VERIFIED',
  FACE_ENROLLED: 'FACE_ENROLLED',
  FACE_VERIFIED: 'FACE_VERIFIED',
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_ENDED: 'SESSION_ENDED',
  GEOFENCE_SET: 'GEOFENCE_SET',
  INSTITUTION_CREATED: 'INSTITUTION_CREATED',
  CLASS_CREATED: 'CLASS_CREATED',
  SUBJECT_ASSIGNED: 'SUBJECT_ASSIGNED',
};