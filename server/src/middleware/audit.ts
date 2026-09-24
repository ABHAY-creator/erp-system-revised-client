import prisma from '../db';

export interface AuditLogParams {
  userId?: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  recordId?: string;
  details?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        action: params.action,
        module: params.module,
        recordId: params.recordId,
        details: params.details,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
