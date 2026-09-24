import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportData {
  period: string;
  generatedDate: string | Date;
  summary: {
    totalSales: number;
    totalOrders: number;
    confirmedOrders: number;
    pendingQuotations: number;
    rejectedQuotations: number;
    shipmentsSent: number;
    deliveredOrders: number;
    totalCustomers: number;
    totalQuotations: number;
    quotationConversionRate: number;
  };
  ordersTable: Array<{
    soId: string;
    quotationId: string;
    customerName: string;
    date: string | Date;
    amount: number;
    salesperson: string;
    status: string;
    shipmentId: string;
  }>;
  quotationsTable: Array<{
    quoteId: string;
    customerName: string;
    date: string | Date;
    total: number;
    salesperson: string;
    status: string;
  }>;
}

export function exportSalesReportPDF(data: ReportData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const genDate = new Date(data.generatedDate).toLocaleString('en-IN');

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('ENTERPRISE SALES MANAGEMENT ERP', 14, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Official Sales Performance Report  |  Period: ${data.period}`, 14, 21);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${genDate}`, 196, 21, { align: 'right' });

  // Summary Metrics Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Key Performance Indicators (KPI Summary)', 14, 38);

  const kpiData = [
    [
      'Total Sales Revenue',
      `₹${data.summary.totalSales.toLocaleString('en-IN')}`,
      'Confirmed Orders',
      `${data.summary.confirmedOrders}`,
    ],
    [
      'Total Orders Placed',
      `${data.summary.totalOrders}`,
      'Shipments Dispatched',
      `${data.summary.shipmentsSent}`,
    ],
    [
      'Total Quotations',
      `${data.summary.totalQuotations}`,
      'Delivered Orders',
      `${data.summary.deliveredOrders}`,
    ],
    [
      'Pending Quotations',
      `${data.summary.pendingQuotations}`,
      'Active Customers',
      `${data.summary.totalCustomers}`,
    ],
    [
      'Rejected Quotations',
      `${data.summary.rejectedQuotations}`,
      'Quotation Conversion',
      `${data.summary.quotationConversionRate}%`,
    ],
  ];

  autoTable(doc, {
    startY: 42,
    body: kpiData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], cellWidth: 50 },
      1: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 45 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], cellWidth: 50 },
      3: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 45 },
    },
  });

  // Orders Table
  let finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Confirmed Sales Orders Detail', 14, finalY);

  const orderRows = data.ordersTable.map((o) => [
    o.soId,
    o.quotationId,
    o.customerName,
    new Date(o.date).toLocaleDateString('en-IN'),
    `₹${o.amount.toLocaleString('en-IN')}`,
    o.salesperson,
    o.status,
    o.shipmentId,
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: [['Order ID', 'Quote Ref', 'Customer', 'Date', 'Amount', 'Salesperson', 'Status', 'Shipment']],
    body: orderRows,
    theme: 'striped',
    headStyles: { fillColor: [2, 107, 201], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  // Quotations Table (on next page if needed)
  finalY = (doc as any).lastAutoTable.finalY + 8;
  if (finalY > 230) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Department Quotations Breakdown', 14, finalY);

  const quoteRows = data.quotationsTable.map((q) => [
    q.quoteId,
    q.customerName,
    new Date(q.date).toLocaleDateString('en-IN'),
    `₹${q.total.toLocaleString('en-IN')}`,
    q.salesperson,
    q.status,
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: [['Quote ID', 'Customer', 'Date', 'Total Amount', 'Salesperson', 'Status']],
    body: quoteRows,
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `SalesFlow ERP  |  Confidential  |  Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  doc.save(`Sales_Report_${data.period.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function exportAiAnalysisPDF(aiData: any) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const genDate = new Date(aiData.generatedAt || new Date()).toLocaleString('en-IN');

  // Header Banner
  doc.setFillColor(88, 28, 135); // purple-900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('HOD EXECUTIVE SALES INTELLIGENCE REPORT', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(216, 180, 254); // purple-300
  doc.text(`${aiData.title || 'AI Comparative Analysis'}  |  Comparison: ${aiData.periodBLabel} vs ${aiData.periodALabel}`, 14, 21);

  doc.setFontSize(8);
  doc.setTextColor(233, 213, 255);
  doc.text(`Generated: ${genDate}`, 196, 21, { align: 'right' });

  let y = 36;

  // 1. Executive Summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. Executive Summary', 14, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const splitSummary = doc.splitTextToSize(aiData.executiveSummary || '', 182);
  doc.text(splitSummary, 14, y + 6);

  y += 8 + splitSummary.length * 4.5;

  // 2. Key Metrics Comparison Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Verified Database Metrics Comparison', 14, y);

  const metricsRows = (aiData.keyMetrics || []).map((m: any) => [
    m.metric,
    m.periodA,
    m.periodB,
    m.diff,
    `${m.change} (${m.trend.toUpperCase()})`,
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Metric Name', aiData.periodALabel, aiData.periodBLabel, 'Absolute Variance', '% Change & Trend']],
    body: metricsRows,
    theme: 'grid',
    headStyles: { fillColor: [126, 34, 206], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // 3. Observed Trends
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. Observed Department Trends', 14, y);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  let trendY = y + 5;
  (aiData.observedTrends || []).forEach((trend: string) => {
    const splitTrend = doc.splitTextToSize(`• ${trend}`, 180);
    doc.text(splitTrend, 16, trendY);
    trendY += splitTrend.length * 4.2;
  });

  y = trendY + 4;

  // 4. Anomalies & Patterns
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('4. Anomalies & Key Patterns', 14, y);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  let anomY = y + 5;
  (aiData.anomalies || []).forEach((anom: string) => {
    const splitAnom = doc.splitTextToSize(`• ${anom}`, 180);
    doc.text(splitAnom, 16, anomY);
    anomY += splitAnom.length * 4.2;
  });

  y = anomY + 4;

  // 5. Data Lineage & Verification (Guaranteed real DB records)
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('5. Data Lineage & Integrity Declaration', 14, y);

  const lineageText = `${aiData.observedVsInterpretation?.observedData || ''}\n\n${aiData.observedVsInterpretation?.interpretation || ''}`;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const splitLineage = doc.splitTextToSize(lineageText, 182);
  doc.text(splitLineage, 14, y + 5);

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `SalesFlow ERP  |  HOD Confidential Intelligence  |  Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  doc.save(`HOD_AI_Analysis_${(aiData.periodBLabel || 'Report').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
