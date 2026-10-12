import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PublicNavbar() {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDashboardPath = () => {
    if (role === 'admin') return '/admin';
    if (role === 'authority') return '/authority/assigned';
    if (role === 'verifier') return '/verifier/queue';
    return '/dashboard';
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Live Map', path: '/map' },
    { label: 'FAQ', path: '/faq' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'backdrop-blur-xl bg-white/90 border-b border-slate-200/90 shadow-sm py-3'
          : 'bg-white/80 backdrop-blur-md border-b border-slate-100 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/logo.png"
            alt="CivicPulse Logo"
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="font-black text-slate-900 text-xl sm:text-2xl tracking-tight">
              Civic<span className="text-blue-600">Pulse</span>
            </span>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 tracking-tight hidden sm:block">
              Community Infrastructure Intelligence
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`transition-colors py-1 ${
                isActive(link.path)
                  ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          {isAuthenticated ? (
            <>
              <Link
                to="/login"
                className="text-slate-600 hover:text-blue-600 font-semibold text-xs py-2 px-3 transition-colors"
              >
                Sign In As Different Role
              </Link>
              <Link
                to={getDashboardPath()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/25 hover:shadow-blue-600/35 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-slate-700 hover:text-blue-600 font-bold text-xs py-2 px-3 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/25 hover:shadow-blue-600/35 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
              >
                <span>Sign Up</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          {isAuthenticated ? (
            <Link
              to={getDashboardPath()}
              className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/register"
              className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm"
            >
              Sign Up
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden backdrop-blur-xl bg-white/95 border-b border-slate-200 px-6 py-6 mt-3 space-y-4 shadow-xl animate-in slide-in-from-top-4">
          <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-700">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 transition-colors ${
                  isActive(link.path) ? 'text-blue-600 font-bold' : 'hover:text-blue-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-slate-200/80 flex flex-col gap-2.5">
            {isAuthenticated ? (
              <>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-center text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Go to Dashboard
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2 rounded-xl bg-slate-100 text-slate-700 text-center text-xs font-bold"
                >
                  Sign In As Another User
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-center text-xs font-bold hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-center text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Sign Up (Create Resident Account)
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
