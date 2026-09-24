import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generateNextId } from '../utils/idGenerator';
import { createAuditLog } from '../middleware/audit';

const router = Router();

// GET /api/customers (All authenticated users)
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { customerId: { contains: q } },
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { address: { contains: q } },
      ];
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          salesOrders: {
            select: {
              id: true,
              totalAmount: true,
              orderStatus: true,
            },
          },
        },
      }),
    ]);

    const isSalesperson = req.user?.role === 'SALESPERSON';

    const formatted = customers.map((c) => {
      const confirmedOrders = c.salesOrders.filter((o) => o.orderStatus !== 'Cancelled');
      const totalSales = confirmedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        id: c.id,
        customerId: c.customerId,
        name: c.name,
        email: isSalesperson ? (c.email ? '***' + c.email.slice(c.email.indexOf('@')) : null) : c.email,
        phone: isSalesperson ? (c.phone ? '***' + c.phone.slice(-4) : null) : c.phone,
        address: c.address,
        totalOrders: confirmedOrders.length,
        totalSales,
        status: c.status,
        notes: isSalesperson ? undefined : c.notes,
        createdAt: c.createdAt,
      };
    });

    res.json({
      data: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Failed to fetch customers.' });
  }
});

// GET /api/customers/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const isSalesperson = req.user?.role === 'SALESPERSON';

    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        quotations: {
          where: isSalesperson ? { createdById: req.user?.id } : {},
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            quoteId: true,
            quoteDate: true,
            validUntil: true,
            status: true,
            grandTotal: true,
          },
        },
        salesOrders: {
          orderBy: { orderDate: 'desc' },
          take: 10,
          select: {
            id: true,
            soId: true,
            orderDate: true,
            orderStatus: true,
            shipmentStatus: true,
            deliveryStatus: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ message: 'Customer not found.' });
      return;
    }

    const confirmedOrders = customer.salesOrders.filter((o) => o.orderStatus !== 'Cancelled');
    const totalSales = confirmedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const safeCustomer = {
      ...customer,
      email: isSalesperson ? (customer.email ? '***' + customer.email.slice(customer.email.indexOf('@')) : null) : customer.email,
      phone: isSalesperson ? (customer.phone ? '***' + customer.phone.slice(-4) : null) : customer.phone,
      notes: isSalesperson ? undefined : customer.notes,
      totalOrders: confirmedOrders.length,
      totalSales,
    };

    res.json({ customer: safeCustomer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch customer profile.' });
  }
});

// POST /api/customers
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, address, notes, status = 'Active' } = req.body;

    if (!name || !address) {
      res.status(400).json({ message: 'Customer name and address are required.' });
      return;
    }

    const nextId = await generateNextId('CUS');

    const customer = await prisma.customer.create({
      data: {
        customerId: nextId,
        name: name.trim(),
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
        address: address.trim(),
        notes: notes || null,
        status,
      },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'Created Customer',
        module: 'Customer',
        recordId: customer.customerId,
        details: `Created customer ${customer.customerId} - ${customer.name}`,
      });
    }

    res.status(201).json({ customer, message: `Customer ${customer.customerId} created successfully.` });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ message: 'Failed to create customer.' });
  }
});

// PUT /api/customers/:id (Manager & HOD)
router.put(
  '/:id',
  authenticateToken,
  requireRole('SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, phone, address, notes, status } = req.body;

      const existing = await prisma.customer.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        res.status(404).json({ message: 'Customer not found.' });
        return;
      }

      const updated = await prisma.customer.update({
        where: { id: req.params.id },
        data: {
          name: name !== undefined ? name.trim() : existing.name,
          email: email !== undefined ? email : existing.email,
          phone: phone !== undefined ? phone : existing.phone,
          address: address !== undefined ? address.trim() : existing.address,
          notes: notes !== undefined ? notes : existing.notes,
          status: status || existing.status,
        },
      });

      if (req.user) {
        await createAuditLog({
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'Updated Customer',
          module: 'Customer',
          recordId: updated.customerId,
          details: `Updated customer ${updated.customerId} (${updated.name})`,
        });
      }

      res.json({ customer: updated, message: `Customer ${updated.customerId} updated successfully.` });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update customer.' });
    }
  }
);

// DELETE /api/customers/:id (HOD only)
router.delete(
  '/:id',
  authenticateToken,
  requireRole('HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: req.params.id },
        include: {
          _count: {
            select: { quotations: true, salesOrders: true },
          },
        },
      });

      if (!customer) {
        res.status(404).json({ message: 'Customer not found.' });
        return;
      }

      if (customer._count.quotations > 0 || customer._count.salesOrders > 0) {
        res.status(400).json({
          message: `Cannot delete customer ${customer.customerId} because they have existing quotations or sales orders. Set status to Inactive instead.`,
        });
        return;
      }

      await prisma.customer.delete({
        where: { id: req.params.id },
      });

      if (req.user) {
        await createAuditLog({
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'Deleted Customer',
          module: 'Customer',
          recordId: customer.customerId,
          details: `Deleted customer ${customer.customerId} (${customer.name})`,
        });
      }

      res.json({ message: `Customer ${customer.customerId} deleted successfully.` });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete customer.' });
    }
  }
);

export default router;
