import React from 'react';
import { Filter, Layers, MapPin, Check } from 'lucide-react';

export default function Filters({
  statusFilter,
  onStatusChange,
  statusCounts = {},
  categories = [],
  selectedCategory,
  onCategoryChange,
  areas = [],
  selectedArea,
  onAreaChange,
  extraFilters = null,
}) {
  const statusTabs = [
    { id: 'all', label: 'All', count: statusCounts.all ?? statusCounts.total },
    { id: 'in_progress', label: 'In Progress', count: statusCounts.in_progress },
    { id: 'reported', label: 'Under Triage', count: statusCounts.reported },
    { id: 'resolved', label: 'Resolved', count: statusCounts.resolved },
  ];

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3">
      {/* Status Pill Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        {statusTabs.map((tab) => {
          const isActive = (statusFilter || 'all') === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onStatusChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-blue-700/60 text-blue-100' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dropdown Filters (Category & Area) */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.length > 0 && (
          <div className="relative">
            <select
              value={selectedCategory || ''}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-xs font-semibold text-slate-700 py-1.5 pl-3 pr-8 rounded-xl hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Layers className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        )}

        {areas.length > 0 && (
          <div className="relative">
            <select
              value={selectedArea || ''}
              onChange={(e) => onAreaChange(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-xs font-semibold text-slate-700 py-1.5 pl-3 pr-8 rounded-xl hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
            >
              <option value="">All Wards / Areas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        )}

        {extraFilters}
      </div>
    </div>
  );
}
