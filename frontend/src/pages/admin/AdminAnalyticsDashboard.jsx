import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Clock3, RefreshCw, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const PERIODS = [{ days: 30, label: '30 days' }, { days: 90, label: '90 days' }, { days: 365, label: '12 months' }];
const percent = (value) => `${Number(value || 0).toFixed(1)}%`;

function Metric({ icon: Icon, label, value, note, tone = 'blue' }) {
  const tones = { blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', green: 'bg-emerald-50 text-emerald-700', violet: 'bg-violet-50 text-violet-700' };
  return <article className={`${CARD} p-5`}>
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={19} aria-hidden="true" /></span></div>
    <p className="mt-3 text-xs text-slate-500">{note}</p>
  </article>;
}

function QuarterlyDigestCard({ digest }) {
  const snapshot = digest.snapshot;
  const change = snapshot.quarter_over_quarter || {};
  const improvedTime = change.avg_days_to_resolve_change != null && change.avg_days_to_resolve_change < 0;
  const growingCategories = (snapshot.category_changes || []).filter((item) => item.change > 0).slice(0, 3);
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/70 p-5">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Quarterly performance brief</p><h3 className="mt-1 text-lg font-bold text-slate-950">{snapshot.scope} <span className="font-normal text-slate-500">· {new Date(`${digest.period_start}T00:00:00`).toLocaleDateString()} – {new Date(`${digest.period_end}T00:00:00`).toLocaleDateString()}</span></h3><p className="mt-1 text-xs text-slate-500">Prepared {new Date(digest.sent_at).toLocaleDateString()} by {digest.sent_by}</p></div>
      {snapshot.county_rank ? <div className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-center"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">County rank</p><p className="text-2xl font-extrabold text-blue-800">#{snapshot.county_rank}<span className="ml-1 text-sm font-medium text-slate-500">/ {snapshot.ranked_counties}</span></p><p className="text-[10px] text-slate-500">by resolution rate</p></div> : snapshot.is_national_scope ? <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">National summary</span> : <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center"><p className="text-xs font-semibold text-slate-700">Not ranked</p><p className="text-[10px] text-slate-500">No reports this quarter</p></div>}
    </div>
    <p className="px-5 pt-4 text-xs text-slate-500">The report groups non-duplicate cases by submission quarter. Status and resolution measures reflect each case’s current status when this briefing was generated.</p>
    <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Reports submitted</p><p className="mt-1 text-xl font-bold text-slate-900">{snapshot.total_reports}</p><p className={`mt-1 text-xs font-semibold ${change.reports_change > 0 ? 'text-amber-700' : change.reports_change < 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{change.reports_change_percent == null ? 'No previous quarter baseline' : `${change.reports_change > 0 ? '+' : ''}${change.reports_change_percent}% vs previous quarter`}</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Resolution rate</p><p className="mt-1 text-xl font-bold text-slate-900">{snapshot.resolution_rate}%</p><p className={`mt-1 text-xs font-semibold ${change.resolution_rate_change_points > 0 ? 'text-emerald-700' : change.resolution_rate_change_points < 0 ? 'text-rose-700' : 'text-slate-500'}`}>{change.resolution_rate_change_points > 0 ? '+' : ''}{change.resolution_rate_change_points ?? 0} percentage points quarter over quarter</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Average resolution time</p><p className="mt-1 text-xl font-bold text-slate-900">{snapshot.avg_days_to_resolve == null ? 'N/A' : `${snapshot.avg_days_to_resolve} days`}</p><p className={`mt-1 text-xs font-semibold ${improvedTime ? 'text-emerald-700' : change.avg_days_to_resolve_change > 0 ? 'text-rose-700' : 'text-slate-500'}`}>{change.avg_days_to_resolve_change == null ? 'Compared where both quarters have resolved cases' : `${change.avg_days_to_resolve_change > 0 ? '+' : ''}${change.avg_days_to_resolve_change} days vs previous quarter`}</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Still open from this quarter</p><p className="mt-1 text-xl font-bold text-slate-900">{snapshot.open_reports}</p><p className="mt-1 text-xs text-slate-600">{snapshot.rejected_reports} rejected · {snapshot.resolved_reports} resolved since submission</p></div>
    </div>
    <div className="grid gap-5 border-t border-slate-100 p-5 lg:grid-cols-[1.2fr_1fr]">
      <div><h4 className="text-sm font-bold text-slate-900">What changed</h4><p className="mt-1 text-xs text-slate-500">Quarter-over-quarter and county benchmarks, calculated from report data.</p>
        {snapshot.insights?.length ? <ul className="mt-3 space-y-2">{snapshot.insights.map((insight) => <li key={insight} className="flex gap-2 text-sm text-slate-700"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-hidden="true" />{insight}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Not enough report history for a comparison yet.</p>}
        {growingCategories.length > 0 && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fastest-growing issue categories</p><div className="mt-2 flex flex-wrap gap-2">{growingCategories.map((item) => <span key={item.category} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900">{item.category} <span aria-label={`${item.change} more reports`}>+{item.change}</span></span>)}</div></div>}
      </div>
      <div className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-sm font-bold text-slate-900">County leaders</h4><span className="text-[11px] text-slate-500">Resolution rate · {snapshot.ranked_counties} reporting counties</span></div><p className="mt-1 text-[11px] text-slate-500">{snapshot.ranking_basis}</p>
        {snapshot.national_leaders?.length ? <ol className="mt-3 divide-y divide-slate-100">{snapshot.national_leaders.map((county) => <li key={county.county_id} className="flex items-center gap-3 py-2 text-sm"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${county.rank === snapshot.county_rank ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{county.rank}</span><span className="min-w-0 flex-1 truncate font-medium text-slate-800">{county.county}</span><span className="text-right font-semibold text-slate-900">{county.resolution_rate}%<span className="ml-1 text-[10px] font-normal text-slate-500">· {county.total_reports} cases</span></span></li>)}</ol> : <p className="mt-3 text-sm text-slate-500">No county reports to rank for this quarter.</p>}
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600">{snapshot.ranked_counties ? <>National median resolution: <strong>{snapshot.national_median_resolution_rate}%</strong> · national rate: <strong>{snapshot.national_resolution_rate}%</strong></> : 'No county reports were available to calculate national benchmarks.'}</p>
      </div>
    </div>
  </article>;
}

function TrendChart({ rows = [] }) {
  const visible = rows.filter((_, i) => rows.length <= 31 || i % Math.ceil(rows.length / 31) === 0 || i === rows.length - 1);
  const max = Math.max(...visible.map((row) => row.count), 1);
  if (!visible.some((row) => row.count > 0)) return <div className="grid min-h-48 place-items-center text-sm text-slate-500">No reports were submitted in this period.</div>;
  return <div className="flex h-48 items-end gap-1.5 border-b border-l border-slate-200 px-3 pb-2" role="img" aria-label={`Daily report submissions, peak ${max}`}>
    {visible.map((row) => <div key={row.date} className="group relative flex h-full min-w-1 flex-1 items-end" title={`${row.date}: ${row.count} reports`}>
      <div className="w-full rounded-t bg-gradient-to-t from-blue-700 to-cyan-400 transition-colors group-hover:from-blue-900" style={{ height: `${Math.max(row.count ? 5 : 1, (row.count / max) * 100)}%` }} />
      <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block group-focus:block">{row.date}: {row.count}</span>
    </div>)}
  </div>;
}

export default function AdminAnalyticsDashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(90);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countyA, setCountyA] = useState('');
  const [countyB, setCountyB] = useState('');
  const [digests, setDigests] = useState([]);
  const [sendingQuarter, setSendingQuarter] = useState(false);
  const [sendMessage, setSendMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextSummary, nextTrend, nextDigests] = await Promise.all([
        api.analytics.getSummary(), api.analytics.getTrends(days), api.analytics.getQuarterlyDigests(),
      ]);
      setSummary(nextSummary);
      setTrend(nextTrend);
      setDigests(nextDigests || []);
      const counties = nextSummary.by_county || [];
      setCountyA((current) => counties.some((county) => String(county.county_id) === current) ? current : String(counties[0]?.county_id ?? ''));
      setCountyB((current) => counties.some((county) => String(county.county_id) === current && String(county.county_id) !== String(counties[0]?.county_id)) ? current : String(counties[1]?.county_id ?? ''));
    } catch (cause) {
      setError(cause.message || 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);
  const counties = summary?.by_county || [];
  const left = counties.find((county) => String(county.county_id) === countyA);
  const right = counties.find((county) => String(county.county_id) === countyB);
  const totals = useMemo(() => ({
    total: summary?.total_reports ?? 0,
    rate: summary?.total_reports ? (summary.resolved_reports / summary.total_reports) * 100 : 0,
    avg: summary?.avg_days_to_resolve,
  }), [summary]);

  const sendQuarterlyReport = async () => {
    setSendingQuarter(true);
    setSendMessage('');
    try {
      const result = await api.analytics.sendQuarterlyDigests();
      const count = result.recipient_count;
      setSendMessage(`Quarterly report sent in CivicPulse to ${count} admin${count === 1 ? '' : 's'}.`);
      await load();
    } catch (cause) {
      setSendMessage(cause.message || 'Could not send the quarterly report.');
    } finally {
      setSendingQuarter(false);
    }
  };

  return <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-7" aria-labelledby="admin-analytics-title">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-700">Platform intelligence</p><h1 id="admin-analytics-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Analytics & performance</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Compare county outcomes, monitor operational pressure, and track reporting trends using live CivicPulse data.</p></div>
      <button type="button" onClick={load} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh data</button>
    </header>

    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

    <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="quarterly-digests-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex flex-wrap items-center gap-2"><h2 id="quarterly-digests-title" className="text-lg font-bold text-slate-950">Quarterly analytics briefings</h2><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">In-app delivery</span></div>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Share county rankings, quarter-over-quarter movement, category shifts, and national benchmarks. Each county admin receives a county-scoped briefing.</p></div>
        {user?.role === 'admin' && user.county_id == null && <button type="button" onClick={sendQuarterlyReport} disabled={sendingQuarter || loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-60"><RefreshCw size={16} className={sendingQuarter ? 'animate-spin' : ''} />{sendingQuarter ? 'Sending…' : 'Send last quarter'}</button>}
      </div>
      {sendMessage && <p role="status" className={`mt-4 rounded-lg p-3 text-sm ${sendMessage.startsWith('Quarterly report sent') ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{sendMessage}</p>}
      {!digests.length ? <p className="mt-4 text-sm text-slate-500">No quarterly briefings have been delivered to your account yet.</p> : <div className="mt-5 space-y-4">{digests.map((digest) => <QuarterlyDigestCard key={digest.id} digest={digest} />)}</div>}
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Platform performance overview">
      <Metric icon={BarChart3} label="Total cases" value={loading ? '—' : totals.total.toLocaleString()} note="Merged duplicates counted once" />
      <Metric icon={CheckCircle2} label="Resolved" value={loading ? '—' : percent(totals.rate)} note={`${summary?.resolved_reports ?? 0} cases resolved`} tone="green" />
      <Metric icon={Clock3} label="Average time to resolve" value={loading ? '—' : totals.avg == null ? 'N/A' : `${totals.avg} days`} note="Calculated from resolved status history" tone="violet" />
      <Metric icon={AlertTriangle} label="Open workload" value={loading ? '—' : (summary?.open_reports ?? 0).toLocaleString()} note={`${summary?.awaiting_assignment ?? 0} waiting for assignment`} tone="amber" />
      <Metric icon={Clock3} label="Overdue" value={loading ? '—' : (summary?.overdue_reports ?? 0).toLocaleString()} note={`${summary?.awaiting_verification ?? 0} awaiting verification`} tone="amber" />
    </section>

    <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="county-comparison-title">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="county-comparison-title" className="text-lg font-bold text-slate-950">County performance comparison</h2><p className="mt-1 text-sm text-slate-500">Compare report volume, resolution, outstanding work, and overdue cases side by side.</p></div>
        <div className="flex flex-wrap gap-3"><label className="text-xs font-semibold text-slate-600">County A<select aria-label="First county" value={countyA} onChange={(event) => setCountyA(event.target.value)} className="mt-1 block min-h-10 min-w-40 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline focus:outline-2 focus:outline-blue-700"><option value="">Select county</option>{counties.map((county) => <option key={county.county_id} value={county.county_id}>{county.county_name}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">County B<select aria-label="Second county" value={countyB} onChange={(event) => setCountyB(event.target.value)} className="mt-1 block min-h-10 min-w-40 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline focus:outline-2 focus:outline-blue-700"><option value="">Select county</option>{counties.map((county) => <option key={county.county_id} value={county.county_id}>{county.county_name}</option>)}</select></label></div>
      </div>
      {counties.length < 2 && !loading ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">County comparison requires a national admin account with access to multiple counties.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="py-3 pr-4">Measure</th><th className="px-4 py-3">{left?.county_name || 'County A'}</th><th className="px-4 py-3">{right?.county_name || 'County B'}</th></tr></thead><tbody>
        {[["Total cases", left?.total_reports, right?.total_reports], ["Resolution rate", left?.resolution_rate == null ? null : `${left.resolution_rate}%`, right?.resolution_rate == null ? null : `${right.resolution_rate}%`], ["Average days to resolve", left?.avg_days_to_resolve == null ? 'N/A' : `${left.avg_days_to_resolve} days`, right?.avg_days_to_resolve == null ? 'N/A' : `${right.avg_days_to_resolve} days`], ["Open cases", left?.open_reports, right?.open_reports], ["Overdue", left?.overdue_reports, right?.overdue_reports]].map(([label, a, b]) => <tr key={label} className="border-b border-slate-100 last:border-0"><th scope="row" className="py-3 pr-4 font-medium text-slate-700">{label}</th><td className="px-4 py-3 font-semibold text-slate-900">{a ?? '—'}</td><td className="px-4 py-3 font-semibold text-slate-900">{b ?? '—'}</td></tr>)}
      </tbody></table></div>}
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className={`${CARD} p-5 sm:p-6`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Reporting activity</h2><p className="mt-1 text-sm text-slate-500">Daily report submissions across counties in your admin scope.</p></div><label className="text-xs font-semibold text-slate-600">Period<select aria-label="Trend period" value={days} onChange={(event) => setDays(Number(event.target.value))} className="ml-2 min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900">{PERIODS.map((period) => <option key={period.days} value={period.days}>{period.label}</option>)}</select></label></div>
        {loading ? <div className="grid min-h-48 place-items-center text-sm text-slate-500">Loading reporting activity…</div> : <div className="mt-5"><TrendChart rows={trend?.daily_reports || []} /><div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>{trend?.daily_reports?.[0]?.date}</span><span>{trend?.daily_reports?.at(-1)?.date}</span></div></div>}
      </div>
      <div className={`${CARD} p-5 sm:p-6`}><div className="flex items-center gap-2"><TrendingUp className="text-blue-700" size={19} /><h2 className="text-lg font-bold text-slate-950">County overview</h2></div><p className="mt-1 text-sm text-slate-500">Counties ranked by incoming case volume.</p>
        {loading ? <p className="mt-5 text-sm text-slate-500">Loading county performance…</p> : !counties.length ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No county report data is available yet.</p> : <ol className="mt-5 max-h-80 space-y-4 overflow-y-auto">{counties.map((county) => { const width = Math.max(2, (county.total_reports / Math.max(counties[0]?.total_reports || 1, 1)) * 100); return <li key={county.county_id}><div className="mb-1 flex justify-between gap-2 text-sm"><span className="font-medium text-slate-800">{county.county_name}</span><span className="font-semibold text-slate-900">{county.total_reports} <span className="font-normal text-slate-500">· {percent(county.resolution_rate)} resolved</span></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-700" style={{ width: `${width}%` }} /></div></li>; })}</ol>}
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <div className={`${CARD} p-5 sm:p-6`}><h2 className="text-lg font-bold text-slate-950">Category distribution</h2><p className="mt-1 text-sm text-slate-500">Most frequently reported infrastructure issues.</p>
        {!Object.values(summary?.by_category || {}).some((count) => count > 0) ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No category report data is available yet.</p> : <ul className="mt-5 space-y-4">{Object.entries(summary?.by_category || {}).sort((a, b) => b[1] - a[1]).map(([category, count]) => <li key={category}><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-700">{category}</span><strong className="text-slate-900">{count}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-600" style={{ width: `${Math.max(2, (count / Math.max(...Object.values(summary?.by_category || {}), 1)) * 100)}%` }} /></div></li>)}</ul>}
      </div>
      <div className={`${CARD} p-5 sm:p-6`}><h2 className="text-lg font-bold text-slate-950">Department workload</h2><p className="mt-1 text-sm text-slate-500">Open cases compared with each department’s total assigned work.</p>
        {!summary?.by_department?.length ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No department workload data is available yet.</p> : <ul className="mt-5 max-h-80 space-y-4 overflow-y-auto">{summary.by_department.slice().sort((a, b) => b.open_reports - a.open_reports).map((department) => <li key={department.department_id}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{department.department}<span className="ml-1 text-xs text-slate-500">· {department.county}</span></span><strong className="shrink-0 text-slate-900">{department.open_reports} / {department.total_reports} open</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max(2, (department.open_reports / Math.max(department.total_reports, 1)) * 100)}%` }} /></div></li>)}</ul>}
      </div>
    </section>

    <section className={`${CARD} p-5 sm:p-6`}><h2 className="text-lg font-bold text-slate-950">County performance table</h2><p className="mt-1 text-sm text-slate-500">Operational measures sourced from reports and their status history.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="py-3 pr-4">County</th><th className="px-3 py-3">Cases</th><th className="px-3 py-3">Resolved</th><th className="px-3 py-3">Resolution</th><th className="px-3 py-3">Open</th><th className="px-3 py-3">Overdue</th><th className="px-3 py-3">Avg. days</th></tr></thead><tbody>{counties.map((county) => <tr key={county.county_id} className="border-b border-slate-100 last:border-0"><th scope="row" className="py-3 pr-4 font-semibold text-slate-800">{county.county_name}</th><td className="px-3 py-3">{county.total_reports}</td><td className="px-3 py-3">{county.resolved_reports}</td><td className="px-3 py-3">{percent(county.resolution_rate)}</td><td className="px-3 py-3">{county.open_reports}</td><td className="px-3 py-3">{county.overdue_reports}</td><td className="px-3 py-3">{county.avg_days_to_resolve == null ? 'N/A' : county.avg_days_to_resolve}</td></tr>)}</tbody></table></div>
      {!loading && counties.length === 0 && <p className="mt-3 text-sm text-slate-500">No county performance data available.</p>}
    </section>
  </main>;
}
