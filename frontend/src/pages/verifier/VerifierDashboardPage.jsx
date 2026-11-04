import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  ShieldCheck,
  XCircle,
  GitMerge,
  Split,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import ConfirmationDialog from "../../components/ui/ConfirmationDialog";
import LoadingSkeleton from "../../components/ui/LoadingSkeleton";
import EmptyState from "../../components/ui/EmptyState";

/*
  Palette (arbitrary Tailwind values, so no theme config is needed):
  light #e6f5f8 | cyan #3cc3dd | blue #1a77ab | deep #0d5694 | grey #626569
*/

const gradientSquare =
  "bg-gradient-to-br from-[#3cc3dd] to-[#0d5694] text-white shadow-lg shadow-[#0d5694]/25";

const gradientButton =
  "bg-gradient-to-b from-[#3cc3dd] to-[#0d5694] text-white shadow-md shadow-[#0d5694]/25";

const card =
  "rounded-3xl bg-white p-6 shadow-lg shadow-[#0d5694]/5 ring-1 ring-[#0d5694]/5";

const fieldClass =
  "w-full rounded-lg border border-[#d3eaf0] bg-[#f3fafc] p-3 text-xs text-[#2a2f33] outline-none transition placeholder:text-[#8a9399] focus:border-[#3cc3dd] focus:bg-white focus:ring-4 focus:ring-[#3cc3dd]/20";

