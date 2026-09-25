import React, { useEffect, useState, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Phone,
  Mail,
  MapPin,
  FileText,
  ShoppingCart,
  ChevronDown,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

interface CountryCodeOption {
  name: string;
  code: string;
  flag: string;
}

const COUNTRY_CODES: CountryCodeOption[] = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'Qatar', code: '+974', flag: '🇶🇦' },
  { name: 'Kuwait', code: '+965', flag: '🇰🇼' },
  { name: 'Oman', code: '+968', flag: '🇴🇲' },
  { name: 'Bahrain', code: '+973', flag: '🇧🇭' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
];

export const CustomersPage: React.FC = () => {
  const { user, isHOD, isManager, isSalesperson } = useAuth();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [profileCustomer, setProfileCustomer] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    countryCode: '+91',
    phone: '',
    address: '',
    notes: '',
    status: 'Active',
  });
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const countryPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryPickerRef.current && !countryPickerRef.current.contains(e.target as Node)) {
        setCountryPickerOpen(false);
      }
    };
    if (countryPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [countryPickerOpen]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let query = `?search=${encodeURIComponent(search)}`;
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;
      const res = await api.get(`/customers${query}`);
      setCustomers(res.data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedCustomer(null);
    setFormData({
      name: '',
      email: '',
      countryCode: '+91',
      phone: '',
      address: '',
      notes: '',
      status: 'Active',
    });
    setFormError(null);
    setCountryPickerOpen(false);
    setCountrySearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setModalMode('edit');
    setSelectedCustomer(c);
    setFormData({
      name: c.name,
      email: c.email || '',
      countryCode: c.countryCode || '+91',
      phone: c.phone || '',
      address: c.address,
      notes: c.notes || '',
      status: c.status,
    });
    setFormError(null);
    setCountryPickerOpen(false);
    setCountrySearch('');
    setIsModalOpen(true);
  };

  const openProfile = async (c: any) => {
    try {
      const res = await api.get(`/customers/${c.id}`);
      setProfileCustomer(res.customer);
    } catch (error) {
      console.error('Failed to load customer profile:', error);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) {
      setFormError('Customer Name and Full Address are required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (modalMode === 'create') {
        const { status, ...createPayload } = formData;
        await api.post('/customers', createPayload);
        setSuccessToast(`Customer created successfully.`);
      } else {
        await api.put(`/customers/${selectedCustomer.id}`, formData);
        setSuccessToast(`Customer updated successfully.`);
      }
      setTimeout(() => setSuccessToast(null), 3500);
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (customerId: string, newStatus: string) => {
    try {
      // Optimistic update
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, status: newStatus } : c))
      );
      const res = await api.patch(`/customers/${customerId}/status`, { status: newStatus });
      setSuccessToast(res.message);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update customer status.');
      fetchCustomers();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/customers/${deleteTarget.id}`);
      setDeleteTarget(null);
      setSuccessToast(`Customer deleted.`);
      setTimeout(() => setSuccessToast(null), 3000);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer.');
    }
  };

  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.includes(countrySearch)
  );

  const selectedCountry =
    COUNTRY_CODES.find((c) => c.code === formData.countryCode) || COUNTRY_CODES[0];

  const formatPhoneNumber = (countryCode: string | undefined, phone: string | undefined) => {
    if (!phone) return null;
    const cleanPhone = phone.trim();
    if (cleanPhone.startsWith('+')) return cleanPhone;
    return `${countryCode || '+91'} ${cleanPhone}`;
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

      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Directory</h2>
          <p className="text-xs text-slate-500">
            Registered commercial clients, active status management, and commercial records
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Customer
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
            placeholder="Search by Customer ID, Name, Email, or Phone..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="Active">Active Customers</option>
            <option value="Inactive">Inactive Customers</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3 text-left">Customer ID</th>
                <th className="px-5 py-3 text-left">Customer Name</th>
                <th className="px-5 py-3 text-left">Contact Info</th>
                <th className="px-5 py-3 text-left">Address</th>
                <th className="px-5 py-3 text-left">Orders</th>
                <th className="px-5 py-3 text-left">Total Sales</th>
                <th className="px-5 py-3 text-left">Account Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{c.customerId}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-5 py-3 space-y-0.5">
                      {c.email && (
                        <div className="flex items-center text-slate-500">
                          <Mail className="w-3 h-3 mr-1 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center text-slate-600 font-medium">
                          <Phone className="w-3 h-3 mr-1 text-slate-400" />
                          <span>{formatPhoneNumber(c.countryCode, c.phone)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{c.address}</td>
                    <td className="px-5 py-3 font-semibold text-slate-800">{c.totalOrders} order(s)</td>
                    <td className="px-5 py-3 font-bold text-slate-900">₹{c.totalSales.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3">
                      {/* Interactive In-List Status Control (Requirement 3) */}
                      <select
                        value={c.status}
                        onChange={(e) => handleStatusChange(c.id, e.target.value)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-all shadow-xs ${
                          c.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <option value="Active">● Active</option>
                        <option value="Inactive">○ Inactive</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openProfile(c)}
                        title="View Customer Profile"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(isManager || isHOD) && (
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Customer"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {isHOD && (
                        <button
                          onClick={() => setDeleteTarget(c)}
                          title="Delete Customer"
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
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No customers found matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {modalMode === 'create' ? 'Add New Customer' : `Edit ${selectedCustomer?.customerId}`}
                </h3>
                {modalMode === 'create' && (
                  <p className="text-[11px] text-slate-400">New customer will be created in Active status automatically</p>
                )}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Customer Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex Horizon Developers Ltd"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="procurement@company.com"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* SEARCHABLE COUNTRY CODE + PHONE INPUT (Requirement 4) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <div className="flex rounded-lg shadow-2xs">
                  {/* Country Code Trigger & Dropdown */}
                  <div className="relative shrink-0" ref={countryPickerRef}>
                    <button
                      type="button"
                      onClick={() => setCountryPickerOpen(!countryPickerOpen)}
                      className="h-full px-3 py-2 border border-r-0 border-slate-300 rounded-l-lg bg-slate-50 hover:bg-slate-100 flex items-center space-x-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 z-10"
                    >
                      <span className="text-sm">{selectedCountry.flag}</span>
                      <span>{selectedCountry.code}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {countryPickerOpen && (
                      <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="p-2 border-b border-slate-100 bg-slate-50">
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Search country or code..."
                            className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                          {filteredCountries.map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, countryCode: c.code });
                                setCountryPickerOpen(false);
                                setCountrySearch('');
                              }}
                              className={`w-full px-3 py-1.5 flex items-center justify-between text-left text-xs hover:bg-blue-50 transition-colors ${
                                formData.countryCode === c.code ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-base">{c.flag}</span>
                                <span>{c.name}</span>
                              </div>
                              <span className="font-mono text-slate-500 text-[11px]">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phone input */}
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="98765 43210"
                    className="flex-1 min-w-0 border border-slate-300 rounded-r-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Formatted as: <strong className="font-mono">{formatPhoneNumber(formData.countryCode, formData.phone) || `${formData.countryCode} ...`}</strong>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Shipping & Billing Address *</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Building, City, State, PIN..."
                  className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {!isSalesperson && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commercial Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Credit terms, special billing conditions..."
                    className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* In Edit mode only: status can be adjusted if needed */}
              {modalMode === 'edit' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}

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
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Customer' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER PROFILE MODAL */}
      {profileCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white rounded-t-2xl">
              <div>
                <span className="text-xs uppercase font-bold text-blue-400">Customer Profile</span>
                <h3 className="text-lg font-extrabold tracking-tight">{profileCustomer.name}</h3>
                <span className="font-mono text-xs text-slate-400">{profileCustomer.customerId}</span>
              </div>
              <button onClick={() => setProfileCustomer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Confirmed Sales</span>
                  <span className="text-base font-extrabold text-blue-800">
                    ₹{profileCustomer.totalSales.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Orders Executed</span>
                  <span className="text-base font-extrabold text-emerald-800">{profileCustomer.totalOrders}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Account Status</span>
                  <div className="mt-1">
                    <StatusBadge status={profileCustomer.status} />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h4 className="font-bold text-slate-800">Contact & Address</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                    <span>{profileCustomer.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                    <span>{formatPhoneNumber(profileCustomer.countryCode, profileCustomer.phone) || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Address</span>
                    <span>{profileCustomer.address}</span>
                  </div>
                </div>
              </div>

              {/* Recent Orders History */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center space-x-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                  <span>Recent Sales Orders</span>
                </h4>
                {profileCustomer.salesOrders && profileCustomer.salesOrders.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-100 text-[11px]">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="px-3 py-1.5 text-left">Order ID</th>
                          <th className="px-3 py-1.5 text-left">Date</th>
                          <th className="px-3 py-1.5 text-left">Amount</th>
                          <th className="px-3 py-1.5 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profileCustomer.salesOrders.map((o: any) => (
                          <tr key={o.id}>
                            <td className="px-3 py-1.5 font-mono text-blue-600 font-bold">{o.soId}</td>
                            <td className="px-3 py-1.5 text-slate-500">
                              {new Date(o.orderDate).toLocaleDateString('en-IN')}
                            </td>
                            <td className="px-3 py-1.5 font-bold text-slate-900">
                              ₹{o.totalAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-1.5">
                              <StatusBadge status={o.orderStatus} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No sales orders on record yet.</p>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setProfileCustomer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Delete Customer Record?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete customer <strong>{deleteTarget.name}</strong>?
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
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
