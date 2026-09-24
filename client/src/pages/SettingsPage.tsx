import React, { useState } from 'react';
import { Settings, Building, Shield, Check, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const [companyName, setCompanyName] = useState('Enterprise Sales Management Ltd');
  const [taxRate, setTaxRate] = useState(18);
  const [currency, setCurrency] = useState('INR (₹)');
  const [quoteValidity, setQuoteValidity] = useState(30);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Department Settings</h2>
        <p className="text-xs text-slate-500">Configure global sales department parameters and enterprise identity</p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>Department settings successfully saved.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Company Particulars */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Organization Profile</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Trading Entity</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Functional ERP Unit</label>
              <input
                type="text"
                disabled
                value="Commercial Sales & Business Development"
                className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2 text-slate-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Commercial Sales Parameters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Settings className="w-4 h-4 text-purple-600" />
            <span>Sales & Taxation Configuration</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operating Currency</label>
              <input
                type="text"
                value={currency}
                disabled
                className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2 font-semibold text-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default GST Tax (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2 font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard Quote Validity (Days)</label>
              <input
                type="number"
                value={quoteValidity}
                onChange={(e) => setQuoteValidity(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2 font-semibold text-slate-900"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 flex items-start space-x-2 text-[11px]">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Independent Sales System:</strong> Notice that warehouse stock and inventory levels are completely segregated from this sales department ERP per enterprise architecture specifications.
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
