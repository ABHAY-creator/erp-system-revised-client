import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  Filter,
  Eye,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  XCircle,
  FileText,
  User,
  X,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const SalesPage: React.FC = () => {
  const { isManager, isHOD } = useAuth();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  // Status Update & View Modals
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [statusUpdateTarget, setStatusUpdateTarget] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('Processing');
  const [statusNotes, setStatusNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = `?search=${encodeURIComponent(search)}`;
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;
      const res = await api.get(`/sales${query}`);
      setOrders(res.data || []);
    } catch (error) {
      console.error('Failed to load sales orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const openStatusUpdate = (order: any) => {
    setStatusUpdateTarget(order);
    setNewStatus(order.orderStatus);
    setStatusNotes('');
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusUpdateTarget) return;

    setUpdating(true);
    try {
      const res = await api.patch(`/sales/${statusUpdateTarget.id}/status`, {
        orderStatus: newStatus,
        notes: statusNotes,
      });

      setStatusUpdateTarget(null);
      setSuccessToast(res.message);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  const openViewOrder = async (order: any) => {
    try {
      const res = await api.get(`/sales/${order.id}`);
      setViewOrder(res.order);
    } catch (error) {
      console.error('Failed to load order details:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 text-xs font-semibold animate-bounce">
          <Check className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Confirmed Sales Orders</h2>
          <p className="text-xs text-slate-500">
            Orders generated from confirmed quotations. These transactions contribute to revenue analytics.
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, Quotation ID, Shipment ID, or Customer..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Order Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Processing">Processing</option>
            <option value="Shipment Sent">Shipment Sent</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3 text-left">Sales Order ID</th>
                <th className="px-5 py-3 text-left">Quote Ref</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Order Date</th>
                <th className="px-5 py-3 text-left">Amount</th>
                <th className="px-5 py-3 text-left">Salesperson</th>
                <th className="px-5 py-3 text-left">Order Status</th>
                <th className="px-5 py-3 text-left">Shipment</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                    Loading sales orders...
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{o.soId}</td>
                    <td className="px-5 py-3 font-mono text-slate-500">{o.quotationId}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{o.customerName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{o.customerId}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(o.orderDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">
                      ₹{o.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{o.salesperson}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.orderStatus} />
                    </td>
                    <td className="px-5 py-3">
                      {o.shipmentId ? (
                        <div>
                          <span className="font-mono text-purple-700 font-bold block">{o.shipmentId}</span>
                          <span className="text-[10px] text-slate-400">{o.shipmentStatus}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not Shipped</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openViewOrder(o)}
                        title="View order details"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {(isManager || isHOD) && (
                        <button
                          onClick={() => openStatusUpdate(o)}
                          title="Update Status / Shipment"
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-semibold rounded text-[11px]"
                        >
                          Update Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                    No confirmed sales orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPDATE STATUS MODAL */}
      {statusUpdateTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Update Status — {statusUpdateTarget.soId}
              </h3>
              <button onClick={() => setStatusUpdateTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Order Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing (Packaging/Preparation)</option>
                  <option value="Shipment Sent">Shipment Sent (Assigns Shipment ID)</option>
                  <option value="Delivered">Delivered (Fulfillment Complete)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {newStatus === 'Shipment Sent' && !statusUpdateTarget.shipmentId && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-800">
                  <p className="font-bold flex items-center space-x-1">
                    <Truck className="w-3.5 h-3.5 mr-1" />
                    <span>Shipment Tracking Allocation</span>
                  </p>
                  <p className="text-[11px] mt-0.5">
                    Transitioning to <strong>Shipment Sent</strong> will automatically assign a unique tracking <strong>SHP-XXXXX</strong> ID to this order.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Notes / Dispatch Remarks</label>
                <textarea
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Optional shipment notes or courier details..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setStatusUpdateTarget(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORDER MODAL */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white rounded-t-2xl">
              <div>
                <span className="text-xs uppercase font-bold text-blue-400">Confirmed Sales Order</span>
                <h3 className="text-lg font-extrabold tracking-tight">{viewOrder.soId}</h3>
              </div>
              <button onClick={() => setViewOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Client Information</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{viewOrder.customer?.name}</p>
                  <p className="text-slate-500 font-mono">{viewOrder.customer?.customerId}</p>
                  <p className="text-slate-600 mt-1">{viewOrder.customer?.address}</p>
                </div>
                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Order Status</span>
                    <div className="mt-0.5">
                      <StatusBadge status={viewOrder.orderStatus} />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Order Date</span>
                    <p className="font-medium text-slate-800">{new Date(viewOrder.orderDate).toLocaleDateString('en-IN')}</p>
                  </div>
                  {viewOrder.shipmentId && (
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-bold">Shipment ID</span>
                      <p className="font-mono font-bold text-purple-700">{viewOrder.shipmentId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Order Line Items</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">Unit</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewOrder.items?.map((item: any) => (
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

              {/* Total Calculation */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{viewOrder.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax:</span>
                    <span>₹{viewOrder.taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                    <span>Total Amount:</span>
                    <span className="text-blue-600">₹{viewOrder.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setViewOrder(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
