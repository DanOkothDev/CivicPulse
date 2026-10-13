import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  MapPin,
  ChevronDown,
  User,
  LogOut,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import SearchBar from '../ui/SearchBar';

export default function TopNavigation({ onMenuClick }) {
  const { user, role, logout } = useAuth();
  const toast = useToast();
  const [searchVal, setSearchVal] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      api.notifications
        .getUnreadCount()
        .then((data) => setUnreadCount(data?.count || 0))
        .catch((error) => toast.error(`Could not load notification count: ${error.message}`));
    }
  }, [user]);

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      navigate(`/community-map?search=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 h-16 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile hamburger & Search input */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="lg:hidden flex items-center gap-2" title="CivicPulse Home">
          <img src="/logo.png" alt="CivicPulse" className="h-10 w-auto object-contain drop-shadow-xs" />
        </Link>

        <div className="flex-1 max-w-md hidden sm:block">
          <SearchBar
            value={searchVal}
            onChange={setSearchVal}
            onClear={() => setSearchVal('')}
            placeholder="Search incidents, streets (e.g. Moi Ave, Ngong Rd)..."
          />
        </div>
      </div>

      {/* Right: Ward Pill, Notifications, and Profile */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Ward Selector Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/70 border border-blue-200 text-blue-900 rounded-xl text-xs font-semibold shadow-xs">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>
            {user?.area_id == null ? 'No service area' : `Service area #${user.area_id}`}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
        </div>

        {/* Notifications Icon with Unread Badge */}
        <Link
          to="/notifications"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold ring-2 ring-blue-500/20">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 capitalize">
                  {role} Account
                </span>
              </div>

              {role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                >
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              <Link
                to="/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>
                  {role === 'admin'
                    ? 'Administrator Profile'
                    : role === 'verifier'
                    ? 'Verifier Profile'
                    : role === 'authority'
                    ? 'Authority Profile'
                    : 'Resident Profile'}
                </span>
              </Link>

              <button
                onClick={() => {
                  logout();
                  setProfileOpen(false);
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100 mt-1"
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
