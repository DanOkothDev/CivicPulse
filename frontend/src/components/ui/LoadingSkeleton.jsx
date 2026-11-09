import React from 'react';

export default function LoadingSkeleton({ count = 3, type = 'card' }) {
  if (type === 'table') {
    return (
      <div className="bg-white/80 rounded-3xl border border-[#cfe9f0] p-4 space-y-3 animate-pulse">
        <div className="h-8 bg-[#cfe9f0] rounded-xl w-full mb-4" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="h-6 bg-[#E6F5F8] rounded-xl w-16" />
            <div className="h-6 bg-[#E6F5F8] rounded-xl flex-1" />
            <div className="h-6 bg-[#E6F5F8] rounded-xl w-28" />
            <div className="h-6 bg-[#E6F5F8] rounded-xl w-20" />
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
          className="bg-white/80 rounded-3xl border border-[#cfe9f0] p-5 shadow-[0_10px_30px_-14px_rgba(11,90,156,0.2)] animate-pulse flex flex-col sm:flex-row gap-4"
        >
          <div className="w-full sm:w-48 h-36 bg-[#cfe9f0] rounded-2xl shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <div className="flex gap-2">
              <div className="h-4 bg-[#cfe9f0] rounded-full w-24" />
              <div className="h-4 bg-[#cfe9f0] rounded-full w-16" />
            </div>
            <div className="h-6 bg-[#cfe9f0] rounded-xl w-3/4" />
            <div className="h-4 bg-[#E6F5F8] rounded-full w-full" />
            <div className="h-4 bg-[#E6F5F8] rounded-full w-5/6" />
            <div className="pt-2 flex justify-between">
              <div className="h-4 bg-[#cfe9f0] rounded-full w-32" />
              <div className="h-4 bg-[#cfe9f0] rounded-full w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
