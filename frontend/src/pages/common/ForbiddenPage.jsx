import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ForbiddenPage({ requiredRole = 'higher authority' }) {
  const { role, switchRole } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-20 h-20 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 shadow-sm border border-rose-100">
        <ShieldAlert className="w-10 h-10" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
        Access Restricted (403)
      </span>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
        Municipal Clearance Required
      </h1>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        Your current session is logged in as <span className="font-bold capitalize text-slate-800">{role}</span>. This operational view requires <span className="font-bold text-slate-800">{requiredRole}</span> clearance.
      </p>

      {/* Demo helper to switch roles directly */}
      <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-4 max-w-md w-full mb-8">
        <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center justify-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
          <span>Switch demo role to view this screen:</span>
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {['resident', 'verifier', 'authority', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => switchRole(r)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all capitalize ${
                role === r
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Go to Resident Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
