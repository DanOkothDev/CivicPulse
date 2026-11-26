import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';

const LEVELS = ['High', 'Medium', 'Low'];
const LEVEL_STYLE = {
  High: 'bg-rose-50 text-rose-700 border-rose-200',
  Medium: 'bg-amber-50 text-amber-800 border-amber-200',
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const STATUSES = [
  ['reported', 'Reported'], ['verified', 'Verified'], ['assigned', 'Assigned'],
  ['in_progress', 'In progress'],
];

export default function PrioritizedReportsPanel() {
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.prioritization.list({ page, per_page: 10, level, status })
      .then((result) => { if (active) setData(result); })
      .catch((cause) => { if (active) setError(cause.message || 'Could not load priority recommendations.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, level, status, reload]);

  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };
  const summary = data?.summary || { High: 0, Medium: 0, Low: 0 };

  return (
    <section className="space-y-5" aria-label="Priority management">
      <div className="rounded-2xl border border-[#cfe9f0] bg-white/80 p-4 text-sm text-[#4a4a4a]">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#1B8FC0]" />
          <p><strong>Recommendations based on persistence and confirmed report frequency.</strong> Scores do not objectively measure urgency; severity and location impact are not currently measured.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {LEVELS.map((item) => (
          <div key={item} className={`rounded-2xl border p-4 ${LEVEL_STYLE[item]}`}>
            <p className="text-xs font-bold uppercase tracking-wide">{item} recommendations</p>
            <p className="mt-1 text-3xl font-extrabold" aria-label={`${item} recommendation count`}>
              {loading ? '—' : summary[item] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="text-xs font-semibold text-[#5F5F5F]">
          Priority level
          <select aria-label="Filter by priority level" value={level} onChange={changeFilter(setLevel)} className="mt-1 block rounded-xl border border-[#cfe9f0] bg-white px-3 py-2">
            <option value="">All levels</option>{LEVELS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#5F5F5F]">
          Report status
          <select aria-label="Filter by report status" value={status} onChange={changeFilter(setStatus)} className="mt-1 block rounded-xl border border-[#cfe9f0] bg-white px-3 py-2">
            <option value="">All open statuses</option>{STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {loading ? (
        <div role="status" className="rounded-2xl border border-[#cfe9f0] bg-white p-8 text-center text-sm text-slate-500">Loading priority recommendations…</div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p>{error}</p><button type="button" onClick={() => setReload((current) => current + 1)} className="mt-3 font-bold underline">Try again</button>
        </div>
      ) : data?.items?.length ? (
        <div className="space-y-3">
          {data.items.map((report) => {
            const recommendation = report.recommendation;
            return (
              <article key={report.id} className="rounded-2xl border border-[#cfe9f0] bg-white/90 p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${LEVEL_STYLE[recommendation.level]}`}>{recommendation.level} · {recommendation.score}/100</span>
                      <StatusBadge status={report.status} />
                      <span className="text-xs text-slate-500">#{report.id} · {report.category?.name}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{report.description || report.address || report.landmark || 'Infrastructure report'}</p>
                    <p className="mt-1 text-xs text-slate-500">{report.address || report.landmark || 'Location recorded'} · Open {recommendation.days_open} days · {recommendation.confirmed_report_count} confirmed report(s)</p>
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      {recommendation.explanations.map((explanation) => <li key={explanation}>{explanation}</li>)}
                    </ul>
                  </div>
                  <Link to={`/reports/${report.id}`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#0B5A9C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1B8FC0]">
                    View and manage <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
          <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600">
            <span>{data.total} recommendation(s) · Page {data.page} of {Math.max(data.pages, 1)}</span>
            <div className="flex gap-2">
              <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-[#cfe9f0] p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" aria-label="Next page" disabled={page >= data.pages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-[#cfe9f0] p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#cfe9f0] bg-white/80 p-8 text-center">
          <h2 className="font-bold text-slate-800">No matching open reports</h2>
          <p className="mt-1 text-sm text-slate-500">Try another priority level or status filter.</p>
        </div>
      )}
    </section>
  );
}
