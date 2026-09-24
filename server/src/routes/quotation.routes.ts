import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generateNextId } from '../utils/idGenerator';
import { createAuditLog } from '../middleware/audit';

const router = Router();

// GET /api/quotations
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Salesperson can only view their own quotations
    if (req.user?.role === 'SALESPERSON') {
      where.createdById = req.user.id;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { quoteId: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { customerId: { contains: q } } },
      ];
    }

    const [total, quotations] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          customer: {
            select: {
              id: true,
              customerId: true,
              name: true,
              email: true,
              phone: true,
              address: true,
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

    const formatted = quotations.map((q) => ({
      id: q.id,
      quoteId: q.quoteId,
      customerId: q.customerId,
      customer: q.customer,
      quoteDate: q.quoteDate,
      validUntil: q.validUntil,
      status: q.status,
      subtotal: q.subtotal,
      discountPercent: q.discountPercent,
      discountAmount: q.discountAmount,
      taxPercent: q.taxPercent,
      taxAmount: q.taxAmount,
      grandTotal: q.grandTotal,
      notes: q.notes,
      numberOfProducts: q._count.items,
      salesperson: q.createdBy.name,
      salesOrderId: q.salesOrderId,
      createdAt: q.createdAt,
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
    console.error('Error fetching quotations:', error);
    res.status(500).json({ message: 'Failed to fetch quotations.' });
  }
});

// GET /api/quotations/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
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
                sellingPrice: true,
                productType: true,
              },
            },
          },
        },
        salesOrder: {
          select: {
            id: true,
            soId: true,
            orderStatus: true,
            orderDate: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!quotation) {
      res.status(404).json({ message: 'Quotation not found.' });
      return;
    }

    // Role check: salesperson can only view their own
    if (req.user?.role === 'SALESPERSON' && quotation.createdById !== req.user.id) {
      res.status(403).json({ message: 'Access denied to this quotation.' });
      return;
    }

    res.json({ quotation });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quotation details.' });
  }
});

// POST /api/quotations (Create Quotation)
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerId,
      validUntil,
      notes,
      items,
      discountPercent = 0,
      taxPercent = 18,
    } = req.body;

    if (!customerId || !validUntil || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Customer, validity date, and at least one product item are required.' });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ message: 'Customer not found.' });
      return;
    }

    // Calculate line item totals
    let calculatedSubtotal = 0;
    const processedItems = items.map((item: any) => {
      const quantity = Math.max(1, parseFloat(item.quantity) || 1);
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const totalPrice = Math.round(quantity * unitPrice * 100) / 100;
      calculatedSubtotal += totalPrice;

      return {
        productId: item.productId,
        description: item.description || null,
        unit: item.unit || 'PCS',
        quantity,
        unitPrice,
        totalPrice,
      };
    });

    const discPercent = Math.max(0, Math.min(100, parseFloat(discountPercent) || 0));
    const discountAmount = Math.round(((calculatedSubtotal * discPercent) / 100) * 100) / 100;
    const taxableSubtotal = calculatedSubtotal - discountAmount;

    const tPercent = Math.max(0, parseFloat(taxPercent) || 0);
    const taxAmount = Math.round(((taxableSubtotal * tPercent) / 100) * 100) / 100;
    const grandTotal = Math.round((taxableSubtotal + taxAmount) * 100) / 100;

    const quoteId = await generateNextId('QUO');

    const quotation = await prisma.quotation.create({
      data: {
        quoteId,
        customerId: customer.id,
        quoteDate: new Date(),
        validUntil: new Date(validUntil),
        status: 'Pending',
        subtotal: calculatedSubtotal,
        discountPercent: discPercent,
        discountAmount,
        taxPercent: tPercent,
        taxAmount,
        grandTotal,
        notes: notes || null,
        createdById: req.user!.id,
        items: {
          create: processedItems,
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'Created Quotation',
      module: 'Quotation',
      recordId: quotation.quoteId,
      details: `Created quotation ${quotation.quoteId} for ${customer.name} (Total: ₹${grandTotal})`,
    });

    res.status(201).json({
      quotation,
      message: `Quotation ${quotation.quoteId} created successfully.`,
    });
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ message: 'Failed to create quotation.' });
  }
});

