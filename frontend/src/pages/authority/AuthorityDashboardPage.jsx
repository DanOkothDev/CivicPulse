import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  ArrowRight,
  MapPin,
  Calendar,
  Building2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatisticCard from '../../components/ui/StatisticCard';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import MapComponent from '../../components/ui/MapComponent';
import Modal from '../../components/ui/Modal';

export default function AuthorityDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [assignedReports, setAssignedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('in_progress');
  const [statusNote, setStatusNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAssigned = async () => {
    setLoading(true);
    try {
      const res = await api.reports.list();
      // Filter for items relevant to field crew (assigned or in_progress)
      const fieldWork = (res.items || []).filter(
        (r) => r.status === 'assigned' || r.status === 'in_progress' || r.status === 'resolved'
      );
      setAssignedReports(fieldWork);
    } catch {
      toast.error('Failed to load assigned workorders');
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
    setStatusNote('');
    setStatusModalOpen(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    setActionLoading(true);
    try {
      await api.reports.updateStatus(selectedReport.id, {
        status: newStatus,
        note: statusNote || `Status updated to ${newStatus} by field crew ${user?.name || 'Alex Chen'}.`,
      });
      toast.success(`Workorder #${selectedReport.id} transitioned to ${newStatus}!`);
      setStatusModalOpen(false);
      fetchAssigned();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Incident',
      accessor: 'id',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <img src={r.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
          <div>
            <span className="font-mono font-bold text-slate-900 block text-xs">#RPT-{r.id}</span>
            <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px] block">{r.category?.name}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Location',
      accessor: 'address',
      render: (r) => (
        <span className="text-xs text-slate-700 font-medium truncate max-w-[180px] block">
          {r.address || 'Ward 4'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (r) => <StatusBadge status={r.status} size="xs" />,
    },
    {
      header: 'Target Due Date',
      accessor: 'due_date',
      render: (r) => (
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {r.due_date || 'Standard SLA'}
        </span>
      ),
    },
    {
      header: 'Field Actions',
      accessor: 'actions',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.status === 'assigned' && (
            <button
              onClick={() => handleOpenStatusModal(r, 'in_progress')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Play className="w-3 h-3" />
              <span>Start Work</span>
            </button>
          )}
          {r.status === 'in_progress' && (
            <button
              onClick={() => handleOpenStatusModal(r, 'resolved')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Mark Resolved</span>
            </button>
          )}
          {r.status === 'resolved' && (
            <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
              ✔ Closed Out
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 tracking-wider uppercase mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Field Superintendent • Dispatch Operations</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Authority Field Dashboard & Work Orders
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Manage assigned infrastructure repairs, advance work orders to In Progress, and record resolution notes with completion verification.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl px-4 py-2 text-xs font-bold flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Active Field Unit: Crew 4B (Rapid Response)</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatisticCard
          title="Assigned Workorders"
          value={assignedReports.length}
          subtext="Active"
          badgeText="Crew Queue"
          badgeType="primary"
          icon={Wrench}
        />
        <StatisticCard
          title="In Progress Now"
          value={assignedReports.filter(r => r.status === 'in_progress').length}
          subtext="Under Repair"
          badgeText="Field Crew Deployed"
          badgeType="warning"
          icon={Clock}
          iconBg="bg-amber-50 text-amber-600"
        />
        <StatisticCard
          title="Completed This Week"
          value={assignedReports.filter(r => r.status === 'resolved').length}
          subtext="Closed"
          badgeText="100% SLA Compliance"
          badgeType="success"
          icon={CheckCircle2}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatisticCard
          title="Avg Dispatch Velocity"
          value="42"
          subtext="Min"
          badgeText="+18.4% faster"
          badgeType="success"
          icon={ShieldAlert}
        />
      </div>

      {/* Map Overview of Assigned Issues */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Field Unit Spatial Workorder Map
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            {assignedReports.length} Geocoded Pins
          </span>
        </div>
        <div className="h-64 rounded-2xl overflow-hidden border border-slate-200">
          <MapComponent
            center={[-1.2629, 36.8355]}
            zoom={13}
            reports={assignedReports}
            height="100%"
          />
        </div>
      </div>

      {/* Assigned Reports Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Assigned Tasks & Progress Upgrades
        </h3>
        <DataTable
          columns={columns}
          data={assignedReports}
          loading={loading}
          emptyMessage="No assigned work orders"
          emptySubtext="Field dispatch queue is clear."
        />
      </div>

      {/* Modal for Status Transition */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Update Status: Case #RPT-${selectedReport?.id}`}
        subtitle={`Transitioning to ${newStatus.replace('_', ' ').toUpperCase()}`}
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Field Engineer Note / Completion Summary <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              required
              placeholder="e.g. Asphalt patched and compacted. Safety barricades removed. Site cleared."
              className="w-full p-3 bg-slate-50 focus:bg-white text-xs border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Confirm Status Transition</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
