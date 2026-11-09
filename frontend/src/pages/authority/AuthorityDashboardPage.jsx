import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Wrench,
  CheckCircle2,
  Clock,
  Play,
  Calendar,
  Building2,
  MapPin,
  Check,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import StatisticCard from "../../components/ui/StatisticCard";
import StatusBadge from "../../components/ui/StatusBadge";
import DataTable from "../../components/ui/DataTable";
import MapComponent from "../../components/ui/MapComponent";
import Modal from "../../components/ui/Modal";

/*
  Theme (taken from reference landing page)
  mint background   #E6F5F8
  light cyan        #7FD0E0
  bright cyan       #38C6DC
  mid blue          #1B8FC0
  deep blue         #0B5A9C
  soft grey text    #5F5F5F
*/

const GRADIENT = "bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C]";

export default function AuthorityDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [assignedReports, setAssignedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("in_progress");
  const [statusNote, setStatusNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Load Montserrat font dynamically
  useEffect(() => {
    if (document.getElementById("montserrat-font")) return;
    const link = document.createElement("link");
    link.id = "montserrat-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  const fetchAssigned = async () => {
    setLoading(true);
    try {
      const res = await api.reports.list();
      // Filter reports assigned to this user in relevant status categories
      const fieldWork = (res.items || []).filter(
        (r) =>
          r.assigned_to === user?.id &&
          ["assigned", "in_progress", "resolved"].includes(r.status),
      );
      setAssignedReports(fieldWork);
    } catch (error) {
      toast.error(`Could not load assigned work orders: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssigned();
  }, []);

  const handleOpenStatusModal = (report, targetStatus) => {
    setSelectedReport(report);
    setNewStatus(targetStatus);
    setStatusNote("");
    setStatusModalOpen(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    setActionLoading(true);
    try {
      await api.reports.updateStatus(selectedReport.id, {
        status: newStatus,
        note:
          statusNote ||
          `Status updated to ${newStatus.replace("_", " ")} by ${user?.name || "assigned authority"}.`,
      });
      toast.success(
        `Report ID ${selectedReport.id} updated to ${newStatus.replace("_", " ")}.`,
      );
      setStatusModalOpen(false);
      fetchAssigned();
    } catch (err) {
      toast.error(err.message || "Status update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: "Incident",
      accessor: "id",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <img
            src={r.photo_url}
            alt=""
            className="w-10 h-10 rounded-xl object-cover border border-[#cfe9f0]"
          />
          <div>
            <span className="font-extrabold text-[#0B5A9C] block text-xs">
              Report {r.id}
            </span>
            <span className="text-[11px] text-[#5F5F5F] font-semibold truncate max-w-[140px] block">
              {r.category?.name || "General Defect"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Location",
      accessor: "location",
      render: (r) => (
        <span className="text-xs text-[#5F5F5F] font-medium truncate max-w-[180px] flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-[#1B8FC0] shrink-0" />
          {r.location
            ? `${r.location.lat.toFixed(4)}, ${r.location.lon.toFixed(4)}`
            : "Location unavailable"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (r) => <StatusBadge status={r.status} size="xs" />,
    },
    {
      header: "Due Date",
      accessor: "due_date",
      render: (r) => (
        <span className="text-xs font-semibold text-[#5F5F5F] flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-[#1B8FC0]" />
          {r.due_date || "Standard Schedule"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.status === "assigned" && (
            <button
              data-tour="authority-start-work"
              onClick={() => handleOpenStatusModal(r, "in_progress")}
              className="bg-[#0B5A9C] hover:bg-[#1B8FC0] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors shadow-xs"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start Work</span>
            </button>
          )}
          {r.status === "in_progress" && (
            <button
              data-tour="authority-resolve"
              onClick={() => handleOpenStatusModal(r, "resolved")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Mark Resolved</span>
            </button>
          )}
          {r.status === "resolved" && (
            <span className="text-emerald-700 font-extrabold text-[11px] flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Check className="w-3.5 h-3.5" />
              <span>Completed</span>
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div
      className="space-y-6 bg-[#E6F5F8] p-6 rounded-3xl border border-[#cfe9f0]"
      style={{
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#cfe9f0]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold text-[#1B8FC0] tracking-wider uppercase mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Field Management & Dispatch</span>
          </div>
          <h1 data-tour="authority-dashboard" className="text-2xl font-extrabold text-[#5F5F5F] tracking-tight">
            Authority Field Dashboard
          </h1>
          <p className="text-xs text-[#5F5F5F] mt-1 max-w-2xl leading-relaxed">
            Manage assigned infrastructure repairs, advance work orders through
            active progress, and record resolution notes with completion
            details.
          </p>
          <p className="text-xs font-bold text-[#0B5A9C] mt-2">
            {user?.county?.name || (user?.county_id ? `County #${user.county_id}` : "County not assigned")}
            {user?.department?.name ? ` · ${user.department.name}` : ""}
          </p>
        </div>

        <div className="bg-white/80 border border-[#7FD0E0] text-[#0B5A9C] rounded-2xl px-4 py-2 text-xs font-extrabold flex items-center gap-2 shadow-2xs">
          <Building2 className="w-4 h-4 text-[#1B8FC0]" />
          <span>Signed in as {user?.name || "Authority User"}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatisticCard
          title="Assigned Reports"
          value={assignedReports.filter((r) => r.status === "assigned").length}
          subtext="Pending start"
          badgeText="Assigned"
          badgeType="primary"
          icon={Wrench}
        />
        <StatisticCard
          title="In Progress"
          value={
            assignedReports.filter((r) => r.status === "in_progress").length
          }
          subtext="Under repair"
          badgeText="Active"
          badgeType="warning"
          icon={Clock}
          iconBg="bg-amber-50 text-amber-600"
        />
        <StatisticCard
          title="Resolved Reports"
          value={assignedReports.filter((r) => r.status === "resolved").length}
          subtext="Completed"
          badgeText="Resolved"
          badgeType="success"
          icon={CheckCircle2}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatisticCard
          title="Scheduled Tasks"
          value={assignedReports.filter((r) => r.due_date).length}
          subtext="Due date set"
          badgeText="Scheduled"
          badgeType="primary"
          icon={Calendar}
        />
      </div>

      {/* Map Overview of Assigned Issues */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-[#cfe9f0] p-5 shadow-[0_10px_30px_-15px_rgba(11,90,156,0.2)] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-[#5F5F5F]">
            Field Operations Map Overview
          </h3>
          <span className="text-xs text-[#1B8FC0] font-extrabold bg-[#E6F5F8] px-2.5 py-1 rounded-full border border-[#7FD0E0]">
            {assignedReports.length} Map Locations
          </span>
        </div>
        <div className="h-64 rounded-2xl overflow-hidden border border-[#cfe9f0]">
          <MapComponent
            center={[-1.2629, 36.8355]}
            zoom={13}
            reports={assignedReports}
            height="100%"
          />
        </div>
      </div>

      {/* Assigned Reports Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-[#cfe9f0] p-5 shadow-[0_10px_30px_-15px_rgba(11,90,156,0.2)] space-y-3">
        <h3 className="text-sm font-extrabold text-[#5F5F5F]">
          Assigned Work Orders
        </h3>
        <DataTable
          columns={columns}
          data={assignedReports}
          loading={loading}
          emptyMessage="No assigned work orders"
          emptySubtext="Your dispatch queue is currently clear."
        />
      </div>

      {/* Modal for Status Transition */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Update Status: Report ${selectedReport?.id}`}
        subtitle={`Updating status to ${newStatus.replace("_", " ")}`}
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-extrabold text-[#5F5F5F] mb-1">
              Field Completion Summary / Notes{" "}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              required
              placeholder="Enter details about work carried out, repairs completed, or site observations..."
              className="w-full p-3 bg-[#E6F5F8]/50 focus:bg-white text-xs text-[#5F5F5F] border border-[#cfe9f0] rounded-xl focus:border-[#38C6DC] focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#cfe9f0]">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-[#5F5F5F] hover:bg-[#E6F5F8] rounded-xl border border-[#cfe9f0] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className={`px-5 py-2 text-xs font-bold text-white ${GRADIENT} rounded-xl shadow-md transition-all flex items-center gap-2 hover:opacity-90`}
            >
              {actionLoading && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>Confirm Update</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
