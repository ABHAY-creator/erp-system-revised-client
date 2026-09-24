import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const ProductsPage: React.FC = () => {
  const { canManageProducts, canDeleteProduct } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    description: '',
    productType: 'Single',
    unit: 'PCS',
    pairQuantity: 2,
    boxQuantity: 10,
    bundleQuantity: 50,
    sellingPrice: '',
    status: 'Active',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = `?search=${encodeURIComponent(search)}`;
      if (typeFilter !== 'ALL') query += `&productType=${typeFilter}`;
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;

      const res = await api.get(`/products${query}`);
      setProducts(res.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [typeFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedProduct(null);
    setFormData({
      name: '',
      image: '',
      description: '',
      productType: 'Single',
      unit: 'PCS',
      pairQuantity: 2,
      boxQuantity: 10,
      bundleQuantity: 50,
      sellingPrice: '',
      status: 'Active',
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setModalMode('edit');
    setSelectedProduct(p);
    setFormData({
      name: p.name,
      image: p.image || '',
      description: p.description || '',
      productType: p.productType,
      unit: p.unit,
      pairQuantity: p.pairQuantity || 2,
      boxQuantity: p.boxQuantity || 10,
      bundleQuantity: p.bundleQuantity || 50,
      sellingPrice: String(p.sellingPrice),
      status: p.status,
      notes: p.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openViewModal = (p: any) => {
    setModalMode('view');
    setSelectedProduct(p);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sellingPrice) {
      setFormError('Product Name and Selling Price are required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (modalMode === 'create') {
        await api.post('/products', formData);
      } else if (modalMode === 'edit') {
        await api.put(`/products/${selectedProduct.id}`, formData);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/products/${deleteId}`);
      setDeleteId(null);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Product Master Catalogue</h2>
          <p className="text-xs text-slate-500">
            Authoritative sales product catalogue (Independent of warehouse stock)
          </p>
        </div>
        {canManageProducts && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Master Product
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Product ID, Name, or Description..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="Single">Single (1 unit)</option>
            <option value="Pair">Pair (2 units)</option>
            <option value="Box">Box</option>
            <option value="Bundle">Bundle</option>
            <option value="Custom">Custom</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3 text-left">Product ID</th>
                <th className="px-5 py-3 text-left">Product Name</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Unit</th>
                <th className="px-5 py-3 text-left">Selling Price</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading products...
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{p.productId}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center space-x-3">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{p.name}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{p.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {p.productType}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-600">{p.unit}</td>
                    <td className="px-5 py-3 font-bold text-slate-900">₹{p.sellingPrice.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button
                        onClick={() => openViewModal(p)}
                        title="View details"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canManageProducts && (
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit product"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDeleteProduct && (
                        <button
                          onClick={() => setDeleteId(p.id)}
                          title="Delete product"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No products match the specified criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit / View Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {modalMode === 'create'
                  ? 'Add Product Master'
                  : modalMode === 'edit'
                  ? `Edit ${selectedProduct?.productId}`
                  : `Product ${selectedProduct?.productId}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="p-6 space-y-4 text-xs">
                {selectedProduct?.image && (
                  <img
                    src={selectedProduct.image}
                    alt=""
                    className="w-full h-44 object-cover rounded-xl border border-slate-200"
                  />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Product ID</span>
                    <p className="font-mono font-bold text-sm text-blue-600">{selectedProduct?.productId}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Status</span>
                    <p className="mt-0.5">
                      <StatusBadge status={selectedProduct?.status} />
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Product Name</span>
                    <p className="font-semibold text-slate-900 text-sm">{selectedProduct?.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Type</span>
                    <p className="font-medium text-slate-800">{selectedProduct?.productType}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Unit</span>
                    <p className="font-medium text-slate-800">{selectedProduct?.unit}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Selling Price</span>
                    <p className="font-bold text-emerald-700 text-sm">
                      ₹{selectedProduct?.sellingPrice?.toLocaleString('en-IN')}
                    </p>
                  </div>
                  {selectedProduct?.productType === 'Pair' && (
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-bold">Pair Units</span>
                      <p className="font-medium text-slate-800">{selectedProduct?.pairQuantity} units</p>
                    </div>
                  )}
                  {selectedProduct?.productType === 'Box' && (
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-bold">Box Packaging</span>
                      <p className="font-medium text-slate-800">{selectedProduct?.boxQuantity} units / box</p>
                    </div>
                  )}
                  {selectedProduct?.productType === 'Bundle' && (
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-bold">Bundle Packaging</span>
                      <p className="font-medium text-slate-800">{selectedProduct?.bundleQuantity} units / bundle</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Description</span>
                    <p className="text-slate-600 mt-0.5">{selectedProduct?.description || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Notes</span>
                    <p className="text-slate-600 mt-0.5">{selectedProduct?.notes || 'None'}</p>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Architectural Ceramic Tile"
                    className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Product Type</label>
                    <select
                      value={formData.productType}
                      onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Single">Single (1 unit)</option>
                      <option value="Pair">Pair (2 units)</option>
                      <option value="Box">Box (Carton)</option>
                      <option value="Bundle">Bundle (Pack)</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PCS">PCS</option>
                      <option value="PAIR">PAIR</option>
                      <option value="BOX">BOX</option>
                      <option value="BUNDLE">BUNDLE</option>
                      <option value="MTR">MTR</option>
                      <option value="KG">KG</option>
                      <option value="SET">SET</option>
                    </select>
                  </div>
                </div>

                {formData.productType === 'Box' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Box Quantity (units per box)</label>
                    <input
                      type="number"
                      value={formData.boxQuantity}
                      onChange={(e) => setFormData({ ...formData, boxQuantity: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {formData.productType === 'Bundle' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bundle Quantity (units per bundle)</label>
                    <input
                      type="number"
                      value={formData.bundleQuantity}
                      onChange={(e) => setFormData({ ...formData, bundleQuantity: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      placeholder="e.g. 1450"
                      className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Image URL</label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                    className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Product' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Confirm Deletion</h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete this master product? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
