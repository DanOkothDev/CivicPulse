import React from 'react';

export default function StatisticCard({
  title,
  value,
  subtext,
  badgeText,
  badgeType = 'default',
  footer,
  icon: Icon,
  iconBg = 'bg-[#E6F5F8] text-[#1B8FC0]',
  progress,
  className = '',
}) {
  return (
    <div className={`bg-white/80 rounded-3xl border border-[#cfe9f0] p-5 shadow-[0_10px_30px_-14px_rgba(11,90,156,0.25)] hover:shadow-[0_14px_34px_-14px_rgba(11,90,156,0.35)] transition-shadow relative overflow-hidden flex flex-col justify-between ${className}`}>
      {/* Header: Title and Icon */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#5F5F5F]">
          {title}
        </span>
        {Icon && (
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Main Metric Value and Subtext */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-[#0B5A9C]">
            {value}
          </span>
          {subtext && (
            <span className="text-xs font-semibold text-[#5F5F5F]">
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
                  ? 'bg-[#E6F5F8] text-[#0B5A9C]'
                  : badgeType === 'warning'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-[#E6F5F8] text-[#5F5F5F]'
              }`}
            >
              {badgeText}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar (if provided) */}
      {typeof progress === 'number' && (
        <div className="w-full bg-[#E6F5F8] rounded-full h-1.5 mb-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#38C6DC] to-[#0B5A9C] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {/* Footer descriptor */}
      {footer && (
        <div className="text-xs text-[#5F5F5F] flex items-center gap-1.5 pt-2 border-t border-[#cfe9f0]">
          {footer}
        </div>
      )}
    </div>
  );
}
