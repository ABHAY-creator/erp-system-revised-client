import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

const pageTitles: { [key: string]: string } = {
  '/dashboard': 'Dashboard Overview',
  '/sales': 'Sales Orders',
  '/products': 'Product Master Catalogue',
  '/quotations': 'Quotations Management',
  '/customers': 'Customer Directory',
  '/reports': 'Sales Performance Reports',
  '/ai-analytics': 'HOD AI Analytics & Business Insights',
  '/users': 'Users & Role Permissions',
  '/audit-logs': 'System Activity Audit Log',
  '/settings': 'Department Settings',
};

export const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentPath = location.pathname;
  const title = pageTitles[currentPath] || 'SalesFlow ERP';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar setMobileOpen={setMobileOpen} title={title} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
