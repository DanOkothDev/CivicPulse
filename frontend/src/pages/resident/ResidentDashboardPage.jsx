import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  CheckCircle2,
  ClipboardList,
  CheckSquare,
  MapPin,
  ArrowRight,
  Filter,
  Search,
  Bell,
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
  const [followingReports, setFollowingReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchVal, setSearchVal] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [response, followingResponse] = await Promise.all([
        api.reports.list({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchVal || undefined,
          mine: activeTab === 'my_reports' ? true : undefined,
          following: activeTab === 'following' ? true : undefined,
        }),
        api.reports.list({ following: true }),
      ]);
      setReports(response.items || []);
      setFollowingReports(followingResponse.items || []);
    } catch (err) {
      toast.error(`Could not load reports: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, searchVal, activeTab]);

  const handleUpvote = async (id) => {
    try {
      await api.reports.toggleFollow(id);
      toast.success('Report follow status updated');
      fetchReports();
    } catch (error) {
      toast.error(`Could not update follow status: ${error.message}`);
    }
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
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold ring-4 ring-blue-500/10 shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {user?.name}
              </h1>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full capitalize">
                {user?.role}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700">Account #{user?.id}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-700 font-medium">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{user?.area_id ? `Service area #${user.area_id}` : 'No service area assigned'}</span>
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
          value={String(followingReports.length)}
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
          { id: 'following', label: `Following Incidents (${followingReports.length})` },
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

        {/* Right 4 Cols: Reports followed by this account */}
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
                {followingReports.length} active
              </span>
            </div>

            <div className="space-y-3">
              {followingReports.slice(0, 3).map((report) => (
                <div
                  key={report.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">
                      #RPT-{report.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200 bg-white capitalize">
                      {report.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1 mb-2 group-hover:text-blue-600 transition-colors">
                    {report.description || report.category?.name}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{report.category?.name}</span>
                    <Link
                      to={`/reports/${report.id}`}
                      className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Track Live</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
              {!followingReports.length && !loading && (
                <p className="text-xs text-slate-500">You are not following any reports yet.</p>
              )}
            </div>

            <button
              onClick={() => setActiveTab('following')}
              className="w-full mt-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors text-center"
            >
              View all followed reports
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
