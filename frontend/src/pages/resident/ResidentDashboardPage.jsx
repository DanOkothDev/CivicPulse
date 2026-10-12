import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  CheckCircle2,
  ClipboardList,
  CheckSquare,
  MapPin,
  Clock,
  ArrowRight,
  Filter,
  Search,
  Bell,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import StatisticCard from '../../components/ui/StatisticCard';
import ReportCard from '../../components/ui/ReportCard';
import Filters from '../../components/ui/Filters';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function ResidentDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('my_reports');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchVal, setSearchVal] = useState('');

  // Following list items matching right column of dashboard.png
  const followingWatchlist = [
    {
      ref: '#INC-4109',
      ward: 'Ward 4',
      badge: 'Crews En Route',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'Traffic Signal Failure at East Parkway',
      updated: '12m ago',
      reportId: 4109,
    },
    {
      ref: '#INC-3882',
      ward: 'Ward 4',
      badge: 'Inspection',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      title: 'Stormwater Drainage Overflow at 6th St',
      updated: '1h ago',
      reportId: 7739,
    },
    {
      ref: '#INC-3720',
      ward: 'Ward 3',
      badge: 'Work Completed',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Graffiti Abatement on Civic Library Annex',
      updated: '3h ago',
      reportId: 8902,
    },
  ];

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.reports.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchVal || undefined,
        mine: activeTab === 'my_reports' ? true : undefined,
        following: activeTab === 'following' ? true : undefined,
      });
      setReports(res.items || []);
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, searchVal, activeTab]);

  const handleUpvote = async (id) => {
    await api.reports.toggleFollow(id);
    toast.success('Updated follow / upvote status');
    fetchReports();
  };

  const statusCounts = {
    all: reports.length,
    in_progress: reports.filter((r) => r.status === 'in_progress').length,
    reported: reports.filter((r) => r.status === 'reported').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero / Resident Profile Header Card matching dashboard.png */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative">
            <img
              src={
                user?.avatar ||
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256'
              }
              alt={user?.name || 'Resident profile'}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-blue-500/10 shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {user?.name || 'Faith Wanjiku'}
              </h1>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Ward 4 Verified Citizen</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700">#CP-8842-D4</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Citizen Member since {user?.memberSince || 'Oct 2021'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-700 font-medium">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Ward 4 - Eastleigh North</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
          <Link
            to="/report/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-md shadow-blue-600/25 hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>File New Issue</span>
          </Link>
        </div>
      </div>

      {/* 2. Four Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticCard
          title="Total Reports"
          value={String(statusCounts.all)}
          subtext="Submitted"
          footer="✔ Recorded in municipal registry"
          icon={ClipboardList}
          iconBg="bg-blue-50 text-blue-600"
        />

        <StatisticCard
          title="Active Repairs"
          value={String(statusCounts.in_progress)}
          subtext="In Progress"
          footer="🛠 Crews dispatched"
          icon={CheckSquare}
          iconBg="bg-amber-50 text-amber-600"
        />

        <StatisticCard
          title="Resolved Issues"
          value={String(statusCounts.resolved)}
          subtext="Closed"
          badgeText="Verified Fixed"
          badgeType="success"
          footer="⚡ Inspection confirmed"
          icon={CheckCircle2}
          iconBg="bg-emerald-50 text-emerald-600"
        />

        <StatisticCard
          title="Followed Incidents"
          value={String(followingWatchlist.length)}
          subtext="Watchlist"
          footer="🔔 Live updates enabled"
          icon={Bell}
          iconBg="bg-purple-50 text-purple-600"
        />
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/90 pb-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'my_reports', label: `My Reports (${reports.length})` },
          { id: 'following', label: `Following Incidents (${followingWatchlist.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 Cols: Reports List with Filters */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
            {/* Filter pills and search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Filters
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                statusCounts={statusCounts}
              />

              <div className="relative sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Filter reports..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 focus:bg-white text-xs text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Reports list */}
            {loading ? (
              <LoadingSkeleton count={3} type="card" />
            ) : reports.length === 0 ? (
              <EmptyState
                title="No reports matching criteria"
                description="Try switching status tabs or clear the search filter."
                action={
                  <Link
                    to="/report/new"
                    className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Submit New Report
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3.5">
                {reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onUpvote={handleUpvote}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Following Incidents Watchlist matching dashboard.png */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Following Incidents
                </h3>
              </div>
              <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                14 active
              </span>
            </div>

            <div className="space-y-3">
              {followingWatchlist.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">
                      {item.ref} • {item.ward}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1 mb-2 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Updated {item.updated}</span>
                    <Link
                      to={`/reports/${item.reportId}`}
                      className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Track Live</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setActiveTab('following');
                toast.info('Switched to complete followed incidents stream');
              }}
              className="w-full mt-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors text-center"
            >
              Manage All 14 Watchlist Items
            </button>
          </div>

          {/* Quick Notification Preview Box */}
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-3xl p-5 text-white shadow-md">
            <div className="flex items-center gap-2 mb-2 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Bell className="w-4 h-4 text-blue-400" />
              <span>County Field Update</span>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">
              Active Crew Dispatch
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Water pipeline maintenance underway in Ward 4. Road repair crews dispatched along First Avenue, Eastleigh.
            </p>
            <Link
              to="/notifications"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300"
            >
              <span>View live dispatch feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
