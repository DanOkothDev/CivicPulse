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
  ChevronRight,
  Shield,
  Globe,
  Home,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // Navigation definition strictly tailored to the 4 roles in the PDF
  const isResident = role === 'resident';
  const isVerifier = role === 'verifier';
  const isAuthority = role === 'authority';
  const isAdmin = role === 'admin';

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
            to={
              isAdmin
                ? '/admin'
                : isAuthority
                ? '/authority/assigned'
                : isVerifier
                ? '/verifier/queue'
                : '/dashboard'
            }
            className="flex items-center gap-3 px-2 py-3 mb-4 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <img
              src="/logo.png"
              alt="CivicPulse Logo"
              className="h-11 w-auto object-contain shrink-0 drop-shadow-xs"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 text-lg tracking-tight">Civic<span className="text-blue-600">Pulse</span></span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Municipal Ops Engine
              </p>
            </div>
          </Link>

          {/* Role Badge Indicator */}
          <div className="mb-4 px-2 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Role</span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md capitalize ${
                isAdmin
                  ? 'bg-purple-100 text-purple-800'
                  : isAuthority
                  ? 'bg-blue-100 text-blue-800'
                  : isVerifier
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {role}
            </span>
          </div>

          {/* Top Link: Home */}
          <div className="mb-4 px-1">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-200/60 bg-slate-50/50 shadow-2xs"
            >
              <Home className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Home</span>
            </Link>
          </div>

          {/* 1. RESIDENT ROLE NAVIGATION */}
          {isResident && (
            <div className="mb-6">
              <h5 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Citizen Workspace
              </h5>
              <nav className="space-y-1">
                <NavLink
                  to="/dashboard"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/community-map"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <MapIcon className="w-4 h-4 shrink-0" />
                  <span>Community Map</span>
                </NavLink>

                <NavLink
                  to="/my-reports"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>My Reports</span>
                </NavLink>

                <NavLink
                  to="/report/new"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>Report Issue</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* 2. VERIFIER ROLE NAVIGATION */}
          {isVerifier && (
            <div className="mb-6">
              <h5 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Verifier Triage Workspace
              </h5>
              <nav className="space-y-1">
                <NavLink
                  to="/verifier/queue"
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
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>Triage Queue</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold uppercase">
                    Queue
                  </span>
                </NavLink>

                <NavLink
                  to="/community-map"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <MapIcon className="w-4 h-4 shrink-0" />
                  <span>Spatial Inspection Map</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* 3. AUTHORITY ROLE NAVIGATION */}
          {isAuthority && (
            <div className="mb-6">
              <h5 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Authority Field Desk
              </h5>
              <nav className="space-y-1">
                <NavLink
                  to="/authority/assigned"
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
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>Assigned Incidents</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase">
                    Field
                  </span>
                </NavLink>

                <NavLink
                  to="/analytics"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>Municipal Hotspots</span>
                </NavLink>

                <NavLink
                  to="/community-map"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <MapIcon className="w-4 h-4 shrink-0" />
                  <span>Field Navigation Map</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* 4. ADMIN ROLE NAVIGATION */}
          {isAdmin && (
            <div className="mb-6">
              <h5 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                City Administration & Governance
              </h5>
              <nav className="space-y-1">
                <NavLink
                  to="/admin"
                  onClick={onClose}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <Building className="w-4 h-4 shrink-0" />
                  <span>Admin Dashboard</span>
                </NavLink>

                <NavLink
                  to="/verifier/queue"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <CheckSquare className="w-4 h-4 shrink-0" />
                  <span>Triage & Verification</span>
                </NavLink>

                <NavLink
                  to="/analytics"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>Hotspots & Intelligence</span>
                </NavLink>

                <NavLink
                  to="/community-map"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <MapIcon className="w-4 h-4 shrink-0" />
                  <span>Citywide Map</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* Universal Profile & Notifications */}
          <div className="mb-4">
            <h5 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              User Account
            </h5>
            <nav className="space-y-1">
              <NavLink
                to="/profile"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Profile & Settings</span>
              </NavLink>

              <NavLink
                to="/notifications"
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
                  <Bell className="w-4 h-4 shrink-0" />
                  <span>Notifications</span>
                </div>
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  3
                </span>
              </NavLink>
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}
