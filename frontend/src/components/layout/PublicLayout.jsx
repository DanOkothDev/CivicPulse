import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export default function PublicLayout() {
  const location = useLocation();
  const isMap = location.pathname.startsWith('/map');

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      <PublicNavbar />
      <main className={`flex-1 ${isMap ? 'p-4 sm:p-6 max-w-7xl w-full mx-auto flex flex-col' : ''}`}>
        <Outlet />
      </main>
      {!isMap && <PublicFooter />}
    </div>
  );
}