// PUT /api/quotations/:id (Edit Quotation)
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!existing) {
      res.status(404).json({ message: 'Quotation not found.' });
      return;
    }

    if (existing.status !== 'Pending') {
      res.status(400).json({
        message: `Cannot edit a quotation with status '${existing.status}'. Only Pending quotations can be modified.`,
      });
      return;
    }

    // Salesperson can only edit their own
    if (req.user?.role === 'SALESPERSON' && existing.createdById !== req.user.id) {
      res.status(403).json({ message: 'Forbidden: You can only edit your own quotations.' });
      return;
    }

    const {
      customerId,
      validUntil,
      notes,
      items,
      discountPercent = existing.discountPercent,
      taxPercent = existing.taxPercent,
    } = req.body;

    let calculatedSubtotal = 0;
    let processedItems: any[] = [];

    if (items && Array.isArray(items) && items.length > 0) {
      processedItems = items.map((item: any) => {
        const quantity = Math.max(1, parseFloat(item.quantity) || 1);
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const totalPrice = Math.round(quantity * unitPrice * 100) / 100;
        calculatedSubtotal += totalPrice;

        return {
          productId: item.productId,
          description: item.description || null,
          unit: item.unit || 'PCS',
          quantity,
          unitPrice,
          totalPrice,
        };
      });
    } else {
      calculatedSubtotal = existing.subtotal;
    }

    const discPercent = Math.max(0, Math.min(100, parseFloat(discountPercent) || 0));
    const discountAmount = Math.round(((calculatedSubtotal * discPercent) / 100) * 100) / 100;
    const taxableSubtotal = calculatedSubtotal - discountAmount;

    const tPercent = Math.max(0, parseFloat(taxPercent) || 0);
    const taxAmount = Math.round(((taxableSubtotal * tPercent) / 100) * 100) / 100;
    const grandTotal = Math.round((taxableSubtotal + taxAmount) * 100) / 100;

    // Use transaction to update
    const updated = await prisma.$transaction(async (tx) => {
      if (processedItems.length > 0) {
        await tx.quotationItem.deleteMany({ where: { quotationId: req.params.id } });
      }

      return await tx.quotation.update({
        where: { id: req.params.id },
        data: {
          customerId: customerId || existing.customerId,
          validUntil: validUntil ? new Date(validUntil) : existing.validUntil,
          notes: notes !== undefined ? notes : existing.notes,
          subtotal: calculatedSubtotal,
          discountPercent: discPercent,
          discountAmount,
          taxPercent: tPercent,
          taxAmount,
          grandTotal,
          ...(processedItems.length > 0
            ? {
                items: {
                  create: processedItems,
                },
              }
            : {}),
        },
        include: { customer: true, items: true },
      });
    });

    await createAuditLog({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'Updated Quotation',
      module: 'Quotation',
      recordId: updated.quoteId,
      details: `Updated quotation ${updated.quoteId} (Total: ₹${grandTotal})`,
    });

    res.json({ quotation: updated, message: `Quotation ${updated.quoteId} updated successfully.` });
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(500).json({ message: 'Failed to update quotation.' });
  }
});

