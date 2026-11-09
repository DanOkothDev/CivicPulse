import React from 'react';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found',
  emptySubtext = 'Try refining your filters or search query',
  onRowClick,
  className = '',
}) {
  if (loading) {
    return <LoadingSkeleton count={5} type="table" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/80 rounded-3xl border border-[#cfe9f0] p-8 shadow-[0_10px_30px_-14px_rgba(11,90,156,0.25)]">
        <EmptyState title={emptyMessage} description={emptySubtext} />
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto bg-white/80 rounded-3xl border border-[#cfe9f0] shadow-[0_10px_30px_-14px_rgba(11,90,156,0.25)] ${className}`}>
      <table className="min-w-full divide-y divide-[#cfe9f0] text-left">
        <thead className="bg-[#E6F5F8]/80">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#5F5F5F] ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#cfe9f0]/70 bg-white/70">
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`hover:bg-[#E6F5F8]/70 transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className={`px-4 py-3.5 text-xs text-[#4a4a4a] whitespace-nowrap ${col.cellClassName || ''}`}
                >
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
