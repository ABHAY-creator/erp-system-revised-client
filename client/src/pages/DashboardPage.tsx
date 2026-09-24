import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const DashboardPage: React.FC = () => {
  const { user, isHOD } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState('this_month');
  const [granularity, setGranularity] = useState('daily');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let query = `?period=${period}&granularity=${granularity}`;
      if (period === 'custom' && customStart && customEnd) {
        query += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const res = await api.get(`/dashboard/stats${query}`);
      setData(res);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period, granularity]);

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      setPeriod('custom');
      fetchDashboardData();
    }
  };

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Top Bar with Period Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Sales Department Performance</h2>
          <p className="text-xs text-slate-500">
            Real-time analytics for <span className="font-semibold text-blue-600">{data?.period || 'Selected Period'}</span> (Compared with {data?.previousPeriod || 'Prior Period'})
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'previous_month', label: 'Prev Month' },
            { id: 'this_year', label: 'This Year' },
            { id: 'previous_year', label: 'Prev Year' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setPeriod(item.id);
                setShowCustomPicker(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === item.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={() => setShowCustomPicker(!showCustomPicker)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
              period === 'custom'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 mr-1" />
            <span>Custom Range</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Collapsible Modal/Bar */}
      {showCustomPicker && (
        <form
          onSubmit={handleApplyCustomRange}
          className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex flex-wrap items-center gap-3 text-xs"
        >
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1 text-slate-800 bg-white focus:outline-blue-500"
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1 text-slate-800 bg-white focus:outline-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-sm transition-colors"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* Top 6 Compact KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              ₹{(kpis?.totalSales?.value || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center text-[11px] mt-1 space-x-1">
              {kpis?.totalSales?.trend === 'up' ? (
                <span className="text-emerald-600 font-semibold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +{kpis.totalSales.percent}%
                </span>
              ) : kpis?.totalSales?.trend === 'down' ? (
                <span className="text-rose-600 font-semibold flex items-center">
                  <TrendingDown className="w-3 h-3 mr-0.5" /> -{kpis.totalSales.percent}%
                </span>
              ) : (
                <span className="text-slate-400 font-medium">0% vs prior</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Total Orders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Orders</span>
            <ShoppingCart className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {kpis?.totalOrders?.value || 0}
            </div>
            <div className="flex items-center text-[11px] mt-1 space-x-1">
              {kpis?.totalOrders?.trend === 'up' ? (
                <span className="text-emerald-600 font-semibold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +{kpis.totalOrders.percent}%
                </span>
              ) : kpis?.totalOrders?.trend === 'down' ? (
                <span className="text-rose-600 font-semibold flex items-center">
                  <TrendingDown className="w-3 h-3 mr-0.5" /> -{kpis.totalOrders.percent}%
                </span>
              ) : (
                <span className="text-slate-400 font-medium">0% vs prior</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Confirmed Orders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-blue-700 tracking-tight">
              {kpis?.confirmedOrders?.value || 0}
            </div>
            <div className="flex items-center text-[11px] mt-1 space-x-1">
              {kpis?.confirmedOrders?.trend === 'up' ? (
                <span className="text-emerald-600 font-semibold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +{kpis.confirmedOrders.percent}%
                </span>
              ) : kpis?.confirmedOrders?.trend === 'down' ? (
                <span className="text-rose-600 font-semibold flex items-center">
                  <TrendingDown className="w-3 h-3 mr-0.5" /> -{kpis.confirmedOrders.percent}%
                </span>
              ) : (
                <span className="text-slate-400 font-medium">0% vs prior</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Pending Quotations */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Quotes</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-amber-600 tracking-tight">
              {kpis?.pendingQuotations?.value || 0}
            </div>
            <div className="flex items-center text-[11px] mt-1 space-x-1">
              <span className="text-slate-500">Awaiting review</span>
            </div>
          </div>
        </div>

        {/* 5. Orders Pending Delivery */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">In Fulfillment</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-purple-700 tracking-tight">
              {kpis?.ordersPendingDelivery?.value || 0}
            </div>
            <div className="flex items-center text-[11px] mt-1 space-x-1">
              <span className="text-slate-500">Not yet delivered</span>
            </div>
          </div>
        </div>

        {/* 6. Rejected Orders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-rose-600 tracking-tight">
              {kpis?.rejectedOrders?.value || 0}
            </div>
            <div className="flex items-center text-[11px] mt-1 space-x-1">
              <span className="text-slate-400">Never becomes sales</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Graph — Sales Performance Line Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Sales Performance</h3>
            <p className="text-xs text-slate-500">Confirmed sales order revenue trends across time</p>
          </div>
          {/* Granularity Toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            {['daily', 'monthly', 'yearly'].map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2.5 py-1 text-xs font-semibold rounded capitalize transition-all ${
                  granularity === g ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {data?.salesPerformanceChart && data.salesPerformanceChart.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.salesPerformanceChart} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Sales Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0284c7' }}
                  activeDot={{ r: 6, fill: '#0369a1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <ShoppingCart className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No sales transactions recorded for this period.</p>
            <p className="text-xs text-slate-400 mt-1">Confirmed sales orders will automatically appear on this chart.</p>
          </div>
        )}
      </div>

      {/* 2 Visualizations Row: Order Status + Quotation Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Visualization */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">Order Status Distribution</h3>
            <p className="text-xs text-slate-500">Clicking a status navigates to the filtered sales order list</p>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-center justify-around min-h-[220px]">
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.orderStatusChart || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                    cursor="pointer"
                    onClick={(entry) => navigate(`/sales?status=${entry.statusFilter}`)}
                  >
                    {(data?.orderStatusChart || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} orders`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status Legend Clickable List */}
            <div className="space-y-2 mt-4 sm:mt-0 w-full sm:w-auto">
              {(data?.orderStatusChart || []).map((item: any) => (
                <button
                  key={item.name}
                  onClick={() => navigate(`/sales?status=${item.statusFilter}`)}
                  className="flex items-center justify-between w-full sm:min-w-[160px] px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 ml-3">{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quotation Performance & Conversion Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quotation Performance</h3>
                <p className="text-xs text-slate-500">Pipeline conversion and outcome distribution</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Conversion Rate</span>
                <span className="text-xl font-extrabold text-emerald-600">
                  {data?.quotationPerformanceChart?.conversionRate || 0}%
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                <p className="text-xs font-semibold text-emerald-700">Confirmed</p>
                <p className="text-lg font-bold text-emerald-900 mt-0.5">
                  {data?.quotationPerformanceChart?.confirmed || 0}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                <p className="text-xs font-semibold text-amber-700">Pending</p>
                <p className="text-lg font-bold text-amber-900 mt-0.5">
                  {data?.quotationPerformanceChart?.pending || 0}
                </p>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                <p className="text-xs font-semibold text-rose-700">Rejected</p>
                <p className="text-lg font-bold text-rose-900 mt-0.5">
                  {data?.quotationPerformanceChart?.rejected || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Total Quotations Generated: <strong className="text-slate-800">{data?.quotationPerformanceChart?.total || 0}</strong>
            </span>
            <Link to="/quotations" className="text-blue-600 hover:text-blue-800 font-semibold flex items-center">
              <span>View Quotations</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Confirmed Orders</h3>
            <p className="text-xs text-slate-500">Latest executed sales order transactions</p>
          </div>
          <Link
            to="/sales"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3 text-left">Order ID</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Amount</th>
                <th className="px-5 py-3 text-left">Salesperson</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentOrders && data.recentOrders.length > 0 ? (
                data.recentOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-bold text-blue-600 font-mono">{o.orderId}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{o.customer}</td>
                    <td className="px-5 py-3 text-slate-500">{new Date(o.date).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">₹{o.amount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 text-slate-600">{o.salesperson}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No recent orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HOD ONLY AI BUSINESS INSIGHTS BANNER */}
      {isHOD && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>HOD Executive AI Intelligence</span>
            </div>
            <h3 className="text-lg font-bold text-white">Compare Sales & Forecast Pipeline Velocity</h3>
            <p className="text-xs text-purple-200 max-w-2xl">
              Execute comparative analysis against previous periods, inspect anomalies, and review authentic database-grounded insights.
            </p>
          </div>
          <Link
            to="/ai-analytics"
            className="px-5 py-2.5 rounded-lg bg-white text-purple-950 font-bold text-xs hover:bg-purple-50 shadow-md transition-all flex items-center justify-center shrink-0 space-x-1.5"
          >
            <span>Open AI Analytics</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};
