import React from 'react';

export default function LoadingSkeleton({ count = 3, type = 'card' }) {
  if (type === 'table') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-full mb-4" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="h-6 bg-slate-100 rounded w-16" />
            <div className="h-6 bg-slate-100 rounded flex-1" />
            <div className="h-6 bg-slate-100 rounded w-28" />
            <div className="h-6 bg-slate-100 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm animate-pulse flex flex-col sm:flex-row gap-4"
        >
          <div className="w-full sm:w-48 h-36 bg-slate-200 rounded-xl shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <div className="flex gap-2">
              <div className="h-4 bg-slate-200 rounded w-24" />
              <div className="h-4 bg-slate-200 rounded w-16" />
            </div>
            <div className="h-6 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-5/6" />
            <div className="pt-2 flex justify-between">
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-4 bg-slate-200 rounded w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
