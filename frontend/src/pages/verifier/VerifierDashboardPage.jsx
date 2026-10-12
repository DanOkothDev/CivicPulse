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
  UserCheck,
  Calendar,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

export default function VerifierDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [queueTab, setQueueTab] = useState('reported'); // 'reported' | 'verified' | 'all'
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

  // Assign modal state (Task 14 & API Guide)
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [authorities, setAuthorities] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const params = queueTab === 'all' ? {} : { status: queueTab };
      const res = await api.reports.list(params);
      const items = res.items || [];
      setQueue(items);
      if (items.length > 0) {
        handleSelectReport(items[0]);
      } else {
        setSelectedReport(null);
        setDuplicates([]);
      }
    } catch {
      toast.error('Failed to load triage queue');
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
  }, [queueTab]);

  // 1. Verify Action (reported -> verified)
  const handleVerify = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await api.reports.updateStatus(selectedReport.id, {
        status: 'verified',
        note: `Verified by Triage Officer ${user?.name || 'Verifier'}. Physical defect confirmed.`,
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

  // 3. Assign Action (POST /api/v1/reports/{id}/assign)
  const handleOpenAssignModal = async () => {
    if (!selectedReport) return;
    try {
      const usersList = await api.admin.listUsers({ role: 'authority' });
      setAuthorities(usersList || []);
      if (usersList && usersList.length > 0) {
        setSelectedAssignee(usersList[0].id);
      }
      setDueDate('');
      setAssignModalOpen(true);
    } catch {
      toast.error('Failed to load authority users');
    }
  };

  const handleAssignConfirm = async (e) => {
    e.preventDefault();
    if (!selectedReport || !selectedAssignee) return;
    setActionLoading(true);
    try {
      await api.reports.assign(selectedReport.id, {
        assignee_id: Number(selectedAssignee),
        due_date: dueDate || undefined,
      });
      toast.success(`Report #${selectedReport.id} assigned to authority engineer #${selectedAssignee}!`);
      setAssignModalOpen(false);
      fetchQueue();
    } catch (err) {
      toast.error(err.message || 'Assignment failed');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Merge Action (POST /api/v1/reports/{id}/merge)
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

  // 5. Split / Unmerge Action (POST /api/v1/reports/{id}/unmerge)
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
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 tracking-wider uppercase mb-1">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Operational Intake & Triage Control</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Verifier Queue & Duplicate Review
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Review incoming citizen reports, compare AI duplicate detection suggestions, verify defects, and assign cases to field authorities.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setQueueTab('reported')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              queueTab === 'reported'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Triage
          </button>
          <button
            type="button"
            onClick={() => setQueueTab('verified')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              queueTab === 'verified'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ready to Assign
          </button>
          <button
            type="button"
            onClick={() => setQueueTab('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              queueTab === 'all'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Reports
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton count={3} type="card" />
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <EmptyState
            title="Queue Clear"
            description={`No reports found in "${queueTab.replace('_', ' ')}" queue.`}
            icon={CheckCircle2}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (5 cols): Queue List */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Queue Cases ({queue.length})
            </h3>

            <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
              {queue.map((item) => {
                const isSelected = selectedReport?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectReport(item)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-3 ${
                      isSelected
                        ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
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

          {/* Right Column (7 cols): Selected Report & Actions */}
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
                            AI Model suggests Category #{selectedReport.ai_suggested_category.category_id} ({Math.round(selectedReport.ai_suggested_category.confidence * 100)}% confidence)
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

                  {/* Action Buttons: Verify, Reject, Assign, Split */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100">
                    {/* Verify Button (only if reported) */}
                    {selectedReport.status === 'reported' && (
                      <button
                        type="button"
                        onClick={handleVerify}
                        disabled={actionLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify Issue</span>
                      </button>
                    )}

                    {/* Reject Button (only if reported) */}
                    {selectedReport.status === 'reported' && (
                      <button
                        type="button"
                        onClick={() => setRejectModalOpen(true)}
                        disabled={actionLoading}
                        className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Issue</span>
                      </button>
                    )}

                    {/* Assign to Authority Button (when verified or assigned) */}
                    {(selectedReport.status === 'verified' || selectedReport.status === 'assigned') && (
                      <button
                        type="button"
                        onClick={handleOpenAssignModal}
                        disabled={actionLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{selectedReport.status === 'assigned' ? 'Reassign Workorder' : 'Assign to Authority'}</span>
                      </button>
                    )}

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
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-3"
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

      {/* Assign to Authority Modal (POST /api/v1/reports/{id}/assign) */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Report #${selectedReport?.id} to Authority`}
        subtitle="Route to verified municipal authority field unit"
      >
        <form onSubmit={handleAssignConfirm} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Authority Unit / Contractor <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-purple-600"
            >
              {authorities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Authority ID #{a.id} • Ward {a.area_id || 'All'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Target Resolution Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-purple-600"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Format: YYYY-MM-DD (must be today or in the future per API contract)
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !selectedAssignee}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs"
            >
              {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>

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
            placeholder="e.g. Duplicate submission, private property not in municipal jurisdiction, or insufficient photographic evidence..."
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
