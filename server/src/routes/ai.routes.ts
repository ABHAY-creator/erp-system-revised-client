import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

interface PeriodData {
  label: string;
  startDate: Date;
  endDate: Date;
  salesOrders: any[];
  quotations: any[];
  totalSales: number;
  totalOrders: number;
  confirmedOrders: number;
  averageOrderValue: number;
  totalQuotations: number;
  confirmedQuotations: number;
  pendingQuotations: number;
  rejectedQuotations: number;
  conversionRate: number;
}

async function fetchPeriodData(label: string, start: Date, end: Date): Promise<PeriodData> {
  const [salesOrders, quotations] = await Promise.all([
    prisma.salesOrder.findMany({
      where: {
        orderDate: { gte: start, lte: end },
        orderStatus: { not: 'Cancelled' },
      },
      include: {
        customer: { select: { name: true, customerId: true } },
      },
      orderBy: { orderDate: 'asc' },
    }),
    prisma.quotation.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      include: {
        customer: { select: { name: true, customerId: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const totalSales = salesOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = salesOrders.length;
  const confirmedOrders = salesOrders.filter((o) => o.orderStatus === 'Confirmed').length;
  const averageOrderValue = confirmedOrders > 0 ? Math.round(totalSales / confirmedOrders) : (totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0);

  const totalQuotations = quotations.length;
  const confirmedQuotations = quotations.filter((q) => q.status === 'Confirmed').length;
  const pendingQuotations = quotations.filter((q) => q.status === 'Pending').length;
  const rejectedQuotations = quotations.filter((q) => q.status === 'Rejected').length;
  const conversionRate = totalQuotations > 0 ? Math.round((confirmedQuotations / totalQuotations) * 1000) / 10 : 0;

  return {
    label,
    startDate: start,
    endDate: end,
    salesOrders,
    quotations,
    totalSales,
    totalOrders,
    confirmedOrders,
    averageOrderValue,
    totalQuotations,
    confirmedQuotations,
    pendingQuotations,
    rejectedQuotations,
    conversionRate,
  };
}

function calculateChange(current: number, previous: number) {
  const diff = current - previous;
  if (previous === 0) {
    if (current === 0) return { diff: 0, percent: 0, trend: 'neutral' };
    return { diff, percent: 100, trend: 'up' };
  }
  const percent = Math.round(((current - previous) / previous) * 1000) / 10;
  return {
    diff,
    percent: Math.abs(percent),
    trend: percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral',
  };
}

// POST /api/ai/analyze (HOD ONLY)
router.post(
  '/analyze',
  authenticateToken,
  requireRole('HOD'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { action, query, customPeriodA, customPeriodB } = req.body;
      const now = new Date();

      let periodA: PeriodData;
      let periodB: PeriodData;
      let title = 'Sales Analytics Report';

      // 1. Resolve Periods based on action or query
      const actionType = action || 'CURRENT_MONTH';

      if (actionType === 'COMPARE_PREV_MONTH' || (query && query.toLowerCase().includes('last month'))) {
        title = 'Month-over-Month Sales Comparison';
        // Period B: Current Month
        const bStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const bEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodB = await fetchPeriodData(
          `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`,
          bStart,
          bEnd
        );

        // Period A: Previous Month
        const aStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const aEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        periodA = await fetchPeriodData(
          `${prevMonthDate.toLocaleString('default', { month: 'short' })} ${prevMonthDate.getFullYear()}`,
          aStart,
          aEnd
        );
      } else if (actionType === 'COMPARE_PREV_YEAR' || (query && query.toLowerCase().includes('last year'))) {
        title = 'Year-over-Year Sales Comparison';
        // Period B: Current Year
        const bStart = new Date(now.getFullYear(), 0, 1);
        const bEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        periodB = await fetchPeriodData(`FY ${now.getFullYear()}`, bStart, bEnd);

        // Period A: Previous Year
        const aStart = new Date(now.getFullYear() - 1, 0, 1);
        const aEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        periodA = await fetchPeriodData(`FY ${now.getFullYear() - 1}`, aStart, aEnd);
      } else if (actionType === 'COMPARE_SAME_MONTH_LAST_YEAR') {
        title = 'Same Month Last Year Comparison';
        const bStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const bEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodB = await fetchPeriodData(
          `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`,
          bStart,
          bEnd
        );

        const aStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        const aEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodA = await fetchPeriodData(
          `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear() - 1}`,
          aStart,
          aEnd
        );
      } else if (actionType === 'CUSTOM_COMPARISON' && customPeriodA?.start && customPeriodB?.start) {
        title = 'Custom Period Comparison Analysis';
        periodA = await fetchPeriodData(
          customPeriodA.label || 'Period A',
          new Date(customPeriodA.start),
          new Date(customPeriodA.end)
        );
        periodB = await fetchPeriodData(
          customPeriodB.label || 'Period B',
          new Date(customPeriodB.start),
          new Date(customPeriodB.end)
        );
      } else if (actionType === 'QUOTATION_CONVERSION_ANALYSIS' || (query && query.toLowerCase().includes('conversion'))) {
        title = 'Quotation Conversion & Win Rate Deep-Dive';
        const bStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const bEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodB = await fetchPeriodData(`This Month (${now.toLocaleString('default', { month: 'short' })})`, bStart, bEnd);

        const aStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const aEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        periodA = await fetchPeriodData(`Last Month (${prevMonthDate.toLocaleString('default', { month: 'short' })})`, aStart, aEnd);
      } else {
        // Default: Current Month vs Previous Month Analysis
        title = 'Department Performance & Sales Trend Analysis';
        const bStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const bEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodB = await fetchPeriodData(
          `Current Month (${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()})`,
          bStart,
          bEnd
        );

        const aStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const aEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        periodA = await fetchPeriodData(
          `Previous Month (${prevMonthDate.toLocaleString('default', { month: 'short' })} ${prevMonthDate.getFullYear()})`,
          aStart,
          aEnd
        );
      }

      // Check if data is completely empty
      const totalRecords = periodA.salesOrders.length + periodB.salesOrders.length + periodA.quotations.length + periodB.quotations.length;
      if (totalRecords === 0) {
        res.json({
          title,
          insufficientData: true,
          message: 'There is insufficient historical data in the database to perform this comparison.',
          periodA: { label: periodA.label, records: 0 },
          periodB: { label: periodB.label, records: 0 },
        });
        return;
      }

      // 2. Perform Verified Mathematical Calculations
      const salesChange = calculateChange(periodB.totalSales, periodA.totalSales);
      const ordersChange = calculateChange(periodB.totalOrders, periodA.totalOrders);
      const aovChange = calculateChange(periodB.averageOrderValue, periodA.averageOrderValue);
      const conversionChange = calculateChange(periodB.conversionRate, periodA.conversionRate);
      const quotationChange = calculateChange(periodB.totalQuotations, periodA.totalQuotations);

      // 3. Build Strict 7-Section Response

      // Section 1: Executive Summary
      const salesTrendWord = salesChange.trend === 'up' ? 'expanded' : salesChange.trend === 'down' ? 'declined' : 'held steady';
      const executiveSummary = `Sales performance for ${periodB.label} ${salesTrendWord} to ₹${periodB.totalSales.toLocaleString('en-IN')}, reflecting a ${salesChange.percent}% ${salesChange.trend} compared to ${periodA.label} (₹${periodA.totalSales.toLocaleString('en-IN')}). The department closed ${periodB.totalOrders} sales orders with an Average Order Value (AOV) of ₹${periodB.averageOrderValue.toLocaleString('en-IN')}, while quotation conversion settled at ${periodB.conversionRate}%.`;

      // Section 2: Key Metrics
      const keyMetrics = [
        { metric: 'Total Sales Revenue', periodA: `₹${periodA.totalSales.toLocaleString('en-IN')}`, periodB: `₹${periodB.totalSales.toLocaleString('en-IN')}`, diff: `₹${Math.abs(salesChange.diff).toLocaleString('en-IN')}`, change: `${salesChange.percent}%`, trend: salesChange.trend },
        { metric: 'Total Confirmed Orders', periodA: `${periodA.totalOrders}`, periodB: `${periodB.totalOrders}`, diff: `${Math.abs(ordersChange.diff)}`, change: `${ordersChange.percent}%`, trend: ordersChange.trend },
        { metric: 'Average Order Value (AOV)', periodA: `₹${periodA.averageOrderValue.toLocaleString('en-IN')}`, periodB: `₹${periodB.averageOrderValue.toLocaleString('en-IN')}`, diff: `₹${Math.abs(aovChange.diff).toLocaleString('en-IN')}`, change: `${aovChange.percent}%`, trend: aovChange.trend },
        { metric: 'Total Quotations Created', periodA: `${periodA.totalQuotations}`, periodB: `${periodB.totalQuotations}`, diff: `${Math.abs(quotationChange.diff)}`, change: `${quotationChange.percent}%`, trend: quotationChange.trend },
        { metric: 'Quotation Conversion Rate', periodA: `${periodA.conversionRate}%`, periodB: `${periodB.conversionRate}%`, diff: `${Math.abs(conversionChange.diff)}%`, change: `${conversionChange.percent}%`, trend: conversionChange.trend },
      ];

      // Section 3 & 4: Comparison & Percentage Changes (Included in keyMetrics & detail)
      const comparisonSummary = `Compared to ${periodA.label}, confirmed sales revenue changed by ${salesChange.diff >= 0 ? '+' : '-'}₹${Math.abs(salesChange.diff).toLocaleString('en-IN')} (${salesChange.percent}% ${salesChange.trend}). Order volume moved from ${periodA.totalOrders} to ${periodB.totalOrders} orders.`;

      // Section 5: Observed Trends
      const observedTrends = [
        `Revenue Momentum: Recorded ${periodB.totalOrders} orders in ${periodB.label} vs ${periodA.totalOrders} in ${periodA.label}.`,
        `Deal Sizing: Average basket size reached ₹${periodB.averageOrderValue.toLocaleString('en-IN')} per order (${aovChange.percent}% ${aovChange.trend}).`,
        `Pipeline Velocity: Quotation conversion registered at ${periodB.conversionRate}% (${periodB.confirmedQuotations} of ${periodB.totalQuotations} quotations confirmed).`,
        `Pending Pipeline: Currently ${periodB.pendingQuotations} quotations remain in Pending status awaiting confirmation or follow-up.`,
      ];

      // Section 6: Relevant Data (Data Lineage)
      const relevantData = {
        periodA: {
          name: periodA.label,
          dateRange: `${periodA.startDate.toISOString().split('T')[0]} to ${periodA.endDate.toISOString().split('T')[0]}`,
          salesOrderRecords: periodA.salesOrders.length,
          quotationRecords: periodA.quotations.length,
        },
        periodB: {
          name: periodB.label,
          dateRange: `${periodB.startDate.toISOString().split('T')[0]} to ${periodB.endDate.toISOString().split('T')[0]}`,
          salesOrderRecords: periodB.salesOrders.length,
          quotationRecords: periodB.quotations.length,
        },
      };

      // Section 7: Important Anomalies / Patterns
      const anomalies: string[] = [];
      if (periodB.rejectedQuotations > 0 && periodB.rejectedQuotations >= periodB.confirmedQuotations) {
        anomalies.push(`Elevated Quotation Rejections: ${periodB.rejectedQuotations} quotations were rejected during ${periodB.label}, exceeding or matching confirmed orders.`);
      }
      if (periodB.totalOrders > 0 && periodB.conversionRate < 40) {
        anomalies.push(`Low Conversion Benchmark: The current conversion rate (${periodB.conversionRate}%) is under the recommended 50% sales team target.`);
      }
      if (periodB.salesOrders.length > 0) {
        const topOrder = [...periodB.salesOrders].sort((a, b) => b.totalAmount - a.totalAmount)[0];
        if (topOrder && topOrder.totalAmount > periodB.totalSales * 0.4 && periodB.totalOrders > 1) {
          anomalies.push(`Revenue Concentration: Order ${topOrder.soId} (₹${topOrder.totalAmount.toLocaleString('en-IN')}) accounts for over 40% of total revenue in ${periodB.label}.`);
        }
      }
      if (anomalies.length === 0) {
        anomalies.push('Healthy Distribution: No abnormal revenue concentrations or unusual spikes detected in the queried dataset.');
      }

      // 4. Chart Visualization Payloads
      const comparisonChartData = [
        { name: 'Total Sales (₹/1000)', [periodA.label]: Math.round(periodA.totalSales / 1000), [periodB.label]: Math.round(periodB.totalSales / 1000) },
        { name: 'Orders Count', [periodA.label]: periodA.totalOrders, [periodB.label]: periodB.totalOrders },
        { name: 'Quotations Count', [periodA.label]: periodA.totalQuotations, [periodB.label]: periodB.totalQuotations },
        { name: 'Conversion Rate (%)', [periodA.label]: periodA.conversionRate, [periodB.label]: periodB.conversionRate },
      ];

      const breakdownChartData = [
        { status: 'Confirmed', [periodA.label]: periodA.confirmedQuotations, [periodB.label]: periodB.confirmedQuotations },
        { status: 'Pending', [periodA.label]: periodA.pendingQuotations, [periodB.label]: periodB.pendingQuotations },
        { status: 'Rejected', [periodA.label]: periodA.rejectedQuotations, [periodB.label]: periodB.rejectedQuotations },
      ];

      res.json({
        title,
        generatedAt: new Date(),
        periodALabel: periodA.label,
        periodBLabel: periodB.label,
        executiveSummary,
        keyMetrics,
        comparisonSummary,
        observedTrends,
        relevantData,
        anomalies,
        observedVsInterpretation: {
          observedData: `Database queries retrieved ${periodA.salesOrders.length + periodB.salesOrders.length} confirmed sales orders and ${periodA.quotations.length + periodB.quotations.length} quotations between ${relevantData.periodA.dateRange} and ${relevantData.periodB.dateRange}. All monetary metrics, counts, and conversion percentages are directly aggregated from these database records.`,
          interpretation: `Comparative percentage variations and trend observations highlight department operational velocity. These are calculated statistical derivations and do not introduce unverified estimations.`,
        },
        charts: {
          comparisonChartData,
          breakdownChartData,
        },
      });
    } catch (error) {
      console.error('Error generating AI Analytics:', error);
      res.status(500).json({ message: 'Failed to generate AI analytics report.' });
    }
  }
);

export default router;
