import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search incidents, streets, parcel IDs, or reference tickets...',
  className = '',
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2 bg-white/80 hover:bg-white focus:bg-white text-sm text-[#4a4a4a] placeholder:text-[#7a8a90] rounded-xl border border-[#cfe9f0] focus:border-[#1B8FC0] focus:outline-none focus:ring-2 focus:ring-[#7FD0E0]/40 transition-all"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-3 text-[#7a8a90] hover:text-[#0B5A9C] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
