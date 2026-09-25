import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generateNextId } from '../utils/idGenerator';
import { createAuditLog } from '../middleware/audit';
import { createNotification } from '../utils/notification';

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
      rejectionReason: o.rejectionReason,
      rejectedByName: o.rejectedByName,
      rejectedAt: o.rejectedAt,
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
// Roles: SALESPERSON, SALES_MANAGER, HOD
router.patch(
  '/:id/status',
  authenticateToken,
  requireRole('SALESPERSON', 'SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderStatus, notes, rejectionReason } = req.body;
      const user = req.user!;

      // Salesperson can update to Confirmed or Rejected / Cancelled
      const salespersonAllowed = ['Confirmed', 'Rejected', 'Cancelled'];
      const managementAllowed = ['Confirmed', 'Processing', 'Shipment Sent', 'Delivered', 'Cancelled', 'Rejected'];

      const allowedStatuses = user.role === 'SALESPERSON' ? salespersonAllowed : managementAllowed;

      if (!orderStatus || !allowedStatuses.includes(orderStatus)) {
        res.status(400).json({
          message: `Invalid order status. Allowed for ${user.role}: ${allowedStatuses.join(', ')}`,
        });
        return;
      }

      const existing = await prisma.salesOrder.findUnique({
        where: { id: req.params.id },
        include: { customer: true, quotation: true },
      });

      if (!existing) {
        res.status(404).json({ message: 'Sales order not found.' });
        return;
      }

      let shipmentStatus = existing.shipmentStatus;
      let deliveryStatus = existing.deliveryStatus;
      let shipmentId = existing.shipmentId;
      let updateRejectionReason = existing.rejectionReason;
      let updateRejectedByUserId = existing.rejectedByUserId;
      let updateRejectedByName = existing.rejectedByName;
      let updateRejectedAt = existing.rejectedAt;

      const isRejection = orderStatus === 'Rejected' || orderStatus === 'Cancelled';

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
      } else if (isRejection) {
        shipmentStatus = 'Cancelled';
        deliveryStatus = 'Cancelled';
        updateRejectionReason = rejectionReason || notes || 'Order rejected by salesperson';
        updateRejectedByUserId = user.id;
        updateRejectedByName = user.name;
        updateRejectedAt = new Date();
      }

      const updated = await prisma.salesOrder.update({
        where: { id: req.params.id },
        data: {
          orderStatus,
          shipmentStatus,
          deliveryStatus,
          shipmentId,
          rejectionReason: updateRejectionReason,
          rejectedByUserId: updateRejectedByUserId,
          rejectedByName: updateRejectedByName,
          rejectedAt: updateRejectedAt,
          notes: notes !== undefined ? notes : existing.notes,
        },
        include: { customer: true, items: true },
      });

      // Update Quotation History if linked
      if (existing.quotationId) {
        await prisma.quotationHistory.create({
          data: {
            quotationId: existing.quotationId,
            action: isRejection ? 'Rejected' : orderStatus,
            description: isRejection
              ? `Order ${updated.soId} was rejected by ${user.name} (${user.role}). Reason: ${updateRejectionReason}`
              : `Sales order ${updated.soId} status updated to '${orderStatus}'`,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            previousStatus: existing.orderStatus,
            newStatus: orderStatus,
            reason: isRejection ? updateRejectionReason : null,
          },
        });
      }

      // Create Audit Log
      await createAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: isRejection ? 'Rejected Order' : 'Updated Order Status',
        module: 'Sales',
        recordId: updated.soId,
        details: isRejection
          ? `Rejected order ${updated.soId}. Reason: ${updateRejectionReason}`
          : `Updated sales order ${updated.soId} status to '${orderStatus}'${shipmentId ? ` (Shipment ID: ${shipmentId})` : ''}`,
      });

      // Generate Role-Based Notifications
      if (isRejection) {
        await createNotification({
          targetRole: 'SALES_MANAGER',
          type: 'SALES',
          title: `Order ${updated.soId} Rejected`,
          message: `Sales Order ${updated.soId} for ${existing.customer.name} was rejected by ${user.name}.${updateRejectionReason ? ` Reason: ${updateRejectionReason}` : ''}`,
          relatedEntityType: 'SalesOrder',
          relatedEntityId: updated.soId,
        });
        await createNotification({
          targetRole: 'HOD',
          type: 'SALES',
          title: `Order ${updated.soId} Rejected`,
          message: `Sales Order ${updated.soId} for ${existing.customer.name} was rejected by ${user.name}.${updateRejectionReason ? ` Reason: ${updateRejectionReason}` : ''}`,
          relatedEntityType: 'SalesOrder',
          relatedEntityId: updated.soId,
        });
        if (existing.createdById !== user.id) {
          await createNotification({
            userId: existing.createdById,
            type: 'SALES',
            title: `Order ${updated.soId} Rejected`,
            message: `Your Sales Order ${updated.soId} was rejected by ${user.name}.${updateRejectionReason ? ` Reason: ${updateRejectionReason}` : ''}`,
            relatedEntityType: 'SalesOrder',
            relatedEntityId: updated.soId,
          });
        }
      } else if (orderStatus === 'Shipment Sent') {
        await createNotification({
          userId: existing.createdById,
          targetRole: 'SALES_MANAGER',
          type: 'SALES',
          title: `Shipment Sent: ${updated.soId}`,
          message: `Shipment ${shipmentId} dispatched for Order ${updated.soId} (${existing.customer.name}).`,
          relatedEntityType: 'SalesOrder',
          relatedEntityId: updated.soId,
        });
      } else if (orderStatus === 'Delivered') {
        await createNotification({
          userId: existing.createdById,
          targetRole: 'HOD',
          type: 'SALES',
          title: `Order Delivered: ${updated.soId}`,
          message: `Order ${updated.soId} has been successfully delivered to ${existing.customer.name}.`,
          relatedEntityType: 'SalesOrder',
          relatedEntityId: updated.soId,
        });
      } else if (orderStatus === 'Confirmed') {
        await createNotification({
          targetRole: 'SALES_MANAGER',
          type: 'SALES',
          title: `Order Confirmed: ${updated.soId}`,
          message: `Order ${updated.soId} confirmed for ${existing.customer.name} (₹${updated.totalAmount.toLocaleString('en-IN')}).`,
          relatedEntityType: 'SalesOrder',
          relatedEntityId: updated.soId,
        });
      }

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
