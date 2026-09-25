import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();

// In-memory / initial configuration for sales department settings
let departmentSettings = {
  companyName: 'Enterprise Sales Management Ltd',
  departmentUnit: 'Commercial Sales & Business Development',
  currency: 'INR (₹)',
  taxRate: 18,
  quoteValidityDays: 30,
};

// GET /api/settings - Forbidden for SALESPERSON
router.get(
  '/',
  authenticateToken,
  requireRole('SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    res.json({ settings: departmentSettings });
  }
);

// PUT /api/settings - Forbidden for SALESPERSON
router.put(
  '/',
  authenticateToken,
  requireRole('SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    const { companyName, taxRate, quoteValidityDays } = req.body;

    departmentSettings = {
      ...departmentSettings,
      companyName: companyName || departmentSettings.companyName,
      taxRate: taxRate !== undefined ? Number(taxRate) : departmentSettings.taxRate,
      quoteValidityDays:
        quoteValidityDays !== undefined ? Number(quoteValidityDays) : departmentSettings.quoteValidityDays,
    };

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'Updated Settings',
        module: 'Settings',
        details: `Updated sales department configuration (Tax: ${departmentSettings.taxRate}%, Validity: ${departmentSettings.quoteValidityDays} days)`,
      });
    }

    res.json({
      settings: departmentSettings,
      message: 'Department settings updated successfully.',
    });
  }
);

export default router;
