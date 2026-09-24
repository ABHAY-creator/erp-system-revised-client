import React from 'react';
import { Menu, Bell, Search, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  setMobileOpen: (open: boolean) => void;
  title: string;
}

export const Navbar: React.FC<NavbarProps> = ({ setMobileOpen, title }) => {
  const { user } = useAuth();

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'HOD':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'SALES_MANAGER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'SALESPERSON':
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Left Title & Mobile Toggle */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{title}</h1>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Department notification alert indicator */}
        <div className="relative">
          <button
            title="Notifications"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
          </button>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-slate-200" />

        {/* User Role & Name */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-slate-900 leading-tight">{user?.name || 'Authorized User'}</p>
            <div className="flex justify-end mt-0.5">
              <span
                className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getRoleBadgeStyle(
                  user?.role
                )}`}
              >
                <Shield className="w-2.5 h-2.5 mr-1" />
                {user?.role === 'SALES_MANAGER' ? 'Sales Manager' : user?.role || 'Salesperson'}
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
            <UserIcon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};
