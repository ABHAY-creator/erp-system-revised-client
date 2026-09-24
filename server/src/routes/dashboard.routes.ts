import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

interface DateRange {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  periodLabel: string;
  previousLabel: string;
}

function resolveDateRanges(period?: string, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();

  // Normalize to UTC or system local
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (period) {
    case 'today': {
      const curStart = startOfDay(now);
      const curEnd = endOfDay(now);
      const prevDate = new Date(now);
      prevDate.setDate(now.getDate() - 1);
      const prevStart = startOfDay(prevDate);
      const prevEnd = endOfDay(prevDate);
      return {
        currentStart: curStart,
        currentEnd: curEnd,
        previousStart: prevStart,
        previousEnd: prevEnd,
        periodLabel: 'Today',
        previousLabel: 'Yesterday',
      };
    }
    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = now.getDate() - (day === 0 ? 6 : day - 1);
      const curStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), diffToMonday));
      const curEnd = endOfDay(now);

      const prevStart = new Date(curStart);
      prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = new Date(curEnd);
      prevEnd.setDate(prevEnd.getDate() - 7);

      return {
        currentStart: curStart,
        currentEnd: curEnd,
        previousStart: prevStart,
        previousEnd: prevEnd,
        periodLabel: 'This Week',
        previousLabel: 'Last Week',
      };
    }
    case 'previous_month': {
      const curStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const curEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      const prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      const prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);

      return {
        currentStart: curStart,
        currentEnd: curEnd,
        previousStart: prevStart,
        previousEnd: prevEnd,
        periodLabel: 'Previous Month',
        previousLabel: 'Month Before Last',
      };
    }
    case 'this_year': {
      const curStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const curEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

      const prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      const prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

      return {
        currentStart: curStart,
        currentEnd: curEnd,
        previousStart: prevStart,
        previousEnd: prevEnd,
        periodLabel: `${now.getFullYear()}`,
        previousLabel: `${now.getFullYear() - 1}`,
      };
    }
    case 'previous_year': {
      const curStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      const curEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

      const prevStart = new Date(now.getFullYear() - 2, 0, 1, 0, 0, 0, 0);
      const prevEnd = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59, 999);

      return {
        currentStart: curStart,
        currentEnd: curEnd,
        previousStart: prevStart,
        previousEnd: prevEnd,
        periodLabel: `${now.getFullYear() - 1}`,
        previousLabel: `${now.getFullYear() - 2}`,
      };
    }
    case 'custom': {
      if (customStart && customEnd) {
        const curStart = startOfDay(new Date(customStart));
        const curEnd = endOfDay(new Date(customEnd));
        const durationMs = curEnd.getTime() - curStart.getTime();

        const prevEnd = new Date(curStart.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - durationMs);

        return {
          currentStart: curStart,
          currentEnd: curEnd,
          previousStart: prevStart,
          previousEnd: prevEnd,
          periodLabel: 'Custom Period',
          previousLabel: 'Previous Equivalent Period',
        };
      }
      // Fallback to this month if custom dates not provided
    }
    case 'this_month':
    default: {
      const curStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const curEnd = endOfDay(now);

      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      const prevEnd = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        Math.min(now.getDate(), daysInPrevMonth),
        23,
        59,
        59,
        999
      );

      return {
        currentStart: curStart,
        currentEnd: curEnd,
        previousStart: prevStart,
        previousEnd: prevEnd,
        periodLabel: 'This Month',
        previousLabel: 'Last Month',
      };
    }
  }
}

