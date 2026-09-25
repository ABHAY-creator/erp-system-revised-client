import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generateNextId } from '../utils/idGenerator';
import { createAuditLog } from '../middleware/audit';
import { createNotification } from '../utils/notification';

const router = Router();

// GET /api/quotations
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isDeleted: false };

    // Salesperson can only view their own quotations
    if (req.user?.role === 'SALESPERSON') {
      where.createdById = req.user.id;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { quoteId: { contains: q } },
            { customer: { name: { contains: q } } },
            { customer: { customerId: { contains: q } } },
            { createdBy: { name: { contains: q } } },
          ],
        },
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

// GET /api/quotations/recently-deleted (Sales Manager & HOD only)
router.get(
  '/recently-deleted',
  authenticateToken,
  requireRole('SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        search,
        status,
        deletedBy,
        startDate,
        endDate,
        sort = 'recently_deleted',
        page = '1',
        limit = '50',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const where: any = { isDeleted: true };

      if (status && typeof status === 'string' && status !== 'ALL') {
        where.status = status;
      }

      if (deletedBy && typeof deletedBy === 'string' && deletedBy !== 'ALL') {
        where.deletedBy = { contains: deletedBy };
      }

      if (startDate || endDate) {
        where.deletedAt = {};
        if (startDate) {
          where.deletedAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          where.deletedAt.lte = end;
        }
      }

      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim();
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { quoteId: { contains: q } },
              { customer: { name: { contains: q } } },
              { customer: { customerId: { contains: q } } },
              { createdBy: { name: { contains: q } } },
              { deletedBy: { contains: q } },
            ],
          },
        ];
      }

      let orderBy: any = { deletedAt: 'desc' };
      if (sort === 'oldest_deleted') {
        orderBy = { deletedAt: 'asc' };
      } else if (sort === 'highest_amount') {
        orderBy = { grandTotal: 'desc' };
      } else if (sort === 'lowest_amount') {
        orderBy = { grandTotal: 'asc' };
      }

      const [total, quotations] = await Promise.all([
        prisma.quotation.count({ where }),
        prisma.quotation.findMany({
          where,
          orderBy,
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
            salesOrder: {
              select: {
                id: true,
                soId: true,
                orderStatus: true,
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
        status: q.status, // original status preserved
        subtotal: q.subtotal,
        discountPercent: q.discountPercent,
        discountAmount: q.discountAmount,
        taxPercent: q.taxPercent,
        taxAmount: q.taxAmount,
        grandTotal: q.grandTotal,
        notes: q.notes,
        numberOfProducts: q._count.items,
        salesperson: q.createdBy.name,
        salesOrderId: q.salesOrderId || q.salesOrder?.soId || null,
        deletedBy: q.deletedBy || 'Unknown',
        deletedAt: q.deletedAt,
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
      console.error('Error fetching recently deleted quotations:', error);
      res.status(500).json({ message: 'Failed to fetch recently deleted quotations.' });
    }
  }
);

// GET /api/quotations/history/all (Sales Manager & HOD only)
router.get(
  '/history/all',
  authenticateToken,
  requireRole('SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { search, action, page = '1', limit = '50' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (action && typeof action === 'string' && action !== 'ALL') {
        if (action === 'Status Changes') {
          where.OR = [
            { action: { contains: 'Status' } },
            { NOT: { previousStatus: null } },
          ];
        } else {
          where.action = { contains: action };
        }
      }

      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim();
        where.OR = [
          { quotation: { quoteId: { contains: q } } },
          { quotation: { customer: { name: { contains: q } } } },
          { userName: { contains: q } },
          { description: { contains: q } },
        ];
      }

      const [total, history] = await Promise.all([
        prisma.quotationHistory.count({ where }),
        prisma.quotationHistory.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          include: {
            quotation: {
              select: {
                id: true,
                quoteId: true,
                status: true,
                grandTotal: true,
                customer: { select: { name: true, customerId: true } },
              },
            },
          },
        }),
      ]);

      res.json({
        data: history,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Error fetching all quotation history:', error);
      res.status(500).json({ message: 'Failed to fetch quotation history.' });
    }
  }
);

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
        history: {
          orderBy: { createdAt: 'desc' },
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

    // Restrict administrative history: only expose to SALES_MANAGER and HOD
    const isManagerOrHOD = req.user?.role === 'SALES_MANAGER' || req.user?.role === 'HOD';
    const sanitizedQuotation = {
      ...quotation,
      history: isManagerOrHOD ? quotation.history : [],
    };

    res.json({ quotation: sanitizedQuotation });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quotation details.' });
  }
});

