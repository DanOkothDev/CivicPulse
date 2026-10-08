import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ThumbsUp, Building2, ArrowRight, Clock, Eye } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function ReportCard({ report, onUpvote, compact = false }) {
  if (!report) return null;

  const dateFormatted = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col sm:flex-row group">
      {/* Image thumbnail with ID tag */}
      <div className="relative sm:w-56 h-48 sm:h-auto shrink-0 bg-slate-100 overflow-hidden">
        <img
          src={report.photo_url}
          alt={report.category?.name || 'Report'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md">
          #RPT-{report.id}
        </div>
        {report.report_count > 1 && (
          <div className="absolute bottom-3 left-3 bg-blue-600/90 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
            <span>+{report.report_count - 1} Merged</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Top category, date and status row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                {report.category?.name || 'General Incident'}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Reported {dateFormatted}
              </span>
            </div>
            <StatusBadge status={report.status} />
          </div>

          {/* Title & Description */}
          <Link
            to={`/reports/${report.id}`}
            className="block group-hover:text-blue-600 transition-colors"
          >
            <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1.5">
              {report.address ? `${report.category?.name} on ${report.address}` : report.description}
            </h3>
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
              {report.description}
            </p>
          </Link>
        </div>

        {/* Bottom meta row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            {report.address && (
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate max-w-[200px]">{report.address}</span>
              </span>
            )}

            <button
              onClick={() => onUpvote && onUpvote(report.id)}
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors font-medium"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${report.is_following ? 'text-blue-600 fill-blue-50' : ''}`} />
              <span>{report.report_count || 1} Upvotes</span>
            </button>

            {report.assigned_name && (
              <span className="hidden md:flex items-center gap-1 text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Assigned: {report.assigned_name}</span>
              </span>
            )}
          </div>

          <Link
            to={`/reports/${report.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors ml-auto"
          >
            <span>View Dossier</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