export default function VerifierDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [queue, setQueue] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Merge modal state
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeParentId, setMergeParentId] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      // Pending triage: reports with status 'reported'
      const res = await api.reports.list({ status: "reported" });
      setQueue(res.items || []);
      if (res.items?.length > 0) {
        handleSelectReport(res.items[0]);
      } else {
        setSelectedReport(null);
        setDuplicates([]);
      }
    } catch (error) {
      toast.error(`Could not load verifier queue: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = async (report) => {
    setSelectedReport(report);
    try {
      const dups = await api.reports.getDuplicates(report.id);
      setDuplicates(dups);
    } catch (error) {
      setDuplicates([]);
      toast.error(`Could not load duplicate suggestions: ${error.message}`);
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
        status: "verified",
        note: `Verified by Triage Officer ${user?.name || "J. Ramirez"}. Physical defect confirmed.`,
      });
      toast.success(
        `Report #${selectedReport.id} verified and moved to Verified state!`,
      );
      fetchQueue();
    } catch (err) {
      toast.error(err.message || "Verification failed");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Reject Action (reported -> rejected with mandatory note)
  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      toast.error(
        "Please specify a rejection reason for municipal audit records",
      );
      return;
    }
    setActionLoading(true);
    try {
      await api.reports.updateStatus(selectedReport.id, {
        status: "rejected",
        note: rejectReason.trim(),
      });
      toast.success(`Report #${selectedReport.id} rejected.`);
      setRejectModalOpen(false);
      setRejectReason("");
      fetchQueue();
    } catch (err) {
      toast.error(err.message || "Rejection failed");
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
      toast.success(
        `Report #${selectedReport.id} merged into Parent #${mergeParentId}`,
      );
      setMergeModalOpen(false);
      fetchQueue();
    } catch (err) {
      toast.error(err.message || "Merge failed");
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
      toast.success(
        `Report #${selectedReport.id} unmerged into its own active case.`,
      );
      fetchQueue();
    } catch (err) {
      toast.error(err.message || "Split failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header banner */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#3cc3dd] via-[#1a77ab] to-[#0d5694] p-6 text-white shadow-xl shadow-[#0d5694]/15 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-1/3 top-6 hidden h-8 w-8 rotate-12 rounded-lg bg-white/25 sm:block" />

        <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
              <CheckSquare className="h-4 w-4" />
              <span>Operations Desk • Verifier Triage Engine</span>
            </div>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Verifier Queue & Duplicate Resolution
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">
              Review incoming citizen reports, compare AI duplicate detection
              suggestions, and verify or merge cases.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-3xl border border-white/30 bg-white/15 px-5 py-4 backdrop-blur-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/25">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold leading-none">
                {queue.length}
              </p>
              <p className="mt-1 text-xs text-white/85">Pending Intake Items</p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <LoadingSkeleton count={3} type="card" />
      ) : queue.length === 0 ? (
        <div className={`${card} p-12 text-center`}>
          <EmptyState
            title="Triage Queue Clear"
            description="All reported municipal infrastructure items have been verified or triaged!"
            icon={CheckCircle2}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left Column (5 cols): Pending Queue List */}
          <div className="min-w-0 space-y-3 lg:col-span-5">
            <h3 className="mb-2 text-sm font-extrabold text-[#626569]">
              Pending Reports ({queue.length})
            </h3>

            <div className="space-y-3">
              {queue.map((item) => {
                const isSelected = selectedReport?.id === item.id;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectReport(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectReport(item);
                      }
                    }}
                    className={`flex cursor-pointer gap-3 rounded-3xl bg-white p-4 outline-none transition-all ${
                      isSelected
                        ? "shadow-xl shadow-[#0d5694]/10 ring-2 ring-[#3cc3dd]"
                        : "shadow-lg shadow-[#0d5694]/5 ring-1 ring-[#0d5694]/5 hover:-translate-y-0.5 hover:ring-[#3cc3dd]/60 focus-visible:ring-[#3cc3dd]/60"
                    }`}
                  >
                    <img
                      src={item.photo_url}
                      alt={item.category?.name}
                      className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-[#0d5694]/10"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-[#0d5694]">
                          #RPT-{item.id}
                        </span>
                        <StatusBadge status={item.status} size="xs" />
                      </div>

                      <h4 className="mb-1 truncate text-sm font-extrabold text-[#626569]">
                        {item.category?.name}
                      </h4>
                      <p className="mb-1.5 line-clamp-1 text-xs text-[#626569]">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between gap-2 text-[10px] text-[#626569]/80">
                        <span className="flex min-w-0 items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0 text-[#3cc3dd]" />
                          <span className="truncate">
                            {item.location
                              ? `${item.location.lat.toFixed(5)}, ${item.location.lon.toFixed(5)}`
                              : "Location unavailable"}
                          </span>
                        </span>
                        <span className="shrink-0">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (7 cols): Selected Report & Duplicate Suggestions */}
          <div className="min-w-0 space-y-6 lg:col-span-7">
            {selectedReport && (
              <>
                {/* Active Report Inspector Card */}
                <div className={`${card} space-y-5 sm:p-7`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6f5f8] pb-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${gradientSquare}`}
                      >
                        <CheckSquare className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="block font-mono text-xs font-bold text-[#3cc3dd]">
                          #RPT-{selectedReport.id}
                        </span>
                        <h2 className="truncate text-lg font-extrabold text-[#626569]">
                          {selectedReport.category?.name}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={selectedReport.status} />
                    </div>
                  </div>

                  {/* Photo & Metadata */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <img
                      src={selectedReport.photo_url}
                      alt="Defect"
                      className="h-48 w-full rounded-2xl object-cover shadow-md ring-1 ring-[#0d5694]/10"
                    />
                    <div className="min-w-0 space-y-3 text-xs">
                      <div className="rounded-2xl bg-[#e6f5f8] p-3">
                        <span className="block font-bold text-[#1a77ab]">
                          Reported Location
                        </span>
                        <span className="break-words font-semibold text-[#2a2f33]">
                          {selectedReport.address}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-[#e6f5f8] p-3">
                        <span className="block font-bold text-[#1a77ab]">
                          Coordinates
                        </span>
                        <span className="font-mono text-[#2a2f33]">
                          {selectedReport.location?.lat.toFixed(4)},{" "}
                          {selectedReport.location?.lon.toFixed(4)}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-[#e6f5f8] p-3">
                        <span className="block font-bold text-[#1a77ab]">
                          Reported By
                        </span>
                        <span className="font-semibold text-[#2a2f33]">
                          {selectedReport.creator_name || "Resident"}
                        </span>
                      </div>
                      {selectedReport.ai_suggested_category && (
                        <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[#3cc3dd] to-[#0d5694] p-3 text-white shadow-md shadow-[#0d5694]/20">
                          <Sparkles className="h-4 w-4 shrink-0" />
                          <span className="font-semibold">
                            Suggested category #
                            {selectedReport.ai_suggested_category.category_id} (
                            {Math.round(
                              selectedReport.ai_suggested_category.confidence *
                                100,
                            )}
                            % confidence)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="mb-2 block text-xs font-extrabold text-[#626569]">
                      Citizen Description
                    </span>
                    <p className="break-words rounded-2xl bg-[#e6f5f8] p-4 text-xs leading-relaxed text-[#2a2f33]">
                      {selectedReport.description}
                    </p>
                  </div>

                  {/* Action Buttons: Verify, Merge, Split, Reject */}
                  <div className="flex flex-wrap items-center gap-2.5 border-t border-[#e6f5f8] pt-5">
                    {/* Verify Button */}
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={actionLoading}
                      className={`flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-xs font-extrabold tracking-wide transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${gradientButton}`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verify Issue</span>
                    </button>

                    {/* Reject Button */}
                    <button
                      type="button"
                      onClick={() => setRejectModalOpen(true)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Reject Issue</span>
                    </button>

                    {/* Split / Unmerge if already merged */}
                    {selectedReport.duplicate_of && (
                      <button
                        type="button"
                        onClick={handleSplit}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 rounded-lg border border-[#d3eaf0] bg-white px-5 py-2.5 text-xs font-bold text-[#0d5694] transition hover:bg-[#e6f5f8] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Split className="h-4 w-4" />
                        <span>Split / Unmerge</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Duplicate Suggestions Panel */}
                <div className={`${card} space-y-4 sm:p-7`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6f5f8] pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-1.5 ${gradientSquare}`}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-extrabold text-[#626569]">
                        Possible duplicate reports
                      </h3>
                    </div>
                    <span className="rounded-full bg-[#e6f5f8] px-3 py-1 text-xs font-bold text-[#0d5694]">
                      {duplicates.length} Matches Found
                    </span>
                  </div>

                  {duplicates.length === 0 ? (
                    <p className="rounded-2xl bg-[#e6f5f8] py-4 text-center text-xs text-[#626569]">
                      No similar reports were found nearby.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {duplicates.map((dup) => (
                        <div
                          key={dup.report_id}
                          className="space-y-3 rounded-2xl bg-[#e6f5f8] p-4 transition-all hover:shadow-md hover:shadow-[#0d5694]/10"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#0d5694]">
                                Existing Case #RPT-{dup.report_id}
                              </span>
                              <span className="rounded-full bg-gradient-to-r from-[#3cc3dd] to-[#0d5694] px-2.5 py-0.5 text-[10px] font-bold text-white">
                                {Math.round(dup.score * 100)}% Similarity
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setMergeParentId(dup.report_id);
                                setMergeModalOpen(true);
                              }}
                              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold transition hover:brightness-110 ${gradientButton}`}
                            >
                              <GitMerge className="h-3.5 w-3.5" />
                              <span>Merge into #{dup.report_id}</span>
                            </button>
                          </div>

                          {/* Reasons Breakdown Grid */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                            <div className="rounded-xl bg-white p-2.5">
                              <span className="block text-[10px] text-[#626569]">
                                Location Proximity
                              </span>
                              <span className="font-bold text-[#0d5694]">
                                {dup.reasons?.location == null
                                  ? "Not provided"
                                  : `${Math.round(dup.reasons.location * 100)}% Match`}
                              </span>
                            </div>
                            <div className="rounded-xl bg-white p-2.5">
                              <span className="block text-[10px] text-[#626569]">
                                Category
                              </span>
                              <span className="font-bold text-[#1a77ab]">
                                {dup.reasons?.category == null
                                  ? "Not provided"
                                  : `${Math.round(dup.reasons.category * 100)}% Match`}
                              </span>
                            </div>
                            <div className="rounded-xl bg-white p-2.5">
                              <span className="block text-[10px] text-[#626569]">
                                Time Window
                              </span>
                              <span className="font-bold text-[#2a2f33]">
                                {dup.reasons?.time == null
                                  ? "Not provided"
                                  : `${Math.round(dup.reasons.time * 100)}% Match`}
                              </span>
                            </div>
                            <div className="rounded-xl bg-white p-2.5">
                              <span className="block text-[10px] text-[#626569]">
                                Photo Visual
                              </span>
                              <span className="font-bold text-[#0b3f78]">
                                {dup.reasons?.photo == null
                                  ? "Not provided"
                                  : `${Math.round(dup.reasons.photo * 100)}% Match`}
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
          <label className="mb-1 block text-xs font-bold text-[#626569]">
            Reason for Rejection <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Duplicate duplicate submission, private property not in municipal jurisdiction, or insufficient photographic evidence..."
            className={fieldClass}
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
