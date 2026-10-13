import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import ReportCard from '../../components/ui/ReportCard';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function MyReportsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchVal, setSearchVal] = useState('');

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const res = await api.reports.list({
        mine: true,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchVal || undefined,
      });
      setReports(res.items || []);
    } catch (error) {
      toast.error(`Could not load your reports: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, [statusFilter, searchVal]);

  const handleUpvote = async (id) => {
    try {
      await api.reports.toggleFollow(id);
      fetchMyReports();
    } catch (error) {
      toast.error(`Could not update follow status: ${error.message}`);
    }
  };

  const statusCounts = {
    all: reports.length,
    reported: reports.filter((r) => r.status === 'reported').length,
    in_progress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 tracking-wider uppercase mb-1">
            <span>Resident Hub</span>
            <span>•</span>
            <span>Submissions Tracking</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Submitted Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Monitor the status, verifications, and department progress for all infrastructure defects you have reported.
          </p>
        </div>

        <Link
          to="/report/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md shadow-blue-600/25 hover:shadow-lg transition-all flex items-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          {[
            { id: 'all', label: `All Reports (${statusCounts.all})` },
            { id: 'reported', label: `Reported (${statusCounts.reported})` },
            { id: 'in_progress', label: `In Progress (${statusCounts.in_progress})` },
            { id: 'resolved', label: `Resolved (${statusCounts.resolved})` },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === item.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search my reports..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <LoadingSkeleton count={3} type="card" />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports found"
          description={
            statusFilter !== 'all' || searchVal
              ? 'No reports match your selected filter criteria.'
              : "You haven't submitted any civic reports yet. Help improve your community by reporting an issue."
          }
          actionLabel="Report an Issue"
          onAction={() => window.location.assign('/report/new')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
  );
}
