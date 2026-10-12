import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavigation from './TopNavigation';
import MobileNavigation from './MobileNavigation';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Desktop & Mobile Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content wrapper with margin for fixed sidebar */}
      <div className="lg:pl-64 flex flex-col min-h-screen flex-1 pb-16 lg:pb-0">
        <TopNavigation onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation />
    </div>
  );
}
