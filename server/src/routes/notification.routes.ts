import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const where = {
      OR: [
        { userId: userId },
        { targetRole: userRole },
        { targetRole: 'ALL' },
      ],
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      prisma.notification.count({
        where: {
          ...where,
          isRead: false,
        },
      }),
    ]);

    res.json({
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ notification: updated, message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notification.' });
  }
});

// POST /api/notifications/mark-all-read
router.post('/mark-all-read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await prisma.notification.updateMany({
      where: {
        OR: [
          { userId: userId },
          { targetRole: userRole },
          { targetRole: 'ALL' },
        ],
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Error marking all read:', error);
    res.status(500).json({ message: 'Failed to mark all as read.' });
  }
});

export default router;
