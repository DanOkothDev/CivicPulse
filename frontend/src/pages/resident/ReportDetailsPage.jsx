import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  ThumbsUp,
  Share2,
  Building2,
  Calendar,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Shield,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/ui/StatusBadge';
import Timeline from '../../components/ui/Timeline';
import MapComponent from '../../components/ui/MapComponent';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';

export default function ReportDetailsPage() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const toast = useToast();

  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const rep = await api.reports.get(id);
        const hist = await api.reports.getHistory(id);
        setReport(rep);
        setFollowing(rep.is_following);
        setHistory(hist);
      } catch (err) {
        toast.error('Failed to load report dossier');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleToggleFollow = async () => {
    try {
      const updated = await api.reports.toggleFollow(id);
      setFollowing(!following);
      toast.success(!following ? 'Now following this incident updates' : 'Removed from following list');
      setReport(prev => ({
        ...prev,
        report_count: !following ? (prev.report_count || 1) + 1 : Math.max(1, (prev.report_count || 1) - 1),
      }));
    } catch {
      toast.error('Failed to update follow status');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <LoadingSkeleton count={2} type="card" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <h3 className="text-base font-bold text-slate-800">Report Dossier Not Found</h3>
        <Link to="/map" className="text-blue-600 text-xs font-bold hover:underline mt-2 inline-block">
          Return to map
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button & dossier ID bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-600">
                #RPT-{report.id}
              </span>
              <StatusBadge status={report.status} />
              {report.ai_suggested_category && (
                <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span>AI Classified ({Math.round(report.ai_suggested_category.confidence * 100)}%)</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              {report.category?.name} Incident Dossier
            </h1>
          </div>
        </div>

        {/* Follow / Upvote Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleToggleFollow}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              following
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${following ? 'fill-white' : ''}`} />
            <span>{following ? 'Following Incident' : 'Follow & Upvote'}</span>
            <span className="bg-black/10 px-1.5 py-0.2 rounded text-[11px]">
              {report.report_count || 1}
            </span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast.info('Dossier permalink copied to clipboard');
            }}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Photo evidence & description */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Photo Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
            <div className="relative h-72 sm:h-96 bg-slate-900">
              <img
                src={report.photo_url}
                alt={report.category?.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-lg">
                Verified Field Evidence
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Physical Description & Triage Notes
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed">
                {report.description}
              </p>

              {report.landmark && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Landmark reference:</strong> {report.landmark}</span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail Timeline */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Lifecycle Audit Trail & Status Events
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {history.length} Event{history.length !== 1 ? 's' : ''} Recorded
              </span>
            </div>

            <Timeline events={history} />
          </div>
        </div>

        {/* Right Column (5 cols): Spatial location & metadata */}
        <div className="lg:col-span-5 space-y-6">
          {/* Map snapshot */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Geographic Telemetry & Coordinates
            </h3>

            <div className="h-56 rounded-2xl overflow-hidden border border-slate-200">
              <MapComponent
                center={[report.location.lat, report.location.lon]}
                zoom={15}
                reports={[report]}
                height="100%"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Address:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">{report.address || 'Ward 4 Sector'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Coordinates:</span>
                <span className="font-mono text-slate-700">{report.location.lat.toFixed(4)}, {report.location.lon.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Metadata Cards */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Municipal Operations Context
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Assigned Team
                </span>
                <span className="font-bold text-slate-900">
                  {report.assigned_name || 'Triage Intake Pool'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Target SLA Date
                </span>
                <span className="font-bold text-slate-900">
                  {report.due_date || 'Standard 48h Resolution'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  Filing Citizen
                </span>
                <span className="font-bold text-slate-900">
                  {report.creator_name || 'Sarah Jenkins (Verified)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
