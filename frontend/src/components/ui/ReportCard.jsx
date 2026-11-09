import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ThumbsUp, Building2, ArrowRight, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function ReportCard({ report, onUpvote, compact = false }) {
  if (!report) return null;

  const dateFormatted = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={`bg-white/80 rounded-3xl border border-[#cfe9f0] shadow-[0_10px_30px_-14px_rgba(11,90,156,0.28)] hover:shadow-[0_14px_34px_-14px_rgba(11,90,156,0.4)] transition-all duration-200 overflow-hidden flex flex-col ${compact ? '' : 'sm:flex-row'} group`}>
      {/* Image thumbnail with ID tag */}
      <div className={`relative ${compact ? 'w-full h-48' : 'sm:w-56 h-48 sm:h-auto'} shrink-0 bg-[#E6F5F8] overflow-hidden`}>
        <img
          src={report.photo_url}
          alt={report.category?.name || 'Report'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 bg-[#0B5A9C]/90 backdrop-blur-sm text-white font-mono text-[11px] font-semibold px-2 py-0.5 rounded-lg">
          #RPT-{report.id}
        </div>
        {report.report_count > 1 && (
          <div data-tour="resident-merged-count" className="absolute bottom-3 left-3 bg-[#1B8FC0]/95 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
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
              <span className="text-xs font-bold text-[#0B5A9C] bg-[#E6F5F8] border border-[#cfe9f0] px-2.5 py-1 rounded-full">
                {report.category?.name || 'General Incident'}
              </span>
              <span className="text-xs text-[#7a8a90] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Reported {dateFormatted}
              </span>
            </div>
            <StatusBadge status={report.status} />
          </div>

          {/* Title & Description */}
          <Link
            data-tour="resident-report-link"
            to={`/reports/${report.id}`}
            className="block group-hover:text-[#0B5A9C] transition-colors"
          >
            <h3 className="text-base font-extrabold text-[#4a4a4a] line-clamp-1 mb-1.5">
              {report.category?.name}
              {report.description ? `: ${report.description}` : ''}
            </h3>
            <p className="text-xs text-[#5F5F5F] line-clamp-2 leading-relaxed mb-4">
              {report.description}
            </p>
          </Link>
        </div>

        {/* Bottom meta row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#cfe9f0] text-xs text-[#5F5F5F]">
          <div className="flex flex-wrap items-center gap-4">
            {report.area_id != null && (
              <span className="flex items-center gap-1 font-semibold text-[#4a4a4a]">
                <MapPin className="w-3.5 h-3.5 text-[#1B8FC0] shrink-0" />
                <span className="truncate max-w-[200px]">Area {report.area_id}</span>
              </span>
            )}

            <button
              data-tour="report-follow"
              onClick={() => onUpvote && onUpvote(report.id)}
              className="flex items-center gap-1.5 hover:text-[#0B5A9C] transition-colors font-semibold"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${report.is_following ? 'text-[#1B8FC0] fill-[#E6F5F8]' : ''}`} />
              <span>{report.is_following ? 'Following' : 'Follow'}</span>
            </button>

            {report.assigned_to != null && (
              <span className="hidden md:flex items-center gap-1 text-[#5F5F5F]">
                <Building2 className="w-3.5 h-3.5 text-[#7a8a90]" />
                <span>Assigned to user #{report.assigned_to}</span>
              </span>
            )}
          </div>

          <Link
            to={`/reports/${report.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0B5A9C] hover:text-white bg-[#E6F5F8] hover:bg-[#1B8FC0] border border-[#cfe9f0] px-3 py-1.5 rounded-xl transition-colors ml-auto"
          >
            <span>View Dossier</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
