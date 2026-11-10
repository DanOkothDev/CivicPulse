import React, { useEffect, useState } from 'react';
import { Award, BarChart3, Medal, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';

const CARD = 'rounded-3xl border border-[#cfe9f0] bg-white/85 p-5 shadow-sm';

export default function ResidentAnalyticsPage() {
  const [period, setPeriod] = useState('all_time');
  const [leaderboard, setLeaderboard] = useState(null);
  const [publicData, setPublicData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api.analytics.getLeaderboard(period), api.analytics.getPublic()])
      .then(([leaders, analytics]) => { setLeaderboard(leaders); setPublicData(analytics); setError(''); })
      .catch((cause) => setError(cause.message));
  }, [period]);
  const periods = [['weekly', '7 days'], ['monthly', '30 days'], ['all_time', 'All time']];
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <header><p className="text-xs font-bold uppercase tracking-wider text-[#1B8FC0]">Community impact</p>
      <h1 className="mt-1 text-3xl font-extrabold text-[#0B5A9C]">Community analytics</h1>
      <p className="mt-2 text-sm text-[#5F5F5F]">Public, county-level reporting trends and verified resident contributions.</p>
    </header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Could not load analytics: {error}</p>}
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Community report totals">
      {[['Total reports', publicData?.total_reports], ['Resolved', publicData?.resolved_reports], ['Open issues', publicData?.unresolved_reports]].map(([label, value]) =>
        <div className={CARD} key={label}><p className="text-sm text-[#5F5F5F]">{label}</p><p className="mt-2 text-3xl font-extrabold text-[#0B5A9C]">{value ?? '—'}</p><p className="mt-1 text-xs text-slate-500">{publicData?.scope || 'Loading community'}</p></div>)}
    </section>
    <section className={CARD}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-bold text-[#0B5A9C]"><Award /> Resident leaderboard</h2>
        <p className="mt-1 text-sm text-slate-600">{leaderboard?.scoring}</p></div>
        <label className="text-sm font-semibold">Rank period <select className="ml-2 rounded-xl border border-[#cfe9f0] bg-white p-2" value={period} onChange={(e) => setPeriod(e.target.value)}>{periods.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <div className="my-5 grid gap-3 rounded-2xl bg-[#E6F5F8] p-4 sm:grid-cols-3">
        <div><span className="text-xs text-slate-600">Your rank</span><p className="text-2xl font-extrabold text-[#0B5A9C]">{leaderboard?.my_stats?.rank ? `#${leaderboard.my_stats.rank}` : '—'}</p></div>
        <div><span className="text-xs text-slate-600">Verified contributions</span><p className="text-2xl font-extrabold text-[#0B5A9C]">{leaderboard?.my_stats?.verified_contributions ?? '—'}</p></div>
        <div><span className="text-xs text-slate-600">Contribution points</span><p className="text-2xl font-extrabold text-[#0B5A9C]">{leaderboard?.my_stats?.points ?? '—'}</p></div>
      </div>
      {!leaderboard?.entries?.length ? <p className="py-8 text-center text-sm text-slate-500">No verified contributions in this period yet. Be the first to help!</p> : <ol className="divide-y divide-[#e4f1f4]">
        {leaderboard.entries.map((entry) => <li key={`${entry.rank}-${entry.display_name}`} className="flex items-center gap-3 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E6F5F8] font-extrabold text-[#0B5A9C]">{entry.rank <= 3 ? <Medal size={18} /> : entry.rank}</span>
          <div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-800">{entry.display_name}</p><p className="text-xs text-slate-500">{entry.verified_contributions} verified contribution{entry.verified_contributions === 1 ? '' : 's'} {entry.badges?.length ? `· ${entry.badges.join(', ')}` : ''}</p></div>
          <span className="font-extrabold text-[#0B5A9C]">{entry.points} pts</span>
        </li>)}
      </ol>}
    </section>
    <section className="grid gap-6 lg:grid-cols-2">
      <div className={CARD}><h2 className="flex items-center gap-2 text-lg font-bold text-[#0B5A9C]"><BarChart3 /> Reports by category</h2>
        {!publicData?.by_category?.length ? <p className="mt-4 text-sm text-slate-500">No category reports yet.</p> : <ul className="mt-4 space-y-3">{publicData.by_category.map((row) => <li key={row.category} className="flex justify-between gap-3 text-sm"><span>{row.category}</span><strong>{row.count}</strong></li>)}</ul>}</div>
      <div className={CARD}><h2 className="flex items-center gap-2 text-lg font-bold text-[#0B5A9C]"><TrendingUp /> Recent reporting activity</h2>
        {!publicData?.trends?.length ? <p className="mt-4 text-sm text-slate-500">No recent reports.</p> : <ul className="mt-4 max-h-64 space-y-2 overflow-auto">{publicData.trends.map((row) => <li key={row.date} className="flex justify-between text-sm"><time>{row.date}</time><strong>{row.count}</strong></li>)}</ul>}</div>
    </section>
  </main>;
}