// POST /api/quotations/:id/confirm (CONFIRM QUOTATION -> CREATES SALES ORDER)
// Roles: SALES_MANAGER, HOD
router.post(
  '/:id/confirm',
  authenticateToken,
  requireRole('SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const quotation = await prisma.quotation.findUnique({
        where: { id: req.params.id },
        include: {
          customer: true,
          items: true,
        },
      });

      if (!quotation) {
        res.status(404).json({ message: 'Quotation not found.' });
        return;
      }

      if (quotation.status !== 'Pending') {
        res.status(400).json({
          message: `Cannot confirm quotation with status '${quotation.status}'. Only Pending quotations can be confirmed.`,
        });
        return;
      }

      const nextSoId = await generateNextId('SO');

      // Atomic transaction: confirm quotation + create sales order
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Sales Order
        const salesOrder = await tx.salesOrder.create({
          data: {
            soId: nextSoId,
            quotationId: quotation.id,
            customerId: quotation.customerId,
            orderDate: new Date(),
            orderStatus: 'Confirmed',
            shipmentStatus: 'Pending',
            deliveryStatus: 'Pending',
            subtotal: quotation.subtotal,
            discountAmount: quotation.discountAmount,
            taxAmount: quotation.taxAmount,
            totalAmount: quotation.grandTotal,
            notes: quotation.notes,
            createdById: req.user!.id,
            items: {
              create: quotation.items.map((it) => ({
                productId: it.productId,
                description: it.description,
                unit: it.unit,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                totalPrice: it.totalPrice,
              })),
            },
          },
          include: { customer: true, items: true },
        });

        // 2. Update Quotation status to Confirmed and link Sales Order
        const updatedQuotation = await tx.quotation.update({
          where: { id: quotation.id },
          data: {
            status: 'Confirmed',
            salesOrderId: salesOrder.soId,
          },
        });

        return { salesOrder, updatedQuotation };
      });

      await createAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'Confirmed Quotation',
        module: 'Quotation',
        recordId: quotation.quoteId,
        details: `Confirmed quotation ${quotation.quoteId} and automatically generated Sales Order ${result.salesOrder.soId} for customer ${quotation.customer.name}`,
      });

      res.json({
        quotation: result.updatedQuotation,
        salesOrder: result.salesOrder,
        message: `Quotation ${quotation.quoteId} confirmed successfully. Sales Order ${result.salesOrder.soId} generated!`,
      });
    } catch (error) {
      console.error('Error confirming quotation:', error);
      res.status(500).json({ message: 'Failed to confirm quotation.' });
    }
  }
);

// POST /api/quotations/:id/reject (REJECT QUOTATION)
// Roles: SALES_MANAGER, HOD
router.post(
  '/:id/reject',
  authenticateToken,
  requireRole('SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const quotation = await prisma.quotation.findUnique({
        where: { id: req.params.id },
        include: { customer: true },
      });

      if (!quotation) {
        res.status(404).json({ message: 'Quotation not found.' });
        return;
      }

      if (quotation.status !== 'Pending') {
        res.status(400).json({
          message: `Cannot reject quotation with status '${quotation.status}'. Only Pending quotations can be rejected.`,
        });
        return;
      }

      const updated = await prisma.quotation.update({
        where: { id: quotation.id },
        data: { status: 'Rejected' },
      });

      await createAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'Rejected Quotation',
        module: 'Quotation',
        recordId: quotation.quoteId,
        details: `Rejected quotation ${quotation.quoteId} for customer ${quotation.customer.name}`,
      });

      res.json({
        quotation: updated,
        message: `Quotation ${quotation.quoteId} rejected. It will not become a sales order.`,
      });
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      res.status(500).json({ message: 'Failed to reject quotation.' });
    }
  }
);

// DELETE /api/quotations/:id (Manager & HOD)
router.delete(
  '/:id',
  authenticateToken,
  requireRole('SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const quotation = await prisma.quotation.findUnique({
        where: { id: req.params.id },
      });

      if (!quotation) {
        res.status(404).json({ message: 'Quotation not found.' });
        return;
      }

      if (quotation.status === 'Confirmed') {
        res.status(400).json({
          message: `Cannot delete confirmed quotation ${quotation.quoteId}. Confirmed quotations are preserved for audit and historical records.`,
        });
        return;
      }

      await prisma.quotation.delete({
        where: { id: req.params.id },
      });

      await createAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'Deleted Quotation',
        module: 'Quotation',
        recordId: quotation.quoteId,
        details: `Deleted quotation ${quotation.quoteId}`,
      });

      res.json({ message: `Quotation ${quotation.quoteId} deleted successfully.` });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete quotation.' });
    }
  }
);

export default router;
