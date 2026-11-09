import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ForbiddenPage({ requiredRole = 'higher authority' }) {
  const { role } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-20 h-20 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 shadow-sm border border-rose-100">
        <ShieldAlert className="w-10 h-10" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
        Access Restricted (403)
      </span>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#4a4a4a] mb-2">
        Municipal Clearance Required
      </h1>
      <p className="text-sm text-[#5F5F5F] max-w-md mb-6 leading-relaxed">
        Your current session is logged in as <span className="font-bold capitalize text-[#4a4a4a]">{role}</span>. This operational view requires <span className="font-bold text-[#4a4a4a]">{requiredRole}</span> clearance.
      </p>

      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C] hover:brightness-110 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Go to Resident Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