function calculatePercentChange(current: number, previous: number): { percent: number; trend: 'up' | 'down' | 'neutral' } {
  if (previous === 0) {
    if (current === 0) return { percent: 0, trend: 'neutral' };
    return { percent: 100, trend: 'up' };
  }
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  return {
    percent: Math.abs(rounded),
    trend: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'neutral',
  };
}

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = 'this_month', startDate, endDate, granularity = 'daily' } = req.query;

    const ranges = resolveDateRanges(
      period as string,
      startDate as string | undefined,
      endDate as string | undefined
    );

    // 1. Current Period Sales Orders & Quotations
    const [currentOrders, prevOrders, currentQuotations, prevQuotations] = await Promise.all([
      prisma.salesOrder.findMany({
        where: {
          orderDate: { gte: ranges.currentStart, lte: ranges.currentEnd },
          orderStatus: { not: 'Cancelled' },
        },
      }),
      prisma.salesOrder.findMany({
        where: {
          orderDate: { gte: ranges.previousStart, lte: ranges.previousEnd },
          orderStatus: { not: 'Cancelled' },
        },
      }),
      prisma.quotation.findMany({
        where: {
          createdAt: { gte: ranges.currentStart, lte: ranges.currentEnd },
        },
      }),
      prisma.quotation.findMany({
        where: {
          createdAt: { gte: ranges.previousStart, lte: ranges.previousEnd },
        },
      }),
    ]);

    // Current KPI calculations
    const curTotalSales = currentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const prevTotalSales = prevOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const curTotalOrders = currentOrders.length;
    const prevTotalOrders = prevOrders.length;

    const curConfirmedOrders = currentOrders.filter((o) => o.orderStatus === 'Confirmed').length;
    const prevConfirmedOrders = prevOrders.filter((o) => o.orderStatus === 'Confirmed').length;

    const curPendingQuotations = currentQuotations.filter((q) => q.status === 'Pending').length;
    const prevPendingQuotations = prevQuotations.filter((q) => q.status === 'Pending').length;

    const curPendingDelivery = currentOrders.filter((o) =>
      ['Confirmed', 'Processing', 'Shipment Sent'].includes(o.orderStatus)
    ).length;
    const prevPendingDelivery = prevOrders.filter((o) =>
      ['Confirmed', 'Processing', 'Shipment Sent'].includes(o.orderStatus)
    ).length;

    const curRejectedQuotations = currentQuotations.filter((q) => q.status === 'Rejected').length;
    const prevRejectedQuotations = prevQuotations.filter((q) => q.status === 'Rejected').length;

    // Top 6 KPI Cards
    const kpis = {
      totalSales: {
        value: curTotalSales,
        ...calculatePercentChange(curTotalSales, prevTotalSales),
      },
      totalOrders: {
        value: curTotalOrders,
        ...calculatePercentChange(curTotalOrders, prevTotalOrders),
      },
      confirmedOrders: {
        value: curConfirmedOrders,
        ...calculatePercentChange(curConfirmedOrders, prevConfirmedOrders),
      },
      pendingQuotations: {
        value: curPendingQuotations,
        ...calculatePercentChange(curPendingQuotations, prevPendingQuotations),
      },
      ordersPendingDelivery: {
        value: curPendingDelivery,
        ...calculatePercentChange(curPendingDelivery, prevPendingDelivery),
      },
      rejectedOrders: {
        value: curRejectedQuotations,
        ...calculatePercentChange(curRejectedQuotations, prevRejectedQuotations),
      },
    };

    // 2. Main Graph - Sales Performance Line Chart
    // Grouping by selected granularity or auto
    const salesTimelineMap: { [key: string]: number } = {};

    currentOrders.forEach((o) => {
      const d = new Date(o.orderDate);
      let key = '';

      if (granularity === 'monthly' || period === 'this_year' || period === 'previous_year') {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      } else if (granularity === 'yearly') {
        key = `${d.getFullYear()}`;
      } else {
        // Daily: YYYY-MM-DD or DD/MM
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        key = `${day}/${month}`;
      }

      salesTimelineMap[key] = (salesTimelineMap[key] || 0) + o.totalAmount;
    });

    const salesPerformanceChart = Object.keys(salesTimelineMap).map((label) => ({
      period: label,
      sales: Math.round(salesTimelineMap[label]),
    }));

    // 3. Order Status Breakdown Graph (Donut / Bar)
    const confirmedCount = currentOrders.filter((o) => o.orderStatus === 'Confirmed').length;
    const processingCount = currentOrders.filter((o) => o.orderStatus === 'Processing').length;
    const shipmentSentCount = currentOrders.filter((o) => o.orderStatus === 'Shipment Sent').length;
    const deliveredCount = currentOrders.filter((o) => o.orderStatus === 'Delivered').length;
    const rejectedCount = curRejectedQuotations; // Rejected quotation count represents rejected sales opportunities

    const orderStatusChart = [
      { name: 'Confirmed', count: confirmedCount, color: '#3b82f6', statusFilter: 'Confirmed' },
      { name: 'Processing', count: processingCount, color: '#f59e0b', statusFilter: 'Processing' },
      { name: 'Shipment Sent', count: shipmentSentCount, color: '#8b5cf6', statusFilter: 'Shipment Sent' },
      { name: 'Delivered', count: deliveredCount, color: '#10b981', statusFilter: 'Delivered' },
      { name: 'Rejected', count: rejectedCount, color: '#ef4444', statusFilter: 'Rejected' },
    ];

    // 4. Quotation Performance Graph & Conversion Rate
    const totalQuotations = currentQuotations.length;
    const confirmedQuotes = currentQuotations.filter((q) => q.status === 'Confirmed').length;
    const pendingQuotes = curPendingQuotations;
    const rejectedQuotes = curRejectedQuotations;

    const quotationConversionRate =
      totalQuotations > 0
        ? Math.round((confirmedQuotes / totalQuotations) * 1000) / 10
        : 0;

    const quotationPerformanceChart = {
      total: totalQuotations,
      confirmed: confirmedQuotes,
      pending: pendingQuotes,
      rejected: rejectedQuotes,
      conversionRate: quotationConversionRate,
      breakdown: [
        { name: 'Confirmed', value: confirmedQuotes, color: '#10b981' },
        { name: 'Pending', value: pendingQuotes, color: '#f59e0b' },
        { name: 'Rejected', value: rejectedQuotes, color: '#ef4444' },
      ],
    };

    // 5. Recent Orders (Latest 5-10 records)
    const recentOrders = await prisma.salesOrder.findMany({
      orderBy: { orderDate: 'desc' },
      take: 8,
      include: {
        customer: { select: { name: true, customerId: true } },
        createdBy: { select: { name: true } },
      },
    });

    const formattedRecentOrders = recentOrders.map((o) => ({
      id: o.id,
      orderId: o.soId,
      customer: o.customer.name,
      customerId: o.customer.customerId,
      date: o.orderDate,
      amount: o.totalAmount,
      salesperson: o.createdBy.name,
      status: o.orderStatus,
    }));

    res.json({
      period: ranges.periodLabel,
      previousPeriod: ranges.previousLabel,
      kpis,
      salesPerformanceChart,
      orderStatusChart,
      quotationPerformanceChart,
      recentOrders: formattedRecentOrders,
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({ message: 'Failed to compute dashboard metrics.' });
  }
});

export default router;
