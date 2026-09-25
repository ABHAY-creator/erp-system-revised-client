import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/reports (Sales Manager & HOD)
router.get(
  '/',
  authenticateToken,
  requireRole('SALES_MANAGER', 'HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { period = 'this_month', startDate, endDate } = req.query;

      const now = new Date();
      let start: Date;
      let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      let periodLabel = 'This Month';

      if (period === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        periodLabel = 'Today';
      } else if (period === 'daily') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        periodLabel = 'Last 24 Hours';
      } else if (period === 'this_year') {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        periodLabel = `Year ${now.getFullYear()}`;
      } else if (period === 'previous_year') {
        start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        periodLabel = `Year ${now.getFullYear() - 1}`;
      } else if (period === 'custom' && startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        periodLabel = `${startDate} to ${endDate}`;
      } else {
        // Default: this month
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        periodLabel = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
      }

      // Fetch sales orders, quotations, and active customers
      const [salesOrders, quotations, totalCustomers] = await Promise.all([
        prisma.salesOrder.findMany({
          where: {
            orderDate: { gte: start, lte: end },
          },
          include: {
            customer: { select: { customerId: true, name: true } },
            quotation: { select: { quoteId: true } },
            createdBy: { select: { name: true } },
          },
          orderBy: { orderDate: 'desc' },
        }),
        prisma.quotation.findMany({
          where: {
            createdAt: { gte: start, lte: end },
            isDeleted: false,
          },
          include: {
            customer: { select: { customerId: true, name: true } },
            createdBy: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.customer.count({ where: { status: 'Active' } }),
      ]);

      const validOrders = salesOrders.filter((o) => o.orderStatus !== 'Cancelled');
      const totalSales = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalOrdersCount = validOrders.length;
      const confirmedOrdersCount = salesOrders.filter((o) => o.orderStatus === 'Confirmed').length;
      const shipmentsSentCount = salesOrders.filter((o) => ['Shipment Sent', 'Delivered'].includes(o.orderStatus)).length;
      const deliveredOrdersCount = salesOrders.filter((o) => o.orderStatus === 'Delivered').length;

      const totalQuotationsCount = quotations.length;
      const pendingQuotationsCount = quotations.filter((q) => q.status === 'Pending').length;
      const confirmedQuotationsCount = quotations.filter((q) => q.status === 'Confirmed').length;
      const rejectedQuotationsCount = quotations.filter((q) => q.status === 'Rejected').length;

      const quotationConversionRate =
        totalQuotationsCount > 0
          ? Math.round((confirmedQuotationsCount / totalQuotationsCount) * 1000) / 10
          : 0;

      const summary = {
        totalSales,
        totalOrders: totalOrdersCount,
        confirmedOrders: confirmedOrdersCount,
        pendingQuotations: pendingQuotationsCount,
        rejectedQuotations: rejectedQuotationsCount,
        shipmentsSent: shipmentsSentCount,
        deliveredOrders: deliveredOrdersCount,
        totalCustomers,
        totalQuotations: totalQuotationsCount,
        quotationConversionRate,
      };

      const ordersTable = salesOrders.map((o) => ({
        soId: o.soId,
        quotationId: o.quotation.quoteId,
        customerId: o.customer.customerId,
        customerName: o.customer.name,
        date: o.orderDate,
        amount: o.totalAmount,
        salesperson: o.createdBy.name,
        status: o.orderStatus,
        shipmentStatus: o.shipmentStatus,
        deliveryStatus: o.deliveryStatus,
        shipmentId: o.shipmentId || 'N/A',
      }));

      const quotationsTable = quotations.map((q) => ({
        quoteId: q.quoteId,
        customerId: q.customer.customerId,
        customerName: q.customer.name,
        date: q.createdAt,
        total: q.grandTotal,
        salesperson: q.createdBy.name,
        status: q.status,
      }));

      res.json({
        period: periodLabel,
        generatedDate: new Date(),
        summary,
        ordersTable,
        quotationsTable,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ message: 'Failed to generate report.' });
    }
  }
);

export default router;
