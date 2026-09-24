import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Table as TableIcon,
  FileText,
  AlertTriangle,
  CheckCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { exportAiAnalysisPDF } from '../utils/pdfExport';

export const AiAnalyticsPage: React.FC = () => {
  const { user, isHOD } = useAuth();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'explanation' | 'chart' | 'table'>('explanation');

  // Custom Comparison Range State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [custAStart, setCustAStart] = useState('');
  const [custAEnd, setCustAEnd] = useState('');
  const [custALabel, setCustALabel] = useState('Period A');
  const [custBStart, setCustBStart] = useState('');
  const [custBEnd, setCustBEnd] = useState('');
  const [custBLabel, setCustBLabel] = useState('Period B');

  // Trigger analysis action
  const triggerAnalysis = async (actionType: string, customQuery?: string, customParams?: any) => {
    setLoading(true);
    try {
      const payload: any = {
        action: actionType,
        query: customQuery || '',
      };
      if (customParams) {
        payload.customPeriodA = customParams.periodA;
        payload.customPeriodB = customParams.periodB;
      }

      const res = await api.post('/ai/analyze', payload);
      setAnalysis(res);
    } catch (error: any) {
      alert(error.message || 'Failed to execute AI analysis.');
    } finally {
      setLoading(false);
    }
  };

  // Run default analysis on load
  useEffect(() => {
    triggerAnalysis('COMPARE_PREV_MONTH');
  }, []);

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    triggerAnalysis('ASK_QUERY', query.trim());
    setQuery('');
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custAStart || !custAEnd || !custBStart || !custBEnd) return;

    triggerAnalysis('CUSTOM_COMPARISON', undefined, {
      periodA: { label: custALabel, start: custAStart, end: custAEnd },
      periodB: { label: custBLabel, start: custBStart, end: custBEnd },
    });
    setShowCustomModal(false);
  };

  const handleDownloadPDF = () => {
    if (analysis) {
      exportAiAnalysisPDF(analysis);
    }
  };

  if (!isHOD) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-rose-200 shadow-sm max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Restricted Access</h3>
        <p className="text-xs text-slate-500 mt-1">
          HOD AI Analytics is strictly restricted to Head of Department (HOD) accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>HOD Autonomous Sales Intelligence</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Sales Performance AI Analytics
          </h2>
          <p className="text-xs text-purple-200 max-w-2xl">
            Verifiable, database-grounded calculations with zero speculative hallucinations.
          </p>
        </div>

        {analysis && !analysis.insufficientData && (
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-900/30 transition-all self-start md:self-auto space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Download Analysis PDF</span>
          </button>
        )}
      </div>

      {/* AI Quick Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
          AI Quick Analysis Actions
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => triggerAnalysis('COMPARE_PREV_MONTH')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all"
          >
            Compare with Previous Month
          </button>
          <button
            onClick={() => triggerAnalysis('COMPARE_PREV_YEAR')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all"
          >
            Compare with Previous Year
          </button>
          <button
            onClick={() => triggerAnalysis('COMPARE_SAME_MONTH_LAST_YEAR')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all"
          >
            Compare Same Month Last Year
          </button>
          <button
            onClick={() => setShowCustomModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center space-x-1"
          >
            <Calendar className="w-3.5 h-3.5 mr-1" />
            <span>Custom Comparison</span>
          </button>
          <button
            onClick={() => triggerAnalysis('CURRENT_MONTH')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all"
          >
            Analyze Current Month
          </button>
          <button
            onClick={() => triggerAnalysis('QUOTATION_CONVERSION_ANALYSIS')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all"
          >
            Quotation Conversion Analysis
          </button>
        </div>
      </div>

      {/* Ask AI Conversational Input */}
      <form onSubmit={handleAskSubmit} className="relative">
        <div className="relative flex items-center">
          <Sparkles className="w-5 h-5 absolute left-4 text-purple-600" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your sales data (e.g. 'Compare this month's sales with last month', 'How has quotation conversion changed?')..."
            className="w-full pl-12 pr-28 py-3.5 bg-white border-2 border-purple-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 shadow-sm"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center space-x-1"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </form>

      {/* Main Analysis Display */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-800">Querying Relational Sales Database...</p>
          <p className="text-xs text-slate-400">Performing mathematical aggregations, MoM / YoY variance calculations.</p>
        </div>
      ) : analysis?.insufficientData ? (
        <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="text-base font-bold text-amber-900">Insufficient Historical Data</h3>
          <p className="text-xs text-amber-700 max-w-md mx-auto">{analysis.message}</p>
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          {/* View Mode Switcher Header */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-600 block">Analysis Subject</span>
              <h3 className="text-base font-bold text-slate-900">{analysis.title}</h3>
              <p className="text-xs text-slate-500">
                Comparing <strong className="text-slate-800">{analysis.periodBLabel}</strong> against baseline{' '}
                <strong className="text-slate-800">{analysis.periodALabel}</strong>
              </p>
            </div>

            {/* Switch between: Chart, Table, AI Explanation */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
              <button
                onClick={() => setViewMode('explanation')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                  viewMode === 'explanation' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                <span>AI Explanation</span>
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                  viewMode === 'chart' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1" />
                <span>Charts</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                  viewMode === 'table' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5 mr-1" />
                <span>Table</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE: EXPLANATION (Structured 7 Sections) */}
          {viewMode === 'explanation' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Structured Sections 1 to 5 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. Executive Summary */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center space-x-2 text-purple-700 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>1. Executive Summary</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                    {analysis.executiveSummary}
                  </p>
                </div>

                {/* 2 & 3. Key Metrics & Comparison Highlights */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    2. Verified Key Metrics & Percentage Changes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analysis.keyMetrics?.map((m: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-semibold text-slate-500 block truncate">{m.metric}</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-base font-extrabold text-slate-900">{m.periodB}</span>
                          <span
                            className={`text-xs font-bold flex items-center ${
                              m.trend === 'up'
                                ? 'text-emerald-600'
                                : m.trend === 'down'
                                ? 'text-rose-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {m.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : m.trend === 'down' ? <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> : null}
                            {m.change}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Base ({analysis.periodALabel}): {m.periodA} (Diff: {m.diff})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Observed Trends */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    3. Observed Department Trends
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {analysis.observedTrends?.map((trend: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                        <span>{trend}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 7. Anomalies & Patterns */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    4. Anomalies & Revenue Patterns
                  </h4>
                  <div className="space-y-2">
                    {analysis.anomalies?.map((anom: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start space-x-2"
                      >
                        <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <span>{anom}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Col: Data Lineage & AI Safety (Section 6 & Verification) */}
              <div className="space-y-6">
                {/* Section 6: Relevant Data Used */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>5. Relevant Data Records Used</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-900 block">{analysis.relevantData?.periodB?.name}</span>
                      <p className="text-[11px] text-slate-500">{analysis.relevantData?.periodB?.dateRange}</p>
                      <div className="mt-2 flex justify-between text-slate-600 border-t border-slate-200 pt-1">
                        <span>Sales Orders:</span>
                        <strong className="text-slate-900">{analysis.relevantData?.periodB?.salesOrderRecords}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Quotations:</span>
                        <strong className="text-slate-900">{analysis.relevantData?.periodB?.quotationRecords}</strong>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-900 block">{analysis.relevantData?.periodA?.name}</span>
                      <p className="text-[11px] text-slate-500">{analysis.relevantData?.periodA?.dateRange}</p>
                      <div className="mt-2 flex justify-between text-slate-600 border-t border-slate-200 pt-1">
                        <span>Sales Orders:</span>
                        <strong className="text-slate-900">{analysis.relevantData?.periodA?.salesOrderRecords}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Quotations:</span>
                        <strong className="text-slate-900">{analysis.relevantData?.periodA?.quotationRecords}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Safety: Observed Data vs Interpretation */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center space-x-2 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Observed Data vs AI Interpretation</span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                      <strong className="block text-[11px] text-emerald-700 uppercase">Observed Database Facts:</strong>
                      <p className="text-[11px] mt-0.5">{analysis.observedVsInterpretation?.observedData}</p>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                      <strong className="block text-[11px] text-blue-700 uppercase">Statistical Interpretation:</strong>
                      <p className="text-[11px] mt-0.5">{analysis.observedVsInterpretation?.interpretation}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE: CHARTS */}
          {viewMode === 'chart' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Comparative Revenue & Volume Metrics</h4>
                  <p className="text-xs text-slate-500">{analysis.periodBLabel} vs {analysis.periodALabel}</p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysis.charts?.comparisonChartData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
                      <YAxis fontSize={11} stroke="#64748b" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey={analysis.periodALabel} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={analysis.periodBLabel} fill="#7e22ce" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Quotation Status Pipeline Comparison</h4>
                  <p className="text-xs text-slate-500">Distribution of confirmed, pending, and rejected quotes</p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysis.charts?.breakdownChartData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="status" fontSize={11} stroke="#64748b" />
                      <YAxis fontSize={11} stroke="#64748b" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey={analysis.periodALabel} fill="#64748b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={analysis.periodBLabel} fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE: TABLE */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900">Full Comparative Data Ledger</h4>
                <p className="text-xs text-slate-500">Side-by-side verified database aggregations</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 text-left">Metric Name</th>
                      <th className="px-6 py-3 text-left">{analysis.periodALabel}</th>
                      <th className="px-6 py-3 text-left">{analysis.periodBLabel}</th>
                      <th className="px-6 py-3 text-left">Absolute Variance</th>
                      <th className="px-6 py-3 text-left">% Change</th>
                      <th className="px-6 py-3 text-left">Trend Direction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.keyMetrics?.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{m.metric}</td>
                        <td className="px-6 py-3.5 text-slate-600 font-medium">{m.periodA}</td>
                        <td className="px-6 py-3.5 font-bold text-purple-700">{m.periodB}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-800">{m.diff}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">{m.change}</td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              m.trend === 'up'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.trend === 'down'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {m.trend}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* CUSTOM COMPARISON MODAL */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-slate-200 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Custom Period Comparison</h3>
              <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>

            <form onSubmit={handleCustomSubmit} className="space-y-4">
              {/* Period A */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800">Baseline (Period A)</span>
                <input
                  type="text"
                  value={custALabel}
                  onChange={(e) => setCustALabel(e.target.value)}
                  placeholder="Label (e.g. Q1 2026)"
                  className="w-full border border-slate-300 rounded p-1.5 bg-white mb-2"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date</label>
                    <input
                      type="date"
                      value={custAStart}
                      onChange={(e) => setCustAStart(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">End Date</label>
                    <input
                      type="date"
                      value={custAEnd}
                      onChange={(e) => setCustAEnd(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1 bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Period B */}
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2">
                <span className="font-bold text-purple-900">Comparison Target (Period B)</span>
                <input
                  type="text"
                  value={custBLabel}
                  onChange={(e) => setCustBLabel(e.target.value)}
                  placeholder="Label (e.g. Q2 2026)"
                  className="w-full border border-slate-300 rounded p-1.5 bg-white mb-2"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-purple-600 uppercase">Start Date</label>
                    <input
                      type="date"
                      value={custBStart}
                      onChange={(e) => setCustBStart(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-purple-600 uppercase">End Date</label>
                    <input
                      type="date"
                      value={custBEnd}
                      onChange={(e) => setCustBEnd(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1 bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg"
                >
                  Run Comparison
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
