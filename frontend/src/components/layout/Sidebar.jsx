import React, { useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  Map as MapIcon,
  FileText,
  CheckSquare,
  BarChart3,
  Building,
  User,
  Bell,
  Home,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";

/*
  Theme (taken from reference landing page)
  mint background   #E6F5F8
  light cyan        #7FD0E0
  bright cyan       #38C6DC
  mid blue          #1B8FC0
  deep blue         #0B5A9C
  soft grey text    #5F5F5F
*/

const GRADIENT = "bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C]";

export default function Sidebar({ isOpen, onClose }) {
  const { user, role } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  // Navigation definition strictly tailored to the 4 roles
  const isResident = role === "resident";
  const isVerifier = role === "verifier";
  const isAuthority = role === "authority";
  const isAdmin = role === "admin";

  // Load Montserrat font dynamically
  useEffect(() => {
    if (document.getElementById("montserrat-font")) return;
    const link = document.createElement("link");
    link.id = "montserrat-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#0B5A9C]/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        style={{
          fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
        }}
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#E6F5F8] border-r border-[#cfe9f0] z-50 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 shadow-[4_0_25px_-10px_rgba(11,90,156,0.15)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto p-4 scrollbar-none">
          {/* Brand Header */}
          <Link
            to={
              isAdmin
                ? "/admin"
                : isAuthority
                  ? "/authority/assigned"
                  : isVerifier
                    ? "/verifier/queue"
                    : "/dashboard"
            }
            className="flex items-center gap-3 px-3 py-3 mb-4 rounded-2xl bg-white/80 border border-[#cfe9f0] hover:bg-white transition-colors shadow-2xs"
          >
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-[#5F5F5F] text-base tracking-tight">
                  Civic<span className="text-[#0B5A9C]">Pulse</span>
                </span>
              </div>
              <p className="text-[10px] font-extrabold text-[#1B8FC0] uppercase tracking-wider">
                Your City, Your Voice, Your Impact.
              </p>
            </div>
          </Link>

          {/* Role Badge Indicator */}
          <div className="mb-4 px-3 py-2 bg-white/70 border border-[#7FD0E0]/60 rounded-2xl flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5F5F5F]">
              Current Role
            </span>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize ${
                isAdmin
                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                  : isAuthority
                    ? "bg-sky-100 text-[#0B5A9C] border border-sky-200"
                    : isVerifier
                      ? "bg-teal-100 text-teal-800 border border-teal-200"
                      : "bg-cyan-100 text-cyan-900 border border-cyan-200"
              }`}
            >
              {role || "Guest"}
            </span>
          </div>

          {/* Top Link: Home */}
          <div className="mb-4 px-1">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-[#5F5F5F] hover:bg-white hover:text-[#0B5A9C] transition-colors border border-[#cfe9f0] bg-white/60 shadow-2xs"
            >
              <Home className="w-4 h-4 shrink-0 text-[#1B8FC0]" />
              <span>Home</span>
            </Link>
          </div>

          {/* 1. RESIDENT ROLE NAVIGATION */}
          {isResident && (
            <div className="mb-6">
              <h5 className="px-3 text-[10px] font-extrabold text-[#1B8FC0] uppercase tracking-wider mb-2">
                Citizen Workspace
              </h5>
              <nav className="space-y-1">
                <NavLink
                  to="/dashboard"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
              <h5 className="px-3 text-[10px] font-extrabold text-[#1B8FC0] uppercase tracking-wider mb-2">
                Verifier Triage Workspace
              </h5>
              <nav className="space-y-1">
                <NavLink
                  to="/verifier/queue"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>Triage Queue</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#7FD0E0]/40 text-[#0B5A9C] font-extrabold uppercase">
                    Queue
                  </span>
                </NavLink>

                <NavLink
                  to="/community-map"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
              <h5 className="px-3 text-[10px] font-extrabold text-[#1B8FC0] uppercase tracking-wider mb-2">
                Authority Field Desk
              </h5>
              <nav className="space-y-1">
                <NavLink
                  to="/authority/assigned"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>Assigned Incidents</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-100 text-[#0B5A9C] font-extrabold uppercase">
                    Field
                  </span>
                </NavLink>

                <NavLink
                  to="/analytics"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
              <h5 className="px-3 text-[10px] font-extrabold text-[#1B8FC0] uppercase tracking-wider mb-2">
                City Administration & Governance
              </h5>
              <nav className="space-y-1">
                <NavLink
                  to="/admin"
                  onClick={onClose}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? `${GRADIENT} text-white shadow-md`
                        : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
            <h5 className="px-3 text-[10px] font-extrabold text-[#1B8FC0] uppercase tracking-wider mb-2">
              User Account
            </h5>
            <nav className="space-y-1">
              <NavLink
                to="/profile"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? `${GRADIENT} text-white shadow-md`
                      : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
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
                  `flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? `${GRADIENT} text-white shadow-md`
                      : "text-[#5F5F5F] hover:bg-white/80 hover:text-[#0B5A9C]"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 shrink-0" />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="min-w-4 h-4 rounded-full bg-rose-500 px-1 text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </NavLink>
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}
