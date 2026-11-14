import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Map as MapIcon,
  PlusCircle,
  Bell,
  User,
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

export default function MobileNavigation() {
  const { role, user } = useAuth();
  const isNationalAdmin = role === 'admin' && user?.county_id == null;
  const { unreadCount } = useNotifications();
  const homeRoute =
    role === "admin"
      ? "/admin"
      : role === "verifier"
        ? "/verifier/queue"
        : role === "authority"
          ? "/authority/assigned"
          : "/dashboard";

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
    <nav
      style={{
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
      className="lg:hidden fixed bottom-0 inset-x-0 bg-[#E6F5F8]/95 backdrop-blur-md border-t border-[#cfe9f0] h-16 px-3 flex items-center justify-around z-30 shadow-[0_-4px_20px_-5px_rgba(11,90,156,0.15)]"
    >
      <NavLink
        to={homeRoute}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold transition-colors ${
            isActive ? "text-[#0B5A9C]" : "text-[#5F5F5F] hover:text-[#0B5A9C]"
          }`
        }
      >
        <LayoutDashboard className="w-5 h-5" />
        <span>Dashboard</span>
      </NavLink>

      {!isNationalAdmin && <NavLink
        to="/community-map"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold transition-colors ${
            isActive ? "text-[#0B5A9C]" : "text-[#5F5F5F] hover:text-[#0B5A9C]"
          }`
        }
      >
        <MapIcon className="w-5 h-5" />
        <span>Map</span>
      </NavLink>}

      {/* Prominent Center Report Button */}
      {role === 'resident' && <NavLink
        to="/report/new"
        className="flex flex-col items-center justify-center -mt-5 group"
      >
        <div
          className={`w-12 h-12 rounded-full ${GRADIENT} text-white flex items-center justify-center shadow-lg shadow-[#0B5A9C]/30 ring-4 ring-[#E6F5F8] active:scale-95 transition-transform`}
        >
          <PlusCircle className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-extrabold text-[#0B5A9C] mt-1">
          Report
        </span>
      </NavLink>}

      <NavLink
        to="/notifications"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold relative transition-colors ${
            isActive ? "text-[#0B5A9C]" : "text-[#5F5F5F] hover:text-[#0B5A9C]"
          }`
        }
      >
        <Bell className="w-5 h-5" />
        <span>Alerts</span>
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="absolute -top-1 right-0 min-w-4 h-4 rounded-full bg-rose-500 px-1 text-[9px] leading-4 text-white ring-2 ring-[#E6F5F8]"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold transition-colors ${
            isActive ? "text-[#0B5A9C]" : "text-[#5F5F5F] hover:text-[#0B5A9C]"
          }`
        }
      >
        <User className="w-5 h-5" />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}
