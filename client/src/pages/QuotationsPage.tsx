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
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const QuotationsPage: React.FC = () => {
  const { user, canConfirmQuotation, isSalesperson } = useAuth();

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
    fetchQuotations();
    loadDependencies();
  }, [statusFilter]);

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
      const res = await api.post(`/quotations/${rejectTarget.id}/reject`);
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
      await api.delete(`/quotations/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to delete quotation.');
    }
  };

  const openViewQuotation = async (q: any) => {
    try {
      const res = await api.get(`/quotations/${q.id}`);
      setViewQuotation(res.quotation);
    } catch (error) {
      console.error('Failed to view quotation:', error);
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
            onChange={(e) => setStatusFilter(e.target.value)}
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

                      {/* Delete (Only allowed if not confirmed) */}
                      {canConfirmQuotation && q.status !== 'Confirmed' && (
                        <button
                          onClick={() => setDeleteTarget(q)}
                          title="Delete Quotation"
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

            <div className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Client Particulars</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{viewQuotation.customer?.name}</p>
                  <p className="text-slate-500 font-mono">{viewQuotation.customer?.customerId}</p>
                  <p className="text-slate-600 mt-1">{viewQuotation.customer?.address}</p>
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

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Itemized Products</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">Unit</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewQuotation.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-900">{item.product?.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.product?.productId}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{item.unit}</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-slate-700">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">₹{item.totalPrice.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-medium">₹{viewQuotation.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {viewQuotation.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount ({viewQuotation.discountPercent}%):</span>
                      <span>-₹{viewQuotation.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>GST Tax ({viewQuotation.taxPercent}%):</span>
                    <span>₹{viewQuotation.taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-blue-600">₹{viewQuotation.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {viewQuotation.salesOrderId && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                  <p className="font-bold">Sales Order Link:</p>
                  <p>This quotation was confirmed and converted to Sales Order <strong>{viewQuotation.salesOrderId}</strong>.</p>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setViewQuotation(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
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
            <div className="flex items-center justify-end space-x-3 pt-2">
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

      {/* DELETE QUOTATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Delete Quotation?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete quotation <strong>{deleteTarget.quoteId}</strong>?
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
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
