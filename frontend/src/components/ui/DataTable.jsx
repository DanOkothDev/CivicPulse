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
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <EmptyState title={emptyMessage} description={emptySubtext} />
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto bg-white rounded-2xl border border-slate-200/90 shadow-sm ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50/80">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`hover:bg-slate-50/80 transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className={`px-4 py-3.5 text-xs text-slate-700 whitespace-nowrap ${col.cellClassName || ''}`}
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
