import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/audit (HOD only)
router.get(
  '/',
  authenticateToken,
  requireRole('HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { module, action, page = '1', limit = '50' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (module && typeof module === 'string' && module !== 'ALL') {
        where.module = module;
      }
      if (action && typeof action === 'string' && action !== 'ALL') {
        where.action = { contains: action };
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
      ]);

      res.json({
        data: logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch audit logs.' });
    }
  }
);

export default router;
