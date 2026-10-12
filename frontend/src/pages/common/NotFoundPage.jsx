import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 shadow-sm border border-blue-100">
        <FileQuestion className="w-10 h-10" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
        Error 404
      </span>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
        Incident Record Not Found
      </h1>
      <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
        The municipal resource, report dossier, or route you requested does not exist or may have been archived.
      </p>

      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
        <Link
          to="/map"
          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse Community Map</span>
        </Link>
      </div>
    </div>
  );
}
