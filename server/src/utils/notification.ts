import prisma from '../db';

export interface NotificationPayload {
  userId?: string;
  targetRole?: 'SALESPERSON' | 'SALES_MANAGER' | 'HOD' | 'ALL';
  type: 'QUOTATION' | 'SALES' | 'CUSTOMER' | 'PRODUCT' | 'SYSTEM';
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    const recipients: string[] = [];

    if (payload.userId) {
      recipients.push(payload.userId);
    }

    if (payload.targetRole) {
      let roleWhere: any = {};
      if (payload.targetRole === 'ALL') {
        roleWhere = { status: 'Active' };
      } else {
        roleWhere = { role: payload.targetRole, status: 'Active' };
      }

      const users = await prisma.user.findMany({
        where: roleWhere,
        select: { id: true },
      });

      for (const u of users) {
        if (!recipients.includes(u.id)) {
          recipients.push(u.id);
        }
      }
    }

    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((uid) => ({
          userId: uid,
          targetRole: payload.targetRole || null,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          relatedEntityType: payload.relatedEntityType || null,
          relatedEntityId: payload.relatedEntityId || null,
          isRead: false,
        })),
      });
    } else {
      // Fallback: general broadcast record
      await prisma.notification.create({
        data: {
          userId: null,
          targetRole: payload.targetRole || 'ALL',
          type: payload.type,
          title: payload.title,
          message: payload.message,
          relatedEntityType: payload.relatedEntityType || null,
          relatedEntityId: payload.relatedEntityId || null,
          isRead: false,
        },
      });
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
