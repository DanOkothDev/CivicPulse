import React from 'react';
import { Inbox, FolderOpen } from 'lucide-react';

export default function EmptyState({
  title = 'No reports or records found',
  description = 'There are no active items matching your current filters.',
  action = null,
  icon: Icon = Inbox,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 py-12">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-base font-bold text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  );
}
