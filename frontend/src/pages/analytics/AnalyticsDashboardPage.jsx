import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Flame,
  Clock,
  AlertTriangle,
  MapPin,
  TrendingUp,
  Layers,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatisticCard from '../../components/ui/StatisticCard';
import { BarChart, DonutChart, Sparkline } from '../../components/ui/Charts';
import MapComponent from '../../components/ui/MapComponent';

export default function AnalyticsDashboardPage() {
  const { role } = useAuth();
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [sum, spots, a] = await Promise.all([
        api.analytics.getSummary(selectedArea || undefined),
        api.analytics.getHotspots(),
        api.reference.getAreas(),
      ]);
      setSummary(sum);
      setHotspots(spots);
      setAreas(a);
    } catch (error) {
      toast.error(`Could not load municipal analytics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedArea]);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const res = await api.analytics.recomputeHotspots({ eps_m: 250, min_samples: 3 });
      toast.success(`Hotspot clustering completed. Found ${res.clusters_created} cluster(s).`);
      const spots = await api.analytics.getHotspots();
      setHotspots(spots);
    } catch (err) {
      toast.error(err.message || 'Clustering recompute failed');
    } finally {
      setRecomputing(false);
    }
  };

  // Transform data for charts
  const statusChartData = summary
    ? [
        { label: 'Reported', value: summary.by_status?.reported ?? 0, color: 'bg-amber-500' },
        { label: 'Verified', value: summary.by_status?.verified ?? 0, color: 'bg-blue-600' },
        { label: 'Assigned', value: summary.by_status?.assigned ?? 0, color: 'bg-purple-600' },
        { label: 'In Progress', value: summary.by_status?.in_progress ?? 0, color: 'bg-orange-500' },
        { label: 'Resolved', value: summary.by_status?.resolved ?? 0, color: 'bg-emerald-500' },
      ]
    : [];

  const categoryDonutData = summary
    ? Object.entries(summary.by_category || {}).map(([label, value], index) => ({
        label,
        value,
        color: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][index % 6],
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 tracking-wider uppercase mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Civic Intelligence & Machine Learning Hotspots</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Municipal Infrastructure Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Insights into recurring infrastructure issues, nearby hotspots, and average resolution time.
          </p>
        </div>

        {/* Controls: Recompute Hotspots & Ward Filter */}
        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <button
              onClick={handleRecompute}
              disabled={recomputing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Flame className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin' : ''}`} />
              <span>{recomputing ? 'Updating hotspots...' : 'Refresh hotspots'}</span>
            </button>
          )}

          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="text-xs font-semibold py-2 px-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
          >
            <option value="">All Municipal Wards</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatisticCard
          title="Total Lifetime Incidents"
          value={summary?.total_reports ?? 0}
          subtext="Logged"
          badgeText="Citywide Registry"
          badgeType="primary"
          icon={Layers}
        />
        <StatisticCard
          title="Avg Days to Resolution"
          value={summary?.avg_days_to_resolve == null ? '—' : `${summary.avg_days_to_resolve}d`}
          subtext="Velocity"
          badgeText="Resolved reports only"
          badgeType="primary"
          icon={Clock}
        />
        <StatisticCard
          title="Active Hotspot Clusters"
          value={hotspots.length}
          subtext="Zones"
          badgeText="Clustered reports"
          badgeType="warning"
          icon={Flame}
          iconBg="bg-rose-50 text-rose-600"
        />
        <StatisticCard
          title="Open Incidents"
          value={summary?.open_reports ?? 0}
          subtext="Not resolved or rejected"
          badgeText="Current Cases"
          badgeType="warning"
          icon={AlertTriangle}
        />
      </div>

      {/* Hotspots map */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Nearby report clusters
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Nearby reports are grouped into hotspots to help prioritize maintenance.
            </p>
          </div>
          <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
            {hotspots.length} Critical Hotspots
          </span>
        </div>

        <div className="h-80 rounded-2xl overflow-hidden border border-slate-200 relative">
          <MapComponent
            center={[-1.2629, 36.8355]}
            zoom={13}
            hotspots={hotspots}
            height="100%"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {hotspots.map((spot) => (
            <div
              key={spot.id}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {spot.top_category || `Hotspot #${spot.id}`}
                  </h4>
                  <span className="text-[10px] font-bold text-rose-600">Hotspot</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {spot.report_count} Reports • Radius: {spot.radius_m}m
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Reports by Operational Status
            </h3>
            <span className="text-xs text-slate-400 font-semibold">Real-time counts</span>
          </div>

          <BarChart data={statusChartData} height={200} />
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Taxonomy Category Breakdown
            </h3>
            <span className="text-xs text-slate-400 font-semibold">Incident share</span>
          </div>

          <DonutChart data={categoryDonutData} size={160} />
        </div>
      </div>

      {/* Ward Open Issues Ranking */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Open Workorders by Electoral Ward
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {(summary?.open_by_area || []).map((area) => (
            <div key={area.area_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                WARD #{area.area_id}
              </span>
              <h4 className="text-xs font-bold text-slate-900 mb-1">{area.name}</h4>
              <span className="text-lg font-extrabold text-blue-600">
                {area.open} Open Issues
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
