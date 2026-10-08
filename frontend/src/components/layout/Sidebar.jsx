import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Map as MapIcon,
  FileText,
  CheckSquare,
  ShieldAlert,
  BarChart3,
  Building,
  User,
  Bell,
  Sliders,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const residentNav = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Community Map', to: '/map', icon: MapIcon },
    { name: 'My Reports', to: '/my-reports', icon: FileText },
  ];

  const operationsNav = [
    { name: 'Verifier Queue', to: '/verifier/queue', icon: CheckSquare, badge: 'Triage' },
    { name: 'Authority Desk', to: '/authority/assigned', icon: ShieldAlert, badge: 'Ops' },
    { name: 'Analytics & Hotspots', to: '/analytics', icon: BarChart3 },
    { name: 'City Administration', to: '/admin', icon: Building },
  ];

  const profileNav = [
    { name: 'Profile & History', to: '/profile', icon: User },
    { name: 'Notifications', to: '/notifications', icon: Bell, badge: '3' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-slate-200/90 z-50 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto p-4 scrollbar-none">
          {/* Brand header */}
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-2 py-3 mb-4 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">CivicPulse</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Municipal Ops Engine
              </p>
            </div>
          </Link>

          {/* Prominent Action Button: Report Issue */}
          <div className="mb-6 px-1">
            <Link
              to="/report/new"
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md shadow-blue-600/25 hover:shadow-lg transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>Report Issue</span>
              </div>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Section 1: Resident Hub */}
          <div className="mb-6">
            <h5 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Resident Hub
            </h5>
            <nav className="space-y-1">
              {residentNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Section 2: Operations & Oversight */}
          <div className="mb-6">
            <h5 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Operations & Oversight
            </h5>
            <nav className="space-y-1">
              {operationsNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Section 3: Settings & Profile */}
          <div className="mb-4">
            <h5 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Settings & Profile
            </h5>
            <nav className="space-y-1">
              {profileNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Footer Gateway Indicator matching designs */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
            <span>API Gateway Live</span>
          </div>
          <span className="font-mono text-slate-400">v2.4.0</span>
        </div>
      </aside>
    </>
  );
}
