import React, { useState, useEffect } from 'react';
import { User, CheckCircle2, FileText, Settings, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import ReportCard from '../../components/ui/ReportCard';
import StatisticCard from '../../components/ui/StatisticCard';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';

export default function ResidentProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.reports
      .list({ mine: true })
      .then((response) => {
        if (mounted) setReports(response.items || []);
      })
      .catch((error) => {
        if (mounted) toast.error(`Could not load your reports: ${error.message}`);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const resolvedCount = reports.filter((report) => report.status === 'resolved').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{user?.name}</h1>
          <p className="text-xs text-slate-500 mt-1">{user?.email}</p>
          <span className="inline-block mt-2 bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full capitalize">
            {user?.role}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { id: 'overview', label: 'Account Overview', icon: User },
          { id: 'reports', label: `My Reports (${reports.length})`, icon: FileText },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatisticCard
              title="Submitted Reports"
              value={String(reports.length)}
              subtext="Reports submitted"
              badgeText="My account"
              badgeType="primary"
              icon={FileText}
            />
            <StatisticCard
              title="Resolved Reports"
              value={String(resolvedCount)}
              subtext="Completed to date"
              badgeText="Resolved"
              badgeType="success"
              icon={CheckCircle2}
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Account details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <dt className="text-slate-400 mb-1">User ID</dt>
                <dd className="font-mono font-bold text-slate-800">{user?.id}</dd>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <dt className="text-slate-400 mb-1">Role</dt>
                <dd className="font-bold text-slate-800 capitalize">{user?.role}</dd>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <dt className="text-slate-400 mb-1">Service area ID</dt>
                <dd className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {user?.area_id ?? 'No area assigned'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          {loading ? (
            <LoadingSkeleton count={2} type="card" />
          ) : reports.length ? (
            reports.map((report) => <ReportCard key={report.id} report={report} />)
          ) : (
            <EmptyState
              title="No reports yet"
              description="Reports submitted by this account will appear here."
            />
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Account settings</h2>
          <p className="text-xs text-slate-500 mt-2">
            Profile editing and notification preferences are not available yet.
          </p>
        </div>
      )}
    </div>
  );
}
