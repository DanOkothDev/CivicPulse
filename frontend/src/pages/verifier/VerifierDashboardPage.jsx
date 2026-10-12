import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  ShieldCheck,
  XCircle,
  GitMerge,
  Split,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Filter,
  CheckCircle2,
  ThumbsUp,
  Building2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function VerifierDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [queue, setQueue] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Merge modal state
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeParentId, setMergeParentId] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      // Pending triage: reports with status 'reported'
      const res = await api.reports.list({ status: 'reported' });
      setQueue(res.items || []);
      if (res.items?.length > 0) {
        handleSelectReport(res.items[0]);
      } else {
        setSelectedReport(null);
        setDuplicates([]);
      }
    } catch {
      toast.error('Could not load verifier queue');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = async (report) => {
    setSelectedReport(report);
    try {
      const dups = await api.reports.getDuplicates(report.id);
      setDuplicates(dups);
    } catch {
      setDuplicates([]);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // 1. Verify Action (reported -> verified)
  const handleVerify = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await api.reports.updateStatus(selectedReport.id, {
        status: 'verified',
        note: `Verified by Triage Officer ${user?.name || 'J. Ramirez'}. Physical defect confirmed.`,
      });
      toast.success(`Report #${selectedReport.id} verified and moved to Verified state!`);
      fetchQueue();
    } catch (err) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Reject Action (reported -> rejected with mandatory note)
  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please specify a rejection reason for municipal audit records');
      return;
    }
    setActionLoading(true);
    try {
      await api.reports.updateStatus(selectedReport.id, {
        status: 'rejected',
        note: rejectReason.trim(),
      });
      toast.success(`Report #${selectedReport.id} rejected.`);
      setRejectModalOpen(false);
      setRejectReason('');
      fetchQueue();
    } catch (err) {
      toast.error(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Merge Action
  const handleMergeConfirm = async () => {
    if (!selectedReport || !mergeParentId) return;
    setActionLoading(true);
    try {
      await api.reports.merge(selectedReport.id, mergeParentId);
      toast.success(`Report #${selectedReport.id} merged into Parent #${mergeParentId}`);
      setMergeModalOpen(false);
      fetchQueue();
    } catch (err) {
      toast.error(err.message || 'Merge failed');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Split / Unmerge Action
  const handleSplit = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await api.reports.unmerge(selectedReport.id);
      toast.success(`Report #${selectedReport.id} unmerged into its own active case.`);
      fetchQueue();
    } catch (err) {
      toast.error(err.message || 'Split failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 tracking-wider uppercase mb-1">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Operations Desk • Verifier Triage Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Verifier Queue & Duplicate Resolution
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Review incoming citizen reports, compare AI duplicate detection suggestions, and verify or merge cases.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl px-4 py-2 text-xs font-bold flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>{queue.length} Pending Intake Items</span>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton count={3} type="card" />
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <EmptyState
            title="Triage Queue Clear"
            description="All reported municipal infrastructure items have been verified or triaged!"
            icon={CheckCircle2}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (5 cols): Pending Queue List */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Pending Reports ({queue.length})
            </h3>

            <div className="space-y-3">
              {queue.map((item) => {
                const isSelected = selectedReport?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectReport(item)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-3 ${
                      isSelected
                        ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <img
                      src={item.photo_url}
                      alt={item.category?.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          #RPT-{item.id}
                        </span>
                        <StatusBadge status={item.status} size="xs" />
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 truncate mb-1">
                        {item.category?.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mb-1.5">
                        {item.description}
                      </p>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>{item.address || 'Ward 4'}</span>
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (7 cols): Selected Report & Duplicate Suggestions */}
          <div className="lg:col-span-7 space-y-6">
            {selectedReport && (
              <>
                {/* Active Report Inspector Card */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-600 block">
                        #RPT-{selectedReport.id}
                      </span>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        {selectedReport.category?.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={selectedReport.status} />
                    </div>
                  </div>

                  {/* Photo & Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <img
                      src={selectedReport.photo_url}
                      alt="Defect"
                      className="w-full h-48 rounded-2xl object-cover border border-slate-100 shadow-inner"
                    />
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 block font-semibold">Reported Location</span>
                        <span className="font-bold text-slate-800">{selectedReport.address}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Coordinates</span>
                        <span className="font-mono text-slate-700">
                          {selectedReport.location?.lat.toFixed(4)}, {selectedReport.location?.lon.toFixed(4)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Reported By</span>
                        <span className="font-bold text-slate-800">{selectedReport.creator_name || 'Resident'}</span>
                      </div>
                      {selectedReport.ai_suggested_category && (
                        <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                          <span>
                            AI Model suggests Category ID #{selectedReport.ai_suggested_category.category_id} ({Math.round(selectedReport.ai_suggested_category.confidence * 100)}% confidence)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Citizen Description
                    </span>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                      {selectedReport.description}
                    </p>
                  </div>

                  {/* Action Buttons: Verify, Merge, Split, Reject */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100">
                    {/* Verify Button */}
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Issue</span>
                    </button>

                    {/* Reject Button */}
                    <button
                      type="button"
                      onClick={() => setRejectModalOpen(true)}
                      disabled={actionLoading}
                      className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Issue</span>
                    </button>

                    {/* Split / Unmerge if already merged */}
                    {selectedReport.duplicate_of && (
                      <button
                        type="button"
                        onClick={handleSplit}
                        disabled={actionLoading}
                        className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <Split className="w-4 h-4" />
                        <span>Split / Unmerge</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Duplicate Suggestions Panel */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        AI Duplicate Suggestions (Task 13 Detector)
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {duplicates.length} Matches Found
                    </span>
                  </div>

                  {duplicates.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      No nearby duplicate candidates found within 200m radius.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {duplicates.map((dup) => (
                        <div
                          key={dup.report_id}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800">
                                Existing Case #RPT-{dup.report_id}
                              </span>
                              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {Math.round(dup.score * 100)}% Similarity
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setMergeParentId(dup.report_id);
                                setMergeModalOpen(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <GitMerge className="w-3.5 h-3.5" />
                              <span>Merge into #{dup.report_id}</span>
                            </button>
                          </div>

                          {/* Reasons Breakdown Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            <div className="p-2 bg-white rounded-lg border border-slate-100">
                              <span className="text-slate-400 block text-[10px]">Location Proximity</span>
                              <span className="font-bold text-emerald-600">
                                {Math.round((dup.reasons?.location || 0.9) * 100)}% Match
                              </span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-100">
                              <span className="text-slate-400 block text-[10px]">Category</span>
                              <span className="font-bold text-blue-600">
                                {Math.round((dup.reasons?.category || 0.95) * 100)}% Match
                              </span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-100">
                              <span className="text-slate-400 block text-[10px]">Time Window</span>
                              <span className="font-bold text-slate-700">
                                {Math.round((dup.reasons?.time || 0.84) * 100)}% Match
                              </span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-100">
                              <span className="text-slate-400 block text-[10px]">Photo Visual</span>
                              <span className="font-bold text-purple-600">
                                {Math.round((dup.reasons?.photo || 0.76) * 100)}% Match
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rejection Modal with Mandatory Reason */}
      <ConfirmationDialog
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
        title={`Reject Report #${selectedReport?.id}`}
        message="According to municipal workflow rules, rejecting a citizen report requires an explicit audit reason that will be visible to the resident."
        confirmText="Confirm Rejection"
        type="danger"
        loading={actionLoading}
      >
        <div className="mt-3">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Reason for Rejection <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Duplicate duplicate submission, private property not in municipal jurisdiction, or insufficient photographic evidence..."
            className="w-full p-3 bg-slate-50 focus:bg-white text-xs border border-slate-200 rounded-xl focus:border-rose-500 focus:outline-none"
          />
        </div>
      </ConfirmationDialog>

      {/* Merge Confirmation Modal */}
      <ConfirmationDialog
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        onConfirm={handleMergeConfirm}
        title="Confirm Report Merge"
        message={`Are you sure you want to merge report #${selectedReport?.id} into Parent #${mergeParentId}? The parent will aggregate the vote count and citizen followers.`}
        confirmText="Confirm Merge"
        type="primary"
        loading={actionLoading}
      />
    </div>
  );
}
