import React from 'react';
import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-16 px-6 lg:px-12 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800/80">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="CivicPulse Logo"
                className="h-10 w-auto object-contain"
              />
              <span className="font-black text-white text-xl tracking-tight">
                Civic<span className="text-blue-500">Pulse</span>
              </span>
            </div>
            <p className="text-slate-400 max-w-sm text-xs leading-relaxed">
              Open civic infrastructure intelligence platform empowering residents to report municipal defects and cities to resolve them with transparent, auditable workflows.
            </p>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About CivicPulse
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-white transition-colors">
                  Live Community Map
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Portals & Auth */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">
              Access
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Resident Signup
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Citizen Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 CivicPulse. Municipal Infrastructure Intelligence.</p>
          <div className="flex items-center gap-4">
            <span>Open Source Civic Tech</span>
            <span>•</span>
            <span>Transparent City Governance</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
