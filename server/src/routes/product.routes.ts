import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generateNextId } from '../utils/idGenerator';
import { createAuditLog } from '../middleware/audit';
import { createNotification } from '../utils/notification';

const router = Router();

// GET /api/products (All authenticated roles)
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, productType, status, unit, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { productId: { contains: q } },
        { name: { contains: q } },
        { description: { contains: q } },
      ];
    }

    if (productType && typeof productType === 'string' && productType !== 'ALL') {
      where.productType = productType;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    if (unit && typeof unit === 'string' && unit !== 'ALL') {
      where.unit = unit;
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    res.json({
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products.' });
  }
});

// GET /api/products/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      res.status(404).json({ message: 'Product not found.' });
      return;
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch product details.' });
  }
});

// POST /api/products (Salesperson, Manager & HOD)
router.post(
  '/',
  authenticateToken,
  requireRole('SALESPERSON', 'SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        name,
        image,
        description,
        productType = 'Single',
        unit = 'PCS',
        pairQuantity = 2,
        boxQuantity = 10,
        bundleQuantity = 50,
        sellingPrice,
        status = 'Active',
        notes,
      } = req.body;

      if (!name || sellingPrice === undefined || sellingPrice === null) {
        res.status(400).json({ message: 'Product name and selling price are required.' });
        return;
      }

      const nextId = await generateNextId('PROD');

      const product = await prisma.product.create({
        data: {
          productId: nextId,
          name: name.trim(),
          image: image || null,
          description: description || null,
          productType,
          unit,
          pairQuantity: Number(pairQuantity) || 2,
          boxQuantity: Number(boxQuantity) || 10,
          bundleQuantity: Number(bundleQuantity) || 50,
          sellingPrice: parseFloat(sellingPrice),
          status,
          notes: notes || null,
        },
      });

      if (req.user) {
        await createAuditLog({
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'Created Product',
          module: 'Product',
          recordId: product.productId,
          details: `Created product ${product.productId} - ${product.name}`,
        });

        await createNotification({
          targetRole: 'SALES_MANAGER',
          type: 'PRODUCT',
          title: `New Product: ${product.productId}`,
          message: `${req.user.name} (${req.user.role}) added product ${product.productId} - ${product.name} (₹${product.sellingPrice})`,
          relatedEntityType: 'Product',
          relatedEntityId: product.productId,
        });

        await createNotification({
          targetRole: 'HOD',
          type: 'PRODUCT',
          title: `New Product: ${product.productId}`,
          message: `${req.user.name} added product ${product.productId} - ${product.name}`,
          relatedEntityType: 'Product',
          relatedEntityId: product.productId,
        });
      }

      res.status(201).json({ product, message: `Product ${product.productId} created successfully.` });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ message: 'Failed to create product.' });
    }
  }
);

// PUT /api/products/:id (Manager & HOD)
router.put(
  '/:id',
  authenticateToken,
  requireRole('SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        name,
        image,
        description,
        productType,
        unit,
        pairQuantity,
        boxQuantity,
        bundleQuantity,
        sellingPrice,
        status,
        notes,
      } = req.body;

      const existing = await prisma.product.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        res.status(404).json({ message: 'Product not found.' });
        return;
      }

      const updated = await prisma.product.update({
        where: { id: req.params.id },
        data: {
          name: name !== undefined ? name.trim() : existing.name,
          image: image !== undefined ? image : existing.image,
          description: description !== undefined ? description : existing.description,
          productType: productType || existing.productType,
          unit: unit || existing.unit,
          pairQuantity: pairQuantity !== undefined ? Number(pairQuantity) : existing.pairQuantity,
          boxQuantity: boxQuantity !== undefined ? Number(boxQuantity) : existing.boxQuantity,
          bundleQuantity: bundleQuantity !== undefined ? Number(bundleQuantity) : existing.bundleQuantity,
          sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : existing.sellingPrice,
          status: status || existing.status,
          notes: notes !== undefined ? notes : existing.notes,
        },
      });

      if (req.user) {
        await createAuditLog({
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'Updated Product',
          module: 'Product',
          recordId: updated.productId,
          details: `Updated product ${updated.productId} (${updated.name})`,
        });
      }

      res.json({ product: updated, message: `Product ${updated.productId} updated successfully.` });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update product.' });
    }
  }
);

// DELETE /api/products/:id (HOD only)
router.delete(
  '/:id',
  authenticateToken,
  requireRole('HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: req.params.id },
        include: {
          _count: {
            select: { quotationItems: true, salesOrderItems: true },
          },
        },
      });

      if (!product) {
        res.status(404).json({ message: 'Product not found.' });
        return;
      }

      if (product._count.quotationItems > 0 || product._count.salesOrderItems > 0) {
        res.status(400).json({
          message: `Cannot delete product ${product.productId} as it is referenced in existing quotations or sales orders. Set its status to Inactive instead.`,
        });
        return;
      }

      await prisma.product.delete({
        where: { id: req.params.id },
      });

      if (req.user) {
        await createAuditLog({
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'Deleted Product',
          module: 'Product',
          recordId: product.productId,
          details: `Deleted product ${product.productId} (${product.name})`,
        });
      }

      res.json({ message: `Product ${product.productId} deleted successfully.` });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete product.' });
    }
  }
);

export default router;
