import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generateNextId } from '../utils/idGenerator';
import { createAuditLog } from '../middleware/audit';

const router = Router();

// GET /api/sales (List Confirmed Sales Orders)
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.orderStatus = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { soId: { contains: q } },
        { shipmentId: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { customerId: { contains: q } } },
        { quotation: { quoteId: { contains: q } } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.salesOrder.count({ where }),
      prisma.salesOrder.findMany({
        where,
        orderBy: { orderDate: 'desc' },
        skip,
        take: limitNum,
        include: {
          customer: {
            select: {
              id: true,
              customerId: true,
              name: true,
              phone: true,
              email: true,
              address: true,
            },
          },
          quotation: {
            select: {
              id: true,
              quoteId: true,
              quoteDate: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
    ]);

    const formatted = orders.map((o) => ({
      id: o.id,
      soId: o.soId,
      quotationId: o.quotation.quoteId,
      customerId: o.customer.customerId,
      customerName: o.customer.name,
      customerAddress: o.customer.address,
      orderDate: o.orderDate,
      amount: o.totalAmount,
      subtotal: o.subtotal,
      taxAmount: o.taxAmount,
      salesperson: o.createdBy.name,
      orderStatus: o.orderStatus,
      shipmentStatus: o.shipmentStatus,
      deliveryStatus: o.deliveryStatus,
      shipmentId: o.shipmentId,
      itemsCount: o._count.items,
      createdAt: o.createdAt,
    }));

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
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ message: 'Failed to fetch sales orders.' });
  }
});

// GET /api/sales/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        quotation: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                productId: true,
                name: true,
                image: true,
                unit: true,
                productType: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ message: 'Sales Order not found.' });
      return;
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch sales order details.' });
  }
});

// PATCH /api/sales/:id/status (Update Order / Shipment / Delivery Status)
// Roles: SALES_MANAGER, HOD
router.patch(
  '/:id/status',
  authenticateToken,
  requireRole('SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderStatus, notes } = req.body;

      const validStatuses = ['Confirmed', 'Processing', 'Shipment Sent', 'Delivered', 'Cancelled'];
      if (!orderStatus || !validStatuses.includes(orderStatus)) {
        res.status(400).json({
          message: `Invalid order status. Allowed: ${validStatuses.join(', ')}`,
        });
        return;
      }

      const existing = await prisma.salesOrder.findUnique({
        where: { id: req.params.id },
        include: { customer: true },
      });

      if (!existing) {
        res.status(404).json({ message: 'Sales order not found.' });
        return;
      }

      let shipmentStatus = existing.shipmentStatus;
      let deliveryStatus = existing.deliveryStatus;
      let shipmentId = existing.shipmentId;

      if (orderStatus === 'Processing') {
        shipmentStatus = 'Pending';
        deliveryStatus = 'Pending';
      } else if (orderStatus === 'Shipment Sent') {
        shipmentStatus = 'In Transit';
        deliveryStatus = 'Out for Delivery';
        if (!shipmentId) {
          shipmentId = await generateNextId('SHP');
        }
      } else if (orderStatus === 'Delivered') {
        shipmentStatus = 'Delivered';
        deliveryStatus = 'Delivered';
        if (!shipmentId) {
          shipmentId = await generateNextId('SHP');
        }
      } else if (orderStatus === 'Cancelled') {
        shipmentStatus = 'Cancelled';
        deliveryStatus = 'Cancelled';
      }

      const updated = await prisma.salesOrder.update({
        where: { id: req.params.id },
        data: {
          orderStatus,
          shipmentStatus,
          deliveryStatus,
          shipmentId,
          notes: notes !== undefined ? notes : existing.notes,
        },
        include: { customer: true, items: true },
      });

      await createAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'Updated Order Status',
        module: 'Sales',
        recordId: updated.soId,
        details: `Updated sales order ${updated.soId} status to '${orderStatus}'${shipmentId ? ` (Shipment ID: ${shipmentId})` : ''}`,
      });

      res.json({
        order: updated,
        message: `Order ${updated.soId} status updated to ${orderStatus}.`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Failed to update order status.' });
    }
  }
);

export default router;
