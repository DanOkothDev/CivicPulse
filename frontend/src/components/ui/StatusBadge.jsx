import React from 'react';

const STATUS_CONFIG = {
  reported: {
    label: 'Reported',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  verified: {
    label: 'Verified',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-600',
  },
  assigned: {
    label: 'Assigned',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-600',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  resolved: {
    label: 'Resolved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

export default function StatusBadge({ status = 'reported', size = 'sm', showDot = true, className = '' }) {
  const normalized = (status || 'reported').toLowerCase().replace(' ', '_');
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.reported;

  const sizeClasses = {
    xs: 'text-[11px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  }[size] || 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot} ${
            normalized === 'in_progress' ? 'pulse-dot' : ''
          }`}
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}