// GET /api/quotations/:id/history (Strictly SALES_MANAGER and HOD)
router.get(
  '/:id/history',
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

      const history = await prisma.quotationHistory.findMany({
        where: { quotationId: req.params.id },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ data: history });
    } catch (error) {
      console.error('Error fetching quotation history:', error);
      res.status(500).json({ message: 'Failed to fetch quotation history.' });
    }
  }
);

// POST /api/quotations/:id/send (Mark Quotation as Sent)
// Roles: SALESPERSON (own), SALES_MANAGER, HOD
router.post(
  '/:id/send',
  authenticateToken,
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

      if (quotation.isDeleted) {
        res.status(400).json({ message: 'Cannot send a deleted quotation. Please restore it first.' });
        return;
      }

      if (req.user?.role === 'SALESPERSON' && quotation.createdById !== req.user.id) {
        res.status(403).json({ message: 'Access denied: You can only send your own quotations.' });
        return;
      }

      const updated = await prisma.quotation.update({
        where: { id: req.params.id },
        data: {
          sentAt: new Date(),
          sentByName: req.user!.name,
        },
        include: { customer: true, items: true },
      });

      await prisma.quotationHistory.create({
        data: {
          quotationId: quotation.id,
          action: 'Sent',
          description: `Quotation sent to client ${quotation.customer.name} by ${req.user!.name} (${req.user!.role}).`,
          userId: req.user!.id,
          userName: req.user!.name,
          userRole: req.user!.role,
          previousStatus: quotation.status,
          newStatus: quotation.status,
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'Sent Quotation',
        module: 'Quotation',
        recordId: quotation.quoteId,
        details: `Quotation ${quotation.quoteId} sent to client ${quotation.customer.name}`,
      });

      await createNotification({
        targetRole: 'SALES_MANAGER',
        type: 'QUOTATION',
        title: `Quotation Sent: ${quotation.quoteId}`,
        message: `${req.user!.name} marked quotation ${quotation.quoteId} as sent to ${quotation.customer.name}.`,
        relatedEntityType: 'Quotation',
        relatedEntityId: quotation.quoteId,
      });

      res.json({
        quotation: updated,
        message: `Quotation ${quotation.quoteId} marked as sent successfully.`,
      });
    } catch (error) {
      console.error('Error sending quotation:', error);
      res.status(500).json({ message: 'Failed to send quotation.' });
    }
  }
);

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

    await prisma.quotationHistory.create({
      data: {
        quotationId: quotation.id,
        action: 'Created',
        description: `Quotation created with ${processedItems.length} product line(s). Initial value: ₹${grandTotal.toLocaleString('en-IN')}`,
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        previousStatus: null,
        newStatus: 'Pending',
      },
    });

    await createNotification({
      targetRole: 'SALES_MANAGER',
      type: 'QUOTATION',
      title: `New Quotation: ${quotation.quoteId}`,
      message: `${req.user!.name} created quotation ${quotation.quoteId} for ${customer.name} (₹${grandTotal.toLocaleString('en-IN')})`,
      relatedEntityType: 'Quotation',
      relatedEntityId: quotation.quoteId,
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

    if (existing.isDeleted) {
      res.status(400).json({ message: 'Cannot edit a deleted quotation. Please restore it first.' });
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

    await prisma.quotationHistory.create({
      data: {
        quotationId: updated.id,
        action: 'Modified',
        description: `Quotation details and items modified. Items count: ${processedItems.length || existing.items.length}. Updated grand total: ₹${grandTotal.toLocaleString('en-IN')}`,
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        previousStatus: existing.status,
        newStatus: updated.status,
      },
    });

    await createNotification({
      targetRole: 'SALES_MANAGER',
      type: 'QUOTATION',
      title: `Quotation Modified: ${updated.quoteId}`,
      message: `${req.user!.name} updated quotation ${updated.quoteId} (₹${grandTotal.toLocaleString('en-IN')})`,
      relatedEntityType: 'Quotation',
      relatedEntityId: updated.quoteId,
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

      if (quotation.isDeleted) {
        res.status(400).json({ message: 'Cannot confirm a deleted quotation. Please restore it first.' });
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

      await prisma.quotationHistory.create({
        data: {
          quotationId: quotation.id,
          action: 'Confirmed',
          description: `Confirmed by ${req.user!.name} (${req.user!.role}).`,
          userId: req.user!.id,
          userName: req.user!.name,
          userRole: req.user!.role,
          previousStatus: quotation.status,
          newStatus: 'Confirmed',
        },
      });

      await prisma.quotationHistory.create({
        data: {
          quotationId: quotation.id,
          action: 'Sales Order Created',
          description: `Sales Order ${result.salesOrder.soId} automatically generated from quotation.`,
          userId: req.user!.id,
          userName: req.user!.name,
          userRole: req.user!.role,
          previousStatus: 'Confirmed',
          newStatus: 'Confirmed',
        },
      });

      // Notify Salesperson and HOD
      await createNotification({
        userId: quotation.createdById,
        type: 'QUOTATION',
        title: `Quotation ${quotation.quoteId} Confirmed!`,
        message: `Your quotation ${quotation.quoteId} for ${quotation.customer.name} was confirmed by ${req.user!.name}. Sales Order ${result.salesOrder.soId} generated!`,
        relatedEntityType: 'Quotation',
        relatedEntityId: quotation.quoteId,
      });

      await createNotification({
        targetRole: 'HOD',
        type: 'QUOTATION',
        title: `Quotation ${quotation.quoteId} Confirmed`,
        message: `Quotation ${quotation.quoteId} confirmed by ${req.user!.name}. Sales Order ${result.salesOrder.soId} generated!`,
        relatedEntityType: 'Quotation',
        relatedEntityId: quotation.quoteId,
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
      const { reason } = req.body;
      const quotation = await prisma.quotation.findUnique({
        where: { id: req.params.id },
        include: { customer: true },
      });

      if (!quotation) {
        res.status(404).json({ message: 'Quotation not found.' });
        return;
      }

      if (quotation.isDeleted) {
        res.status(400).json({ message: 'Cannot reject a deleted quotation. Please restore it first.' });
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
        details: `Rejected quotation ${quotation.quoteId} for customer ${quotation.customer.name}${reason ? ` (Reason: ${reason})` : ''}`,
      });

      await prisma.quotationHistory.create({
        data: {
          quotationId: quotation.id,
          action: 'Rejected',
          description: reason ? `Rejected with reason: ${reason}` : 'Quotation rejected by sales management.',
          userId: req.user!.id,
          userName: req.user!.name,
          userRole: req.user!.role,
          previousStatus: quotation.status,
          newStatus: 'Rejected',
          reason: reason || null,
        },
      });

      // Notify Salesperson
      await createNotification({
        userId: quotation.createdById,
        type: 'QUOTATION',
        title: `Quotation ${quotation.quoteId} Rejected`,
        message: `Quotation ${quotation.quoteId} for ${quotation.customer.name} was rejected by ${req.user!.name}.${reason ? ` Reason: ${reason}` : ''}`,
        relatedEntityType: 'Quotation',
        relatedEntityId: quotation.quoteId,
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

// DELETE /api/quotations/:id (Manager & HOD - Soft Delete)
router.delete(
  '/:id',
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

      if (quotation.isDeleted) {
        res.status(400).json({
          message: `Quotation ${quotation.quoteId} is already in Recently Deleted.`,
        });
        return;
      }

      const updated = await prisma.quotation.update({
        where: { id: req.params.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user!.name,
          deletedByUserId: req.user!.id,
        },
      });

      await prisma.quotationHistory.create({
        data: {
          quotationId: quotation.id,
          action: 'Quotation Deleted',
          description: `Quotation moved to Recently Deleted by ${req.user!.name} (${req.user!.role}). Original status: ${quotation.status}.`,
          userId: req.user!.id,
          userName: req.user!.name,
          userRole: req.user!.role,
          previousStatus: quotation.status,
          newStatus: quotation.status,
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'Quotation Soft Deleted',
        module: 'Quotation',
        recordId: quotation.quoteId,
        details: `Quotation ${quotation.quoteId} moved to Recently Deleted by ${req.user!.name}`,
      });

      res.json({
        quotation: updated,
        message: `Quotation ${quotation.quoteId} moved to Recently Deleted.`,
      });
    } catch (error) {
      console.error('Error soft-deleting quotation:', error);
      res.status(500).json({ message: 'Failed to delete quotation.' });
    }
  }
);

// POST /api/quotations/:id/restore (Manager & HOD)
router.post(
  '/:id/restore',
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

      if (!quotation.isDeleted) {
        res.status(400).json({ message: `Quotation ${quotation.quoteId} is not in Recently Deleted.` });
        return;
      }

      const restored = await prisma.quotation.update({
        where: { id: req.params.id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletedByUserId: null,
        },
        include: { customer: true, createdBy: true },
      });

      await prisma.quotationHistory.create({
        data: {
          quotationId: quotation.id,
          action: 'Quotation Restored',
          description: `Quotation restored from Recently Deleted by ${req.user!.name} (${req.user!.role}). Original status preserved: ${quotation.status}.`,
          userId: req.user!.id,
          userName: req.user!.name,
          userRole: req.user!.role,
          previousStatus: quotation.status,
          newStatus: quotation.status,
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'Quotation Restored',
        module: 'Quotation',
        recordId: quotation.quoteId,
        details: `Restored quotation ${quotation.quoteId} for ${quotation.customer.name} to active list (Status: ${quotation.status})`,
      });

      res.json({
        quotation: restored,
        message: `Quotation ${quotation.quoteId} restored successfully.`,
      });
    } catch (error) {
      console.error('Error restoring quotation:', error);
      res.status(500).json({ message: 'Failed to restore quotation.' });
    }
  }
);

// DELETE /api/quotations/:id/permanent (HOD ONLY)
router.delete(
  '/:id/permanent',
  authenticateToken,
  requireRole('HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const quotation = await prisma.quotation.findUnique({
        where: { id: req.params.id },
        include: { salesOrder: true },
      });

      if (!quotation) {
        res.status(404).json({ message: 'Quotation not found.' });
        return;
      }

      // Check linked sales order rule
      const linkedSoId = quotation.salesOrder?.soId || quotation.salesOrderId;
      if (linkedSoId) {
        res.status(400).json({
          message: `This quotation is linked to Sales Order ${linkedSoId}. Permanent deletion is not allowed while this relationship exists.`,
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
        action: 'Quotation Permanently Deleted',
        module: 'Quotation',
        recordId: quotation.quoteId,
        details: `Permanently deleted quotation ${quotation.quoteId} by HOD ${req.user!.name}`,
      });

      res.json({
        message: `Quotation ${quotation.quoteId} permanently deleted.`,
      });
    } catch (error) {
      console.error('Error permanently deleting quotation:', error);
      res.status(500).json({ message: 'Failed to permanently delete quotation.' });
    }
  }
);

export default router;
