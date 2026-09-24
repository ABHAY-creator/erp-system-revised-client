import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  DollarSign,
  ShoppingCart,
  CheckCircle,
  Truck,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import { exportSalesReportPDF, ReportData } from '../utils/pdfExport';
import { StatusBadge } from '../components/StatusBadge';

export const ReportsPage: React.FC = () => {
  const [period, setPeriod] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'quotations'>('orders');
  const [tableSearch, setTableSearch] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      let query = `?period=${period}`;
      if (period === 'custom' && startDate && endDate) {
        query += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await api.get(`/reports${query}`);
      setReportData(res);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period]);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      setPeriod('custom');
      fetchReport();
    }
  };

  const handleExportPDF = () => {
    if (reportData) {
      exportSalesReportPDF(reportData);
    }
  };

  const summary = reportData?.summary;

  const filteredOrders = (reportData?.ordersTable || []).filter((o) => {
    if (!tableSearch) return true;
    const q = tableSearch.toLowerCase();
    return (
      o.soId.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.salesperson.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  });

  const filteredQuotations = (reportData?.quotationsTable || []).filter((q) => {
    if (!tableSearch) return true;
    const s = tableSearch.toLowerCase();
    return (
      q.quoteId.toLowerCase().includes(s) ||
      q.customerName.toLowerCase().includes(s) ||
      q.salesperson.toLowerCase().includes(s) ||
      q.status.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Department Performance & Sales Reports</h2>
          <p className="text-xs text-slate-500">
            Real database audit records for <span className="font-semibold text-blue-600">{reportData?.period || 'Current Month'}</span>
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={!reportData || loading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-4 h-4 mr-1.5" />
          Export Official PDF Report
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Daily' },
            { id: 'this_month', label: 'Monthly (Current)' },
            { id: 'this_year', label: 'Yearly' },
            { id: 'previous_year', label: 'Previous Year' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === item.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleApplyCustom} className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">Custom Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-slate-800 bg-white"
            required
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-slate-800 bg-white"
            required
          />
          <button
            type="submit"
            className="px-3 py-1 bg-slate-800 text-white rounded font-medium hover:bg-slate-900 transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* 10 Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sales</span>
          <span className="text-lg font-bold text-emerald-700">₹{(summary?.totalSales || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Orders</span>
          <span className="text-lg font-bold text-slate-900">{summary?.totalOrders || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Confirmed Orders</span>
          <span className="text-lg font-bold text-blue-600">{summary?.confirmedOrders || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Shipments Sent</span>
          <span className="text-lg font-bold text-purple-600">{summary?.shipmentsSent || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivered Orders</span>
          <span className="text-lg font-bold text-emerald-600">{summary?.deliveredOrders || 0}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Quotations</span>
          <span className="text-lg font-bold text-slate-900">{summary?.totalQuotations || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Quotations</span>
          <span className="text-lg font-bold text-amber-600">{summary?.pendingQuotations || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Rejected Quotations</span>
          <span className="text-lg font-bold text-rose-600">{summary?.rejectedQuotations || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Customers</span>
          <span className="text-lg font-bold text-slate-800">{summary?.totalCustomers || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Conversion Rate</span>
          <span className="text-lg font-extrabold text-blue-700">{summary?.quotationConversionRate || 0}%</span>
        </div>
      </div>

      {/* Detailed Tables Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Tabs & Search */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Sales Orders List ({reportData?.ordersTable?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('quotations')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'quotations'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Quotations Breakdown ({reportData?.quotationsTable?.length || 0})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search in table..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        {activeTab === 'orders' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3 text-left">Order ID</th>
                  <th className="px-5 py-3 text-left">Quote Ref</th>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Salesperson</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Shipment ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((o, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-blue-600">{o.soId}</td>
                      <td className="px-5 py-3 font-mono text-slate-500">{o.quotationId}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{o.customerName}</td>
                      <td className="px-5 py-3 text-slate-600">{new Date(o.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-3 font-bold text-slate-900">₹{o.amount.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3 text-slate-600">{o.salesperson}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-700">{o.shipmentId}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      No sales orders found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3 text-left">Quotation ID</th>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Salesperson</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.length > 0 ? (
                  filteredQuotations.map((q, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-blue-600">{q.quoteId}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{q.customerName}</td>
                      <td className="px-5 py-3 text-slate-600">{new Date(q.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-3 font-bold text-slate-900">₹{q.total.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3 text-slate-600">{q.salesperson}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={q.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No quotations found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
