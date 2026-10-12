import React from 'react';

export default function StatisticCard({
  title,
  value,
  subtext,
  badgeText,
  badgeType = 'default',
  footer,
  icon: Icon,
  iconBg = 'bg-blue-50 text-blue-600',
  progress,
  className = '',
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between ${className}`}>
      {/* Header: Title and Icon */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Main Metric Value and Subtext */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </span>
          {subtext && (
            <span className="text-xs font-semibold text-slate-500">
              {subtext}
            </span>
          )}
        </div>

        {badgeText && (
          <div className="mt-1">
            <span
              className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                badgeType === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : badgeType === 'primary'
                  ? 'bg-blue-50 text-blue-700'
                  : badgeType === 'warning'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {badgeText}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar (if provided) */}
      {typeof progress === 'number' && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {/* Footer descriptor */}
      {footer && (
        <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-100">
          {footer}
        </div>
      )}
    </div>
  );
}
