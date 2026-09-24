import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Users,
  BarChart3,
  Sparkles,
  ShieldCheck,
  History,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout, isHOD, isManager } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/sales', label: 'Sales', icon: ShoppingCart },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/quotations', label: 'Quotations', icon: FileText },
    { to: '/customers', label: 'Customers', icon: Users },
  ];

  if (isManager || isHOD) {
    navItems.push({ to: '/reports', label: 'Reports', icon: BarChart3 });
  }

  if (isHOD) {
    navItems.push({ to: '/ai-analytics', label: 'AI Analytics', icon: Sparkles });
    navItems.push({ to: '/users', label: 'Users & Permissions', icon: ShieldCheck });
    navItems.push({ to: '/audit-logs', label: 'Audit Logs', icon: History });
  }

  navItems.push({ to: '/settings', label: 'Settings', icon: Settings });

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              S
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">SalesFlow</span>
              <span className="text-xs ml-1.5 px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-400 font-medium">ERP</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Sales Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isAi = item.to === '/ai-analytics';

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive
                      ? isAi
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                        : 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : isAi
                      ? 'text-purple-300 hover:bg-purple-950/40 hover:text-purple-200'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                  }`
                }
              >
                <Icon className={`w-4 h-4 mr-3 shrink-0 ${isAi ? 'text-purple-400 group-hover:text-purple-200' : ''}`} />
                <span className="flex-1">{item.label}</span>
                {isAi && (
                  <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    HOD
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center space-x-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-semibold text-white text-sm border border-slate-600">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">
                {user?.role === 'SALES_MANAGER' ? 'Sales Manager' : user?.role || 'Salesperson'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-900/30 rounded-lg transition-colors border border-rose-900/40"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};
