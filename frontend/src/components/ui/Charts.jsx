import React from 'react';

// Bar Chart
export function BarChart({ data = [], height = 220 }) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="w-full flex items-end gap-3 pt-6 pb-2" style={{ height }}>
      {data.map((item, idx) => {
        const heightPct = Math.max(8, Math.round((item.value / maxVal) * 100));
        return (
          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-1.5 rounded mb-1 shadow-sm whitespace-nowrap">
              {item.value} ({item.label})
            </div>
            <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${item.color || 'bg-blue-600'}`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 mt-2 truncate max-w-full text-center">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Donut / Pie distribution chart
export function DonutChart({ data = [], size = 160 }) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  let accumulatedAngle = 0;

  const radius = 60;
  const strokeWidth = 24;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {data.map((item, idx) => {
            const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedAngle;
            accumulatedAngle += (item.value / total) * circumference;

            return (
              <circle
                key={idx}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={item.color || '#3b82f6'}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 hover:opacity-80"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xl font-extrabold text-slate-900">{total}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 min-w-[140px]">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-slate-600 font-medium truncate max-w-[120px]">{item.label}</span>
            </div>
            <span className="font-bold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sparkline / Mini Trendline
export function Sparkline({ data = [20, 24, 22, 28, 35, 42, 48], color = '#10b981', height = 40 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 160;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
