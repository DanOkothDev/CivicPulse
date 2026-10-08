import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map as MapIcon,
  PlusCircle,
  Bell,
  User,
} from 'lucide-react';

export default function MobileNavigation() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 h-16 px-3 flex items-center justify-around z-30 shadow-lg">
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
            isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`
        }
      >
        <LayoutDashboard className="w-5 h-5" />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/map"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
            isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`
        }
      >
        <MapIcon className="w-5 h-5" />
        <span>Map</span>
      </NavLink>

      {/* Prominent Center Report Button */}
      <NavLink
        to="/report/new"
        className="flex flex-col items-center justify-center -mt-5"
      >
        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 ring-4 ring-white active:scale-95 transition-transform">
          <PlusCircle className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold text-blue-600 mt-1">Report</span>
      </NavLink>

      <NavLink
        to="/notifications"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-semibold relative transition-colors ${
            isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`
        }
      >
        <Bell className="w-5 h-5" />
        <span>Alerts</span>
        <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
            isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`
        }
      >
        <User className="w-5 h-5" />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}
