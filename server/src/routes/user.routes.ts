import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();

// All routes require HOD role
router.use(authenticateToken, requireRole('HOD'));

// GET /api/users
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { createdQuotations: true, createdOrders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

// POST /api/users (Create User)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, username, password, phone, role, status = 'Active' } = req.body;

    if (!name || !email || !username || !password || !role) {
      res.status(400).json({ message: 'Name, email, username, password, and role are required.' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.trim().toLowerCase() }, { username: username.trim() }],
      },
    });

    if (existing) {
      res.status(400).json({ message: 'User with this email or username already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim(),
        passwordHash,
        phone: phone ? phone.trim() : null,
        role,
        status,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'Created User',
      module: 'User',
      recordId: user.id,
      details: `Created user ${user.username} with role ${user.role}`,
    });

    res.status(201).json({ user, message: `User ${user.name} created successfully.` });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user.' });
  }
});

// PUT /api/users/:id (Update User)
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, role, status, password } = req.body;

    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    let passwordHash = existing.passwordHash;
    if (password && password.trim()) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        email: email !== undefined ? email.trim().toLowerCase() : existing.email,
        phone: phone !== undefined ? phone.trim() : existing.phone,
        role: role || existing.role,
        status: status || existing.status,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'Updated User',
      module: 'User',
      recordId: updated.id,
      details: `Updated user ${updated.username} (${updated.name})`,
    });

    res.json({ user: updated, message: `User ${updated.name} updated successfully.` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user.' });
  }
});

// DELETE /api/users/:id (Delete User)
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ message: 'You cannot delete your own account.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { createdQuotations: true, createdOrders: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (user._count.createdQuotations > 0 || user._count.createdOrders > 0) {
      res.status(400).json({
        message: `Cannot delete user ${user.username} as they have associated quotations or orders. Set status to Inactive instead.`,
      });
      return;
    }

    await prisma.user.delete({
      where: { id: req.params.id },
    });

    await createAuditLog({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'Deleted User',
      module: 'User',
      recordId: user.id,
      details: `Deleted user ${user.username} (${user.name})`,
    });

    res.json({ message: `User ${user.name} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user.' });
  }
});

export default router;
