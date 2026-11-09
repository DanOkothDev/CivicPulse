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
      <div className="w-14 h-14 rounded-2xl bg-[#E6F5F8] border border-[#cfe9f0] flex items-center justify-center text-[#1B8FC0] mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-base font-extrabold text-[#4a4a4a] mb-1">{title}</h4>
      <p className="text-xs text-[#5F5F5F] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  );
}
