import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Bell,
  Shield,
  User as UserIcon,
  CheckCheck,
  FileText,
  ShoppingCart,
  Users,
  Package,
  X,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface NavbarProps {
  setMobileOpen: (open: boolean) => void;
  title: string;
}

export const Navbar: React.FC<NavbarProps> = ({ setMobileOpen, title }) => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'QUOTATION':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'SALES':
        return <ShoppingCart className="w-4 h-4 text-emerald-600" />;
      case 'CUSTOMER':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'PRODUCT':
        return <Package className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

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
        {/* Department notification alert button & dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Notifications"
            className={`p-2 rounded-lg relative transition-colors ${
              dropdownOpen
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-slate-300 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Dropdown Panel */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={loading}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors ${
                        n.isRead ? 'hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50/80'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-xs truncate ${
                              n.isRead ? 'font-medium text-slate-800' : 'font-bold text-slate-900'
                            }`}
                          >
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 ml-2" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(n.createdAt)}</span>
                          {n.relatedEntityId && (
                            <>
                              <span>•</span>
                              <span className="font-mono font-medium text-slate-600">
                                {n.relatedEntityId}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p>No notifications yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Operational events will appear here in real-time
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
                <span className="text-[10px] text-slate-500 font-medium">
                  Auto-synced with company database
                </span>
              </div>
            </div>
          )}
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
