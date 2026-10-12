import React from 'react';
import { CheckCircle2, Clock, ShieldCheck, UserCheck, Wrench, XCircle, FileText } from 'lucide-react';
import StatusBadge from './StatusBadge';

const STATUS_ICONS = {
  reported: Clock,
  verified: ShieldCheck,
  assigned: UserCheck,
  in_progress: Wrench,
  resolved: CheckCircle2,
  rejected: XCircle,
};

export default function Timeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-xs text-slate-500 py-4 text-center">
        No status history recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {events.map((evt, idx) => {
        const Icon = STATUS_ICONS[evt.status] || FileText;
        const dateFormatted = new Date(evt.created_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const isLatest = idx === events.length - 1;

        return (
          <div key={evt.id || idx} className="relative group">
            {/* Timeline bullet icon */}
            <div
              className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                isLatest
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              <Icon className="w-3 h-3" />
            </div>

            {/* Event content box */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 hover:bg-white transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <StatusBadge status={evt.status} size="xs" />
                <span className="text-[11px] font-medium text-slate-400">
                  {dateFormatted}
                </span>
              </div>

              {evt.changer_name && (
                <div className="text-xs font-semibold text-slate-800 mb-1">
                  Updated by: <span className="text-blue-600">{evt.changer_name}</span>
                </div>
              )}

              {evt.note && (
                <p className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-100 italic">
                  "{evt.note}"
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
