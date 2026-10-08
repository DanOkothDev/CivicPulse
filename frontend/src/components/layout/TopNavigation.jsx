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
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../ui/SearchBar';

export default function TopNavigation({ onMenuClick }) {
  const { user, role, logout, switchRole } = useAuth();
  const [searchVal, setSearchVal] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      navigate(`/map?search=${encodeURIComponent(searchVal.trim())}`);
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

        <div className="flex-1 max-w-md hidden sm:block">
          <SearchBar
            value={searchVal}
            onChange={setSearchVal}
            onClear={() => setSearchVal('')}
            placeholder="Search incidents, streets, parcel IDs, or tickets..."
          />
        </div>
      </div>

      {/* Right: Ward Pill, Role Switcher, Notifications, and Profile */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Ward Selector Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/70 border border-blue-200 text-blue-900 rounded-xl text-xs font-semibold shadow-xs">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>Metro City East Ward</span>
          <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
        </div>

        {/* Quick Role Switcher for seamless testing of all 12 screens */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            title="Switch demo role to preview screens"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span className="capitalize">{role}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Role Preview
              </div>
              {[
                { r: 'resident', label: 'Resident View', desc: 'Sarah Jenkins' },
                { r: 'verifier', label: 'Verifier View', desc: 'J. Ramirez' },
                { r: 'authority', label: 'Authority View', desc: 'Crew 4B Dispatch' },
                { r: 'admin', label: 'Admin View', desc: 'Marcus Vance' },
              ].map((item) => (
                <button
                  key={item.r}
                  onClick={() => {
                    switchRole(item.r);
                    setRoleMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    role === item.r ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                  {role === item.r && <CheckCircle className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon with Unread Badge */}
        <Link
          to="/notifications"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white">
            3
          </span>
        </Link>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <img
              src={
                user?.avatar ||
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256'
              }
              alt={user?.name || 'User avatar'}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
            />
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

              <Link
                to="/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>Resident Profile</span>
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
