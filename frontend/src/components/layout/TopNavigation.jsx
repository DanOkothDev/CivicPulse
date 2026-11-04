import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  Bell,
  MapPin,
  ChevronDown,
  User,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import SearchBar from "../ui/SearchBar";

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

export default function TopNavigation({ onMenuClick }) {
  const { user, role, logout } = useAuth();
  const toast = useToast();
  const [searchVal, setSearchVal] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

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

  React.useEffect(() => {
    if (user) {
      api.notifications
        .getUnreadCount()
        .then((data) => setUnreadCount(data?.count || 0))
        .catch((error) =>
          toast.error(`Could not load notification count: ${error.message}`),
        );
    }
  }, [user]);

  return (
    <header
      className="sticky top-0 z-30 bg-[#E6F5F8]/95 backdrop-blur-md border-b border-[#cfe9f0] h-16 flex items-center justify-between px-4 sm:px-6 shadow-[0_4px_20px_-10px_rgba(11,90,156,0.15)]"
      style={{
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Left: Mobile hamburger & Search input */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-[#5F5F5F] hover:text-[#0B5A9C] rounded-xl hover:bg-white/80 transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          to="/"
          className="lg:hidden flex items-center gap-2"
          title="CivicPulse Home"
        >
          <img
            src="/logo.png"
            alt="CivicPulse"
            className="h-9 w-auto object-contain drop-shadow-xs"
          />
        </Link>

        <div className="flex-1 max-w-md hidden sm:block">
          <SearchBar
            value={searchVal}
            onChange={setSearchVal}
            onClear={() => setSearchVal("")}
            placeholder="Search incidents, streets..."
          />
        </div>
      </div>

      {/* Right: Service Area Pill, Notifications, and Profile */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Service Area Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white/80 border border-[#7FD0E0] text-[#0B5A9C] rounded-xl text-xs font-extrabold shadow-2xs">
          <MapPin className="w-3.5 h-3.5 text-[#1B8FC0]" />
          <span>
            {user?.area_id == null
              ? "No service area assigned"
              : `Service Area ${user.area_id}`}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#1B8FC0]" />
        </div>

        {/* Notifications Icon with Unread Badge */}
        <Link
          to="/notifications"
          className="relative p-2 text-[#5F5F5F] hover:text-[#0B5A9C] hover:bg-white/80 rounded-xl transition-colors border border-transparent hover:border-[#cfe9f0]"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-[#E6F5F8]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-2xl hover:bg-white/80 border border-transparent hover:border-[#cfe9f0] transition-colors"
          >
            <span
              className={`w-8 h-8 rounded-full ${GRADIENT} text-white flex items-center justify-center text-xs font-black shadow-xs`}
            >
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#5F5F5F] hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-[0_10px_30px_-10px_rgba(11,90,156,0.3)] border border-[#cfe9f0] py-2 z-50">
              <div className="px-4 py-2.5 border-b border-[#cfe9f0]/60">
                <p className="text-xs font-extrabold text-[#5F5F5F] truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-[#5F5F5F]/70 truncate">
                  {user?.email}
                </p>
                <span className="inline-block mt-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#E6F5F8] text-[#0B5A9C] border border-[#7FD0E0]/50 capitalize">
                  {role} Account
                </span>
              </div>

              {role === "admin" && (
                <Link
                  to="/admin"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#0B5A9C] hover:bg-[#E6F5F8] transition-colors"
                >
                  <Shield className="w-4 h-4 text-[#1B8FC0]" />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              <Link
                to="/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#5F5F5F] hover:bg-[#E6F5F8] transition-colors"
              >
                <User className="w-4 h-4 text-[#1B8FC0]" />
                <span>
                  {role === "admin"
                    ? "Administrator Profile"
                    : role === "verifier"
                      ? "Verifier Profile"
                      : role === "authority"
                        ? "Authority Profile"
                        : "Resident Profile"}
                </span>
              </Link>

              <button
                onClick={() => {
                  logout();
                  setProfileOpen(false);
                  navigate("/login");
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors border-t border-[#cfe9f0]/60 mt-1"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
