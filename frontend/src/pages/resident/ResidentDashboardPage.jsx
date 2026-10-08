import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Share2,
  CheckCircle2,
  ClipboardList,
  CheckSquare,
  Award,
  TrendingUp,
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
    all: 28,
    in_progress: 3,
    reported: 1,
    resolved: 24,
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
                {user?.name || 'Sarah Jenkins'}
              </h1>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>District 4 Verified Contributor</span>
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
                <span>Ward 4 - Metro East</span>
              </span>
            </div>
          </div>
        </div>

        {/* Civic Trust Score & Action Buttons */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-start md:justify-end">
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 px-4 flex flex-col items-start min-w-[170px]">
            <div className="flex items-center justify-between w-full gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <span>Civic Trust Score</span>
              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">Tier V</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-600">
                {user?.trustScore || 98.4}%
              </span>
              <span className="text-xs font-bold text-emerald-600 flex items-center">
                ↑1.2%
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Master Sentinel Status
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <Link
              to="/report/new"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md shadow-blue-600/25 hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>File New Issue</span>
            </Link>

            <button
              onClick={() => toast.info('Citizen verified telemetry dossier copied to clipboard')}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 px-4 rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4 text-slate-500" />
              <span>Share Dossier</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Four Metric KPI Cards matching dashboard.png */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticCard
          title="Lifetime Reports"
          value="28"
          subtext="Submitted"
          badgeText="Top 3% Ward 4"
          badgeType="success"
          footer="✔ 26 successfully triage routed"
          icon={ClipboardList}
          iconBg="bg-blue-50 text-blue-600"
        />

        <StatisticCard
          title="Verified Rate"
          value="96.4%"
          subtext="High Precision"
          footer="🛡 Zero flagged duplicate submissions"
          icon={CheckSquare}
          iconBg="bg-emerald-50 text-emerald-600"
        />

        <StatisticCard
          title="Resolved Issues"
          value="24"
          subtext="Closed"
          badgeText="85.7% Closed-Out"
          badgeType="primary"
          footer="⚡ Avg. resolution velocity: 4.2 days"
          icon={CheckCircle2}
          iconBg="bg-purple-50 text-purple-600"
        />

        <StatisticCard
          title="Civic Impact XP"
          value="980"
          subtext="XP"
          badgeText="Ambassador (82%)"
          badgeType="warning"
          progress={82}
          footer="Sentinel Tier (1,200 XP target)"
          icon={Award}
          iconBg="bg-amber-50 text-amber-600"
        />
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/90 pb-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'my_reports', label: 'My Reports (28)' },
          { id: 'following', label: 'Following Incidents (14)' },
          { id: 'preferences', label: 'Notification Preferences' },
          { id: 'security', label: 'Security & Account' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'preferences' || tab.id === 'security') {
                navigate('/profile');
              } else {
                setActiveTab(tab.id);
              }
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
              <span>Municipal Telemetry Alert</span>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">
              Live CAD Integration Active
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Water utility pressure drop isolated in Ward 4. Road repair crews dispatched on East Birch Ave.
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
