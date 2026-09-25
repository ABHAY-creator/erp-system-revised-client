import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  ShoppingCart,
  Calendar,
  Building,
  User,
  ExternalLink,
  Clock,
  Send,
  RotateCcw,
  History,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const QuotationsPage: React.FC = () => {
  const {
    user,
    canConfirmQuotation,
    isSalesperson,
    canViewQuotationHistory,
    canAccessRecentlyDeleted,
    canPermanentDeleteQuotation,
  } = useAuth();

  type QuotationNavTab = 'ALL' | 'Pending' | 'Confirmed' | 'Rejected' | 'History' | 'Recently Deleted';
  const [navTab, setNavTab] = useState<QuotationNavTab>('ALL');

  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Customer and Product catalogues for creation
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewQuotation, setViewQuotation] = useState<any>(null);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [viewTab, setViewTab] = useState<'details' | 'items' | 'history'>('details');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [rejectReason, setRejectReason] = useState('');

  // Recently Deleted State
  const [recentlyDeletedList, setRecentlyDeletedList] = useState<any[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [deletedSearch, setDeletedSearch] = useState('');
  const [deletedStatusFilter, setDeletedStatusFilter] = useState('ALL');
  const [deletedByFilter, setDeletedByFilter] = useState('ALL');
  const [deletedSort, setDeletedSort] = useState('recently_deleted');
  const [restoreTarget, setRestoreTarget] = useState<any>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<any>(null);
  const [permanentDeleteBlockedSo, setPermanentDeleteBlockedSo] = useState<string | null>(null);

  // Global History State
  const [globalHistory, setGlobalHistory] = useState<any[]>([]);
  const [globalHistoryLoading, setGlobalHistoryLoading] = useState(false);
  const [globalHistorySearch, setGlobalHistorySearch] = useState('');
  const [globalHistoryFilter, setGlobalHistoryFilter] = useState('ALL');

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [validUntilDays, setValidUntilDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(18);
  const [lineItems, setLineItems] = useState<
    Array<{
      productId: string;
      productName: string;
      image?: string;
      description: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>
  >([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      let query = `?search=${encodeURIComponent(search)}`;
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;
      const res = await api.get(`/quotations${query}`);
      setQuotations(res.data || []);
    } catch (error) {
      console.error('Failed to load quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentlyDeleted = async () => {
    if (!canAccessRecentlyDeleted) return;
    setDeletedLoading(true);
    try {
      let query = `?search=${encodeURIComponent(deletedSearch)}&sort=${deletedSort}`;
      if (deletedStatusFilter !== 'ALL') query += `&status=${deletedStatusFilter}`;
      if (deletedByFilter !== 'ALL') query += `&deletedBy=${encodeURIComponent(deletedByFilter)}`;
      const res = await api.get(`/quotations/recently-deleted${query}`);
      setRecentlyDeletedList(res.data || []);
    } catch (error) {
      console.error('Failed to load recently deleted quotations:', error);
    } finally {
      setDeletedLoading(false);
    }
  };

  const fetchGlobalHistory = async () => {
    if (!canViewQuotationHistory) return;
    setGlobalHistoryLoading(true);
    try {
      let query = `?search=${encodeURIComponent(globalHistorySearch)}`;
      if (globalHistoryFilter !== 'ALL') query += `&action=${globalHistoryFilter}`;
      const res = await api.get(`/quotations/history/all${query}`);
      setGlobalHistory(res.data || []);
    } catch (error) {
      console.error('Failed to load quotation history:', error);
    } finally {
      setGlobalHistoryLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/customers?limit=100'),
        api.get('/products?limit=100'),
      ]);
      setCustomers(cRes.data || []);
      setProducts(pRes.data || []);
    } catch (error) {
      console.error('Failed to fetch dependencies:', error);
    }
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    if (navTab === 'Recently Deleted') {
      fetchRecentlyDeleted();
    } else if (navTab === 'History') {
      fetchGlobalHistory();
    } else {
      setStatusFilter(navTab);
    }
  }, [navTab, deletedSort, deletedStatusFilter, deletedByFilter, globalHistoryFilter]);

  useEffect(() => {
    if (navTab === 'ALL' || navTab === 'Pending' || navTab === 'Confirmed' || navTab === 'Rejected') {
      fetchQuotations();
    }
  }, [statusFilter, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotations();
  };

  const openCreateModal = () => {
    setSelectedCustomerId(customers[0]?.id || '');
    setValidUntilDays(30);
    setNotes('');
    setDiscountPercent(0);
    setTaxPercent(18);
    setLineItems([]);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const addLineItem = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    setLineItems([
      ...lineItems,
      {
        productId: defaultProd.id,
        productName: defaultProd.name,
        image: defaultProd.image,
        description: defaultProd.description || '',
        unit: defaultProd.unit,
        quantity: 1,
        unitPrice: defaultProd.sellingPrice,
        totalPrice: defaultProd.sellingPrice,
      },
    ]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index] };

    if (field === 'productId') {
      const p = products.find((prod) => prod.id === value);
      if (p) {
        item.productId = p.id;
        item.productName = p.name;
        item.image = p.image;
        item.description = p.description || '';
        item.unit = p.unit;
        item.unitPrice = p.sellingPrice;
        item.totalPrice = Math.round(item.quantity * p.sellingPrice * 100) / 100;
      }
    } else if (field === 'quantity') {
      item.quantity = Math.max(1, parseFloat(value) || 1);
      item.totalPrice = Math.round(item.quantity * item.unitPrice * 100) / 100;
    } else if (field === 'unitPrice') {
      item.unitPrice = Math.max(0, parseFloat(value) || 0);
      item.totalPrice = Math.round(item.quantity * item.unitPrice * 100) / 100;
    } else if (field === 'description') {
      item.description = value;
    }

    updated[index] = item;
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Live Totals Calculation
  const subtotal = lineItems.reduce((sum, it) => sum + it.totalPrice, 0);
  const discountAmount = Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = Math.round(((taxable * taxPercent) / 100) * 100) / 100;
  const grandTotal = Math.round((taxable + taxAmount) * 100) / 100;

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setFormError('Please select a customer.');
      return;
    }
    if (lineItems.length === 0) {
      setFormError('Please add at least one line item to the quotation.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + validUntilDays);

    try {
      const res = await api.post('/quotations', {
        customerId: selectedCustomerId,
        validUntil: validUntilDate,
        notes,
        discountPercent,
        taxPercent,
        items: lineItems,
      });

      setIsCreateOpen(false);
      setSuccessToast(`Quotation ${res.quotation.quoteId} created in Pending status.`);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchQuotations();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    try {
      const res = await api.post(`/quotations/${confirmTarget.id}/confirm`);
      setConfirmTarget(null);
      setSuccessToast(res.message);
      setTimeout(() => setSuccessToast(null), 5000);
      fetchQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm quotation.');
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      const res = await api.post(`/quotations/${rejectTarget.id}/reject`, {
        reason: rejectReason || undefined,
      });
      setRejectTarget(null);
      setSuccessToast(res.message);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to reject quotation.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.delete(`/quotations/${deleteTarget.id}`);
      setDeleteTarget(null);
      setSuccessToast(res.message || `Quotation ${deleteTarget.quoteId} moved to Recently Deleted.`);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchQuotations();
      if (canAccessRecentlyDeleted) {
        fetchRecentlyDeleted();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete quotation.');
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      const res = await api.post(`/quotations/${restoreTarget.id}/restore`);
      setRestoreTarget(null);
      setSuccessToast(res.message || `Quotation ${restoreTarget.quoteId} restored successfully.`);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchRecentlyDeleted();
      fetchQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to restore quotation.');
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    if (permanentDeleteTarget.salesOrderId) {
      setPermanentDeleteBlockedSo(permanentDeleteTarget.salesOrderId);
      return;
    }
    try {
      const res = await api.delete(`/quotations/${permanentDeleteTarget.id}/permanent`);
      setPermanentDeleteTarget(null);
      setSuccessToast(res.message || `Quotation ${permanentDeleteTarget.quoteId} permanently deleted.`);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchRecentlyDeleted();
    } catch (err: any) {
      alert(err.message || 'Failed to permanently delete quotation.');
    }
  };

  const fetchQuotationHistory = async (quotationId: string) => {
    if (!canViewQuotationHistory) return;
    setHistoryLoading(true);
    try {
      const res = await api.get(`/quotations/${quotationId}/history`);
      setHistoryList(res.data || []);
    } catch (error) {
      console.error('Failed to fetch quotation history:', error);
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openViewQuotation = async (q: any) => {
    try {
      const res = await api.get(`/quotations/${q.id}`);
      setViewQuotation(res.quotation);
      setViewTab('details');
      setHistoryFilter('ALL');
      if (canViewQuotationHistory) {
        fetchQuotationHistory(q.id);
      } else {
        setHistoryList([]);
      }
    } catch (error) {
      console.error('Failed to view quotation:', error);
    }
  };

  const handleSendQuotation = async (q: any) => {
    try {
      const res = await api.post(`/quotations/${q.id}/send`);
      setSuccessToast(res.message);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchQuotations();
      if (viewQuotation && viewQuotation.id === q.id) {
        setViewQuotation(res.quotation);
        if (canViewQuotationHistory) {
          fetchQuotationHistory(q.id);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send quotation.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 text-xs font-semibold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quotations Management</h2>
          <p className="text-xs text-slate-500">
            Create, review, and confirm client quotations. Confirming automatically generates a Sales Order.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Quotation
        </button>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-3 sm:px-4 rounded-xl shadow-xs gap-1 sm:gap-2 overflow-x-auto">
        <button
          onClick={() => setNavTab('ALL')}
          className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
            navTab === 'ALL'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>All Quotations</span>
        </button>

        <button
          onClick={() => setNavTab('Pending')}
          className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
            navTab === 'Pending'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Pending</span>
        </button>

        <button
          onClick={() => setNavTab('Confirmed')}
          className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
            navTab === 'Confirmed'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Confirmed</span>
        </button>

        <button
          onClick={() => setNavTab('Rejected')}
          className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
            navTab === 'Rejected'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>Rejected</span>
        </button>

        {canViewQuotationHistory && (
          <button
            onClick={() => setNavTab('History')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              navTab === 'History'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        )}

        {canAccessRecentlyDeleted && (
          <button
            onClick={() => setNavTab('Recently Deleted')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              navTab === 'Recently Deleted'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Recently Deleted</span>
            {recentlyDeletedList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                {recentlyDeletedList.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ACTIVE QUOTATIONS SECTION (All, Pending, Confirmed, Rejected) */}
      {(navTab === 'ALL' || navTab === 'Pending' || navTab === 'Confirmed' || navTab === 'Rejected') && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearch} className="flex-1 w-full relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Quotation ID, Customer Name, or Customer ID..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  if (['ALL', 'Pending', 'Confirmed', 'Rejected'].includes(e.target.value)) {
                    setNavTab(e.target.value as any);
                  }
                }}
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending (Under Review)</option>
                <option value="Confirmed">Confirmed (Order Generated)</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Quotations Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3 text-left">Quotation ID</th>
                    <th className="px-5 py-3 text-left">Customer</th>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Products</th>
                    <th className="px-5 py-3 text-left">Total Amount</th>
                    <th className="px-5 py-3 text-left">Salesperson</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                        Loading quotations...
                      </td>
                    </tr>
                  ) : quotations.length > 0 ? (
                    quotations.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-blue-600">{q.quoteId}</td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">{q.customer?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{q.customer?.customerId}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {new Date(q.quoteDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-700">
                          {q.numberOfProducts} item(s)
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-900">
                          ₹{q.grandTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{q.salesperson}</td>
                        <td className="px-5 py-3">
                          <StatusBadge status={q.status} />
                          {q.salesOrderId && (
                            <span className="block text-[10px] font-mono text-blue-600 font-bold mt-0.5">
                              Linked: {q.salesOrderId}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right space-x-1.5 whitespace-nowrap">
                          {/* View Button */}
                          <button
                            onClick={() => openViewQuotation(q)}
                            title="View Quotation"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Send Button */}
                          {q.status === 'Pending' && (
                            <button
                              onClick={() => handleSendQuotation(q)}
                              title={q.sentAt ? "Quotation already sent (Click to record sending again)" : "Send Quotation to Client"}
                              className={`p-1.5 rounded transition-colors ${
                                q.sentAt
                                  ? 'text-sky-600 hover:text-sky-700 hover:bg-sky-50'
                                  : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Approval Workflow Buttons (Manager & HOD only) */}
                          {canConfirmQuotation && q.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => setConfirmTarget(q)}
                                title="Confirm Quotation -> Create Sales Order"
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRejectTarget(q)}
                                title="Reject Quotation"
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Delete (Soft Delete: Move to Recently Deleted) */}
                          {canConfirmQuotation && (
                            <button
                              onClick={() => setDeleteTarget(q)}
                              title="Move to Recently Deleted"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                        No quotations match the specified filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL QUOTATION HISTORY VIEW */}
      {navTab === 'History' && canViewQuotationHistory && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchGlobalHistory();
              }}
              className="flex-1 w-full relative"
            >
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={globalHistorySearch}
                onChange={(e) => setGlobalHistorySearch(e.target.value)}
                placeholder="Search activity by Quotation ID, Customer, User, or Description..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </form>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center">
                <Filter className="w-3 h-3 mr-1 text-slate-400" /> Filter Action:
              </span>
              {['ALL', 'Created', 'Modified', 'Sent', 'Confirmed', 'Rejected', 'Quotation Restored', 'Quotation Deleted', 'Sales Order Created'].map((act) => (
                <button
                  key={act}
                  onClick={() => setGlobalHistoryFilter(act)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    globalHistoryFilter === act
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {act === 'ALL' ? 'All Activities' : act}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            {globalHistoryLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Clock className="w-6 h-6 mx-auto animate-spin text-indigo-500 mb-2" />
                <p>Loading quotation activities...</p>
              </div>
            ) : globalHistory.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {globalHistory.map((h: any, idx: number) => {
                  let badgeStyle = 'bg-blue-100 text-blue-700 border-blue-200';
                  let dotColor = 'bg-blue-600 text-blue-600 ring-blue-100';

                  if (h.action === 'Confirmed') {
                    badgeStyle = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                    dotColor = 'bg-emerald-600 text-emerald-600 ring-emerald-100';
                  } else if (h.action === 'Sales Order Created') {
                    badgeStyle = 'bg-indigo-100 text-indigo-700 border-indigo-200';
                    dotColor = 'bg-indigo-600 text-indigo-600 ring-indigo-100';
                  } else if (h.action === 'Rejected' || h.action === 'Quotation Deleted') {
                    badgeStyle = 'bg-rose-100 text-rose-700 border-rose-200';
                    dotColor = 'bg-rose-600 text-rose-600 ring-rose-100';
                  } else if (h.action === 'Quotation Restored') {
                    badgeStyle = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                    dotColor = 'bg-emerald-600 text-emerald-600 ring-emerald-100';
                  } else if (h.action === 'Modified') {
                    badgeStyle = 'bg-amber-100 text-amber-700 border-amber-200';
                    dotColor = 'bg-amber-500 text-amber-500 ring-amber-100';
                  } else if (h.action === 'Sent') {
                    badgeStyle = 'bg-sky-100 text-sky-700 border-sky-200';
                    dotColor = 'bg-sky-500 text-sky-500 ring-sky-100';
                  }

                  return (
                    <div key={h.id || idx} className="relative">
                      <div className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full ${dotColor} ring-4 bg-white border-2 border-current`} />
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 hover:bg-slate-100/70 transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeStyle}`}>
                              {h.action}
                            </span>
                            {h.quotation && (
                              <span className="font-mono font-bold text-blue-600 text-xs">
                                {h.quotation.quoteId} {h.quotation.customer?.name ? `(${h.quotation.customer.name})` : ''}
                              </span>
                            )}
                            <span className="text-slate-600 text-xs font-semibold">
                              • By {h.userName} ({h.userRole})
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {new Date(h.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(h.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {h.description && (
                          <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
                            {h.description}
                          </p>
                        )}
                        {h.reason && (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] italic">
                            Reason: {h.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No quotation activity found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECENTLY DELETED SECTION */}
      {navTab === 'Recently Deleted' && canAccessRecentlyDeleted && (
        <div className="space-y-4">
          {/* Recently Deleted Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchRecentlyDeleted();
              }}
              className="flex-1 w-full relative"
            >
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={deletedSearch}
                onChange={(e) => setDeletedSearch(e.target.value)}
                placeholder="Search by Quotation ID, Customer Name, Salesperson, or Deleted By..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Original Status Filter */}
              <select
                value={deletedStatusFilter}
                onChange={(e) => setDeletedStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL">All Original Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Rejected">Rejected</option>
              </select>

              {/* Sort Filter */}
              <select
                value={deletedSort}
                onChange={(e) => setDeletedSort(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="recently_deleted">Recently Deleted (Newest First)</option>
                <option value="oldest_deleted">Oldest Deleted</option>
                <option value="highest_amount">Highest Amount</option>
                <option value="lowest_amount">Lowest Amount</option>
              </select>
            </div>
          </div>

          {/* Recently Deleted Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3 text-left">Quotation ID</th>
                    <th className="px-5 py-3 text-left">Customer Name</th>
                    <th className="px-5 py-3 text-left">Quotation Date</th>
                    <th className="px-5 py-3 text-left">Total Amount</th>
                    <th className="px-5 py-3 text-left">Salesperson</th>
                    <th className="px-5 py-3 text-left">Original Status</th>
                    <th className="px-5 py-3 text-left">Deleted By</th>
                    <th className="px-5 py-3 text-left">Deleted Date & Time</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deletedLoading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                        <Clock className="w-5 h-5 mx-auto animate-spin text-slate-400 mb-1" />
                        Loading recently deleted quotations...
                      </td>
                    </tr>
                  ) : recentlyDeletedList.length > 0 ? (
                    recentlyDeletedList.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-slate-800">
                          <span className="line-through text-slate-400 mr-1.5">{q.quoteId}</span>
                          <span className="text-slate-700">{q.quoteId}</span>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">{q.customer?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{q.customer?.customerId}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {new Date(q.quoteDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-900">
                          ₹{q.grandTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{q.salesperson}</td>
                        <td className="px-5 py-3">
                          <StatusBadge status={q.status} />
                          {q.salesOrderId && (
                            <span className="block text-[10px] font-mono text-blue-600 font-bold mt-0.5">
                              Linked: {q.salesOrderId}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            {q.deletedBy || 'System'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                          {q.deletedAt ? (
                            <>
                              <p className="font-medium text-slate-800">
                                {new Date(q.deletedAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(q.deletedAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-3 text-right space-x-1.5 whitespace-nowrap">
                          {/* View Button */}
                          <button
                            onClick={() => openViewQuotation(q)}
                            title="View Quotation Details"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Restore Button (Manager & HOD) */}
                          <button
                            onClick={() => setRestoreTarget(q)}
                            title="Restore Quotation to Active List"
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          {/* Delete Permanently (HOD ONLY) */}
                          {canPermanentDeleteQuotation && (
                            <button
                              onClick={() => {
                                setPermanentDeleteTarget(q);
                                if (q.salesOrderId) {
                                  setPermanentDeleteBlockedSo(q.salesOrderId);
                                } else {
                                  setPermanentDeleteBlockedSo(null);
                                }
                              }}
                              title="Delete Permanently (Cannot be undone)"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                        <div className="max-w-sm mx-auto space-y-2">
                          <Trash2 className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="font-semibold text-slate-700 text-sm">No recently deleted quotations.</p>
                          <p className="text-[11px] text-slate-400">
                            When quotations are deleted, they are safely preserved here where they can be restored or permanently removed.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE QUOTATION MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Sales Quotation</h3>
                <p className="text-xs text-slate-500">
                  New quotations default to <span className="font-semibold text-amber-600">Pending</span> status
                </p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="p-6 space-y-6 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Customer Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Customer *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customerId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    value={validUntilDays}
                    onChange={(e) => setValidUntilDays(Math.max(1, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">Quotation Line Items</h4>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Product</span>
                  </button>
                </div>

                {lineItems.length === 0 ? (
                  <div className="border border-dashed border-slate-300 p-8 text-center rounded-xl bg-slate-50 text-slate-400">
                    No products added yet. Click &quot;Add Product&quot; to build the quotation.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lineItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm grid grid-cols-12 gap-3 items-center"
                      >
                        <div className="col-span-4">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Product</label>
                          <select
                            value={item.productId}
                            onChange={(e) => updateLineItem(idx, 'productId', e.target.value)}
                            className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white text-slate-800"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.productId} - {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-3">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                            className="w-full border border-slate-300 rounded p-1.5 text-xs text-slate-800"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">
                            Qty ({item.unit})
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                            className="w-full border border-slate-300 rounded p-1.5 text-xs text-slate-800"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Price (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(idx, 'unitPrice', e.target.value)}
                            className="w-full border border-slate-300 rounded p-1.5 text-xs text-slate-800"
                          />
                        </div>

                        <div className="col-span-1 text-right flex items-center justify-end pt-3">
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Calculation Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quotation Notes / Terms</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Standard delivery terms, commercial clauses, etc."
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
                  />
                </div>

                <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Discount (%):</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-20 border border-slate-300 rounded px-2 py-0.5 text-right font-semibold"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">GST Tax (%):</span>
                    <input
                      type="number"
                      min="0"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Number(e.target.value))}
                      className="w-20 border border-slate-300 rounded px-2 py-0.5 text-right font-semibold"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-base text-blue-700 font-extrabold">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Generating Quotation...' : 'Save as Pending'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW QUOTATION MODAL */}
      {viewQuotation && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white rounded-t-2xl">
              <div>
                <span className="text-xs uppercase font-bold text-blue-400">Sales Quotation Document</span>
                <h3 className="text-lg font-extrabold tracking-tight">{viewQuotation.quoteId}</h3>
              </div>
              <button onClick={() => setViewQuotation(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs: [Details] [Items] [History] */}
            <div className="flex border-b border-slate-200 px-6 pt-3 bg-slate-50 gap-4">
              <button
                onClick={() => setViewTab('details')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-colors ${
                  viewTab === 'details'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setViewTab('items')}
                className={`pb-2.5 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
                  viewTab === 'items'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Items</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  viewTab === 'items' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {viewQuotation.items?.length || 0}
                </span>
              </button>
              {canViewQuotationHistory && (
                <button
                  onClick={() => {
                    setViewTab('history');
                    fetchQuotationHistory(viewQuotation.id);
                  }}
                  className={`pb-2.5 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
                    viewTab === 'history'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>History</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    viewTab === 'history' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {historyList.length || viewQuotation.history?.length || 0}
                  </span>
                </button>
              )}
            </div>

            {/* TAB 1: DETAILS */}
            {viewTab === 'details' && (
              <div className="p-6 space-y-5 text-xs">
                {/* Client & Metadata */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Client Particulars</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{viewQuotation.customer?.name}</p>
                    <p className="text-slate-500 font-mono">{viewQuotation.customer?.customerId}</p>
                    <p className="text-slate-600 mt-1">{viewQuotation.customer?.address}</p>
                    {viewQuotation.customer?.email && (
                      <p className="text-slate-500 mt-0.5">Email: {viewQuotation.customer?.email}</p>
                    )}
                    {viewQuotation.customer?.phone && (
                      <p className="text-slate-500 mt-0.5">Phone: {viewQuotation.customer?.countryCode ? `${viewQuotation.customer.countryCode} ` : ''}{viewQuotation.customer?.phone}</p>
                    )}
                  </div>
                  <div className="space-y-1 text-right">
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-bold">Quotation Status</span>
                      <div className="mt-0.5">
                        <StatusBadge status={viewQuotation.status} />
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-bold">Quotation Date</span>
                      <p className="font-medium text-slate-800">{new Date(viewQuotation.quoteDate).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-bold">Valid Until</span>
                      <p className="font-medium text-slate-800">{new Date(viewQuotation.validUntil).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* Sent Status Banner */}
                {viewQuotation.sentAt ? (
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 text-sky-900">
                      <Send className="w-4 h-4 text-sky-600 shrink-0" />
                      <div>
                        <p className="font-bold text-xs">Quotation Officially Sent</p>
                        <p className="text-[11px] text-sky-700">
                          Sent on {new Date(viewQuotation.sentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at{' '}
                          {new Date(viewQuotation.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          {viewQuotation.sentByName ? ` by ${viewQuotation.sentByName}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-200 text-sky-800 uppercase">
                      Sent
                    </span>
                  </div>
                ) : viewQuotation.status === 'Pending' ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-800">Quotation Ready to Send</p>
                      <p className="text-[11px] text-slate-500">Record when this quotation is officially delivered to the customer.</p>
                    </div>
                    <button
                      onClick={() => handleSendQuotation(viewQuotation)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Mark as Sent</span>
                    </button>
                  </div>
                ) : null}

                {/* Totals Summary */}
                <div className="flex justify-end">
                  <div className="w-72 space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Products:</span>
                      <span className="font-medium text-slate-800">{viewQuotation.items?.length || 0} line item(s)</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-medium">₹{viewQuotation.subtotal?.toLocaleString('en-IN')}</span>
                    </div>
                    {viewQuotation.discountAmount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount ({viewQuotation.discountPercent}%):</span>
                        <span>-₹{viewQuotation.discountAmount?.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>GST Tax ({viewQuotation.taxPercent}%):</span>
                      <span>₹{viewQuotation.taxAmount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">₹{viewQuotation.grandTotal?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {viewQuotation.notes && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="font-bold text-slate-700 block mb-0.5">Quotation Notes:</span>
                    <p className="text-slate-600">{viewQuotation.notes}</p>
                  </div>
                )}

                {/* Linked Sales Order */}
                {viewQuotation.salesOrderId && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                    <p className="font-bold">Sales Order Link:</p>
                    <p>This quotation was confirmed and converted to Sales Order <strong>{viewQuotation.salesOrderId}</strong>.</p>
                  </div>
                )}

                <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                  <button
                    onClick={() => setViewTab('items')}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    View Itemized Products ({viewQuotation.items?.length || 0}) &rarr;
                  </button>
                  <button
                    onClick={() => setViewQuotation(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ITEMS */}
            {viewTab === 'items' && (
              <div className="p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Itemized Product Lines</h4>
                    <p className="text-[11px] text-slate-500">Products and pricing specifications quoted to the client</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                    {viewQuotation.items?.length || 0} Item(s)
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Product</th>
                        <th className="px-3 py-2.5 text-left">Type / Unit</th>
                        <th className="px-3 py-2.5 text-right">Qty</th>
                        <th className="px-3 py-2.5 text-right">Unit Price</th>
                        <th className="px-3 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewQuotation.items?.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-slate-900">{item.product?.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.product?.productId}</p>
                            {item.description && (
                              <p className="text-[10px] text-slate-500 mt-0.5 italic">{item.description}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                              {item.unit}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-800">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700 font-mono">₹{item.unitPrice?.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-900 font-mono">₹{item.totalPrice?.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setViewTab('details')}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    &larr; Back to Details
                  </button>
                  <div className="text-right">
                    <span className="text-slate-500 mr-2">Grand Total:</span>
                    <span className="text-base font-extrabold text-blue-600 font-mono">₹{viewQuotation.grandTotal?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-100">
                  <button
                    onClick={() => setViewQuotation(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: DEDICATED HISTORY SECTION (Manager & HOD Only) */}
            {viewTab === 'history' && canViewQuotationHistory && (
              <div className="p-6 space-y-4 text-xs">
                {/* History Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Chronological Activity History</h4>
                    <p className="text-[11px] text-slate-500">Complete audit trail of all quotation lifecycle actions (Newest first)</p>
                  </div>
                  <div className="flex items-center space-x-1.5 self-start sm:self-auto">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                      Read-Only Audit Trail
                    </span>
                  </div>
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center">
                    <Filter className="w-3 h-3 mr-1 text-slate-400" /> Filter:
                  </span>
                  {['ALL', 'Created', 'Modified', 'Sent', 'Confirmed', 'Rejected', 'Status Changes'].map((fKey) => (
                    <button
                      key={fKey}
                      onClick={() => setHistoryFilter(fKey)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        historyFilter === fKey
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {fKey === 'ALL' ? 'All Activities' : fKey}
                    </button>
                  ))}
                </div>

                {/* Filtered History Timeline */}
                {(() => {
                  const allHistory = historyList.length > 0 ? historyList : (viewQuotation.history || []);
                  const filtered = allHistory.filter((h: any) => {
                    if (historyFilter === 'ALL') return true;
                    if (historyFilter === 'Status Changes') {
                      return (
                        h.action.toLowerCase().includes('status') ||
                        (h.previousStatus && h.newStatus && h.previousStatus !== h.newStatus)
                      );
                    }
                    return h.action.toLowerCase() === historyFilter.toLowerCase();
                  });

                  if (historyLoading) {
                    return (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        <Clock className="w-6 h-6 mx-auto animate-spin text-blue-500 mb-2" />
                        <p>Loading activity history...</p>
                      </div>
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">No activity matching filter &quot;{historyFilter}&quot;</p>
                        <p className="text-[11px] text-slate-400 mt-1">Try selecting &quot;All Activities&quot; to inspect all recorded events.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {filtered.map((h: any, idx: number) => {
                        let badgeStyle = 'bg-blue-100 text-blue-700 border-blue-200';
                        let dotColor = 'bg-blue-600 text-blue-600 ring-blue-100';

                        if (h.action === 'Confirmed') {
                          badgeStyle = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                          dotColor = 'bg-emerald-600 text-emerald-600 ring-emerald-100';
                        } else if (h.action === 'Sales Order Created') {
                          badgeStyle = 'bg-indigo-100 text-indigo-700 border-indigo-200';
                          dotColor = 'bg-indigo-600 text-indigo-600 ring-indigo-100';
                        } else if (h.action === 'Rejected') {
                          badgeStyle = 'bg-rose-100 text-rose-700 border-rose-200';
                          dotColor = 'bg-rose-600 text-rose-600 ring-rose-100';
                        } else if (h.action === 'Modified') {
                          badgeStyle = 'bg-amber-100 text-amber-700 border-amber-200';
                          dotColor = 'bg-amber-500 text-amber-500 ring-amber-100';
                        } else if (h.action === 'Sent') {
                          badgeStyle = 'bg-sky-100 text-sky-700 border-sky-200';
                          dotColor = 'bg-sky-500 text-sky-500 ring-sky-100';
                        }

                        return (
                          <div key={h.id || idx} className="relative">
                            {/* Timeline bullet ● */}
                            <div
                              className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full ${dotColor} ring-4 bg-white border-2 border-current`}
                            />

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 shadow-2xs hover:bg-slate-100/70 transition-colors">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeStyle}`}>
                                    {h.action}
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    By {h.userRole === 'SALESPERSON' ? 'Salesperson' : h.userRole === 'SALES_MANAGER' ? 'Sales Manager' : 'HOD'} — {h.userName}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {new Date(h.createdAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}{' '}
                                  at{' '}
                                  {new Date(h.createdAt).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              {/* Status Transition Tag */}
                              {h.previousStatus && h.newStatus && h.previousStatus !== h.newStatus && (
                                <div className="inline-flex items-center space-x-1.5 text-[10px] font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                                  <span>Status:</span>
                                  <span className="font-bold">{h.previousStatus}</span>
                                  <span>&rarr;</span>
                                  <span className="font-bold text-blue-700">{h.newStatus}</span>
                                </div>
                              )}

                              {/* Description */}
                              {h.description && (
                                <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
                                  {h.description}
                                </p>
                              )}

                              {/* Rejection Reason Card */}
                              {h.reason && (
                                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] mt-1 space-y-0.5">
                                  <span className="font-bold text-[10px] uppercase tracking-wider text-rose-700 block">
                                    Rejection Reason:
                                  </span>
                                  <p className="italic">&ldquo;{h.reason}&rdquo;</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 italic">
                    Quotation history is permanent and read-only for audit compliance.
                  </p>
                  <button
                    onClick={() => setViewQuotation(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM QUOTATION MODAL */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">Confirm Quotation {confirmTarget.quoteId}?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Confirming this quotation will officially mark it as <strong className="text-emerald-600">Confirmed</strong> and automatically generate an active <strong>Sales Order (SO-XXXXX)</strong> in the Sales module.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900">{confirmTarget.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-bold text-emerald-700">₹{confirmTarget.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Confirm & Create Sales Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT QUOTATION MODAL */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">Reject Quotation {rejectTarget.quoteId}?</h4>
              <p className="text-xs text-slate-500 mt-1">
                A rejected quotation will be marked as <strong className="text-rose-600">Rejected</strong> and will <strong>never become a sales order</strong> nor contribute to sales revenue.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block font-semibold text-slate-700">
                Rejection Reason / Client Feedback (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Budget constraints, selected competing proposal, or client withdrew requirement..."
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Reject Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE QUOTATION MODAL (Soft Delete) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Move to Recently Deleted?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete quotation <strong>{deleteTarget.quoteId}</strong>? It will be moved to <strong>Recently Deleted</strong> and can be restored later by a Sales Manager or HOD.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Move to Recently Deleted
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE QUOTATION MODAL */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">
                Restore Quotation {restoreTarget.quoteId}?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to restore quotation <strong>{restoreTarget.quoteId}</strong>? This will return it to the active quotations list with its original status (<span className="font-semibold text-slate-800">{restoreTarget.status}</span>) and preserve all items, pricing, and history.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900">{restoreTarget.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-bold text-emerald-700">₹{restoreTarget.grandTotal?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Original Status:</span>
                <span className="font-semibold text-blue-600">{restoreTarget.status}</span>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setRestoreTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Quotation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE QUOTATION MODAL (HOD ONLY) */}
      {permanentDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            {permanentDeleteBlockedSo ? (
              <div className="space-y-3">
                <div className="text-center">
                  <h4 className="text-base font-bold text-rose-700">Permanent Deletion Blocked</h4>
                  <p className="text-xs text-slate-600 mt-2">
                    This quotation is linked to Sales Order <strong>{permanentDeleteBlockedSo}</strong>. Permanent deletion is not allowed while this relationship exists.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 space-y-1">
                  <p className="font-bold flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    Referential Integrity Protected
                  </p>
                  <p>
                    Sales orders require their originating quotation for operational and audit compliance. The quotation will remain safely in Recently Deleted.
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setPermanentDeleteTarget(null);
                      setPermanentDeleteBlockedSo(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Understood / Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-base font-bold text-slate-900">
                    Permanently Delete Quotation {permanentDeleteTarget.quoteId}?
                  </h4>
                  <p className="text-xs text-rose-600 font-semibold mt-1">
                    Are you sure you want to permanently delete this quotation? This action cannot be undone.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    All line items and activity logs associated with this quotation will be permanently purged from the database.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quotation ID:</span>
                    <span className="font-bold font-mono text-slate-800">{permanentDeleteTarget.quoteId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-semibold text-slate-900">{permanentDeleteTarget.customer?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount:</span>
                    <span className="font-bold text-slate-900">₹{permanentDeleteTarget.grandTotal?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setPermanentDeleteTarget(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePermanentDelete}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
