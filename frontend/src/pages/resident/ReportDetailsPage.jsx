import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  ThumbsUp,
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
        toast.error(`Could not load report details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleToggleFollow = async () => {
    try {
      const nowFollowing = await api.reports.toggleFollow(id, following);
      setFollowing(nowFollowing);
      toast.success(nowFollowing ? 'Now following this incident updates' : 'Removed from following list');
      setReport(prev => ({
        ...prev,
        is_following: nowFollowing,
      }));
    } catch (error) {
      toast.error(`Could not update follow status: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto rounded-3xl bg-[#E6F5F8] p-4 sm:p-6 space-y-4">
        <LoadingSkeleton count={2} type="card" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-3xl mx-auto rounded-3xl bg-[#E6F5F8] border border-[#cfe9f0] p-8 text-center">
        <h3 className="text-base font-extrabold text-[#4a4a4a]">Report Not Found</h3>
        <Link to="/community-map" className="text-[#0B5A9C] text-xs font-bold hover:underline mt-2 inline-block">
          Return to map
        </Link>
      </div>
    );
  }

  return (
    <div className="relative isolate max-w-6xl mx-auto overflow-hidden rounded-3xl bg-[#E6F5F8] p-4 sm:p-6 space-y-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 -z-10 h-80 w-80 rounded-full bg-gradient-to-br from-[#38C6DC]/30 to-[#0B5A9C]/20 blur-2xl"
      />
      {/* Back button & dossier ID bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#cfe9f0]">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 rounded-xl bg-white/80 border border-[#cfe9f0] hover:bg-white text-[#5F5F5F] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#0B5A9C]">
                #RPT-{report.id}
              </span>
              <StatusBadge status={report.status} />
              {report.ai_suggested_category && (
                <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span>
                    AI suggestion: {report.ai_suggested_category.name} (
                    {Math.round(report.ai_suggested_category.confidence * 100)}%)
                  </span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#4a4a4a] tracking-tight mt-2">
              {report.category?.name} Report Details
            </h1>
          </div>
        </div>

        {/* Follow / Upvote Button */}
        <div className="flex items-center gap-2.5">
          <button
            data-tour="report-follow"
            onClick={handleToggleFollow}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              following
                ? 'bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C] text-white shadow-[0_8px_18px_-8px_rgba(11,90,156,0.7)]'
                : 'bg-white text-[#0B5A9C] border border-[#cfe9f0] hover:bg-[#f4fbfd]'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${following ? 'fill-white' : ''}`} />
            <span>{following ? 'Following Report' : 'Follow Report'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Photo evidence & description */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Photo Card */}
          <div className="bg-white/80 rounded-3xl border border-[#cfe9f0] overflow-hidden shadow-[0_10px_30px_-14px_rgba(11,90,156,0.3)]">
            <div className="relative h-72 sm:h-96 bg-[#0B5A9C]">
              <img
                src={report.photo_url}
                alt={report.category?.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-[#0B5A9C]/85 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                Submitted photo
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1B8FC0] mb-2">
                Physical Description & Triage Notes
              </h3>
              <p className="text-sm text-[#4a4a4a] leading-relaxed">
                {report.description}
              </p>

              {report.landmark && (
                <div className="mt-4 p-3 bg-[#E6F5F8] rounded-2xl border border-[#cfe9f0] text-xs text-[#5F5F5F] flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#1B8FC0] shrink-0 mt-0.5" />
                  <span><strong>Landmark reference:</strong> {report.landmark}</span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail Timeline */}
          <div className="bg-white/80 rounded-3xl border border-[#cfe9f0] p-5 sm:p-6 shadow-[0_10px_30px_-14px_rgba(11,90,156,0.3)]">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#cfe9f0]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#1B8FC0]" />
                <h3 className="text-sm font-extrabold text-[#4a4a4a]">
                  Lifecycle Audit Trail & Status Events
                </h3>
              </div>
              <span className="text-xs font-semibold text-[#7a8a90]">
                {history.length} Event{history.length !== 1 ? 's' : ''} Recorded
              </span>
            </div>

            <Timeline events={history} />
          </div>
        </div>

        {/* Right Column (5 cols): Spatial location & metadata */}
        <div className="lg:col-span-5 space-y-6">
          {/* Map snapshot */}
          <div className="bg-white/80 rounded-3xl border border-[#cfe9f0] p-5 shadow-[0_10px_30px_-14px_rgba(11,90,156,0.3)] space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1B8FC0]">
              Geographic Telemetry & Coordinates
            </h3>

            <div className="h-56 rounded-2xl overflow-hidden border border-[#cfe9f0]">
              <MapComponent
                center={[report.location.lat, report.location.lon]}
                zoom={15}
                reports={[report]}
                height="100%"
              />
            </div>

            <div className="p-3 bg-[#E6F5F8] border border-[#cfe9f0] rounded-2xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#5F5F5F]">Address:</span>
                <span className="font-semibold text-[#4a4a4a] truncate max-w-[200px]">
                  {report.area_id == null ? 'No service area assigned' : `Area ${report.area_id}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F5F5F]">Coordinates:</span>
                <span className="font-mono text-[#0B5A9C]">{report.location.lat.toFixed(4)}, {report.location.lon.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F5F5F]">Responsible county:</span>
                <span className="font-semibold text-[#0B5A9C]">{report.county?.name || 'Unavailable'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F5F5F]">Responsible department:</span>
                <span className="font-semibold text-[#4a4a4a]">{report.department?.name || 'Not assigned'}</span>
              </div>
            </div>
          </div>

          {/* Metadata Cards */}
          <div className="bg-white/80 rounded-3xl border border-[#cfe9f0] p-5 shadow-[0_10px_30px_-14px_rgba(11,90,156,0.3)] space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1B8FC0]">
              Municipal Operations Context
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#E6F5F8] border border-[#cfe9f0]">
                <span className="text-[#5F5F5F] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#1B8FC0]" />
                  Assigned Team
                </span>
                <span className="font-bold text-[#4a4a4a] text-right">
                  {report.assigned_to == null ? 'Not assigned' : `User #${report.assigned_to}`}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#E6F5F8] border border-[#cfe9f0]">
                <span className="text-[#5F5F5F] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1B8FC0]" />
                  Target SLA Date
                </span>
                <span className="font-bold text-[#4a4a4a] text-right">
                  {report.due_date || 'Not set'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#E6F5F8] border border-[#cfe9f0]">
                <span className="text-[#5F5F5F] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#1B8FC0]" />
                  Filing Citizen
                </span>
                <span className="font-bold text-[#4a4a4a] text-right">
                  {report.created_by == null ? 'Unavailable' : `User #${report.created_by}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
