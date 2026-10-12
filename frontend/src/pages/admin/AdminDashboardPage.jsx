import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Building,
  Users,
  Layers,
  MapPin,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Search,
  FileText,
  Flame,
  RefreshCw,
  Clock,
  AlertTriangle,
  Activity,
  Filter,
  CheckSquare,
  ArrowRight,
  Sliders,
  ExternalLink,
  Terminal,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import DataTable from '../../components/ui/DataTable';
import StatisticCard from '../../components/ui/StatisticCard';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab state synched with URL query param
  const activeTab = searchParams.get('tab') || 'reports';
  const setActiveTab = (tabId) => setSearchParams({ tab: tabId });

  // Data states
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [reportFilterStatus, setReportFilterStatus] = useState('all');
  const [reportSearch, setReportSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [recomputing, setRecomputing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, c, a, r] = await Promise.all([
        api.admin.listUsers(),
        api.reference.getCategories(),
        api.reference.getAreas(),
        api.reports.list(),
      ]);
      setUsers(u || []);
      setCategories(c || []);
      setAreas(a || []);
      setReports(r.items || []);
    } catch {
      toast.error('Failed to load administrative registries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecomputeHotspots = async () => {
    setRecomputing(true);
    try {
      const res = await api.analytics.recomputeHotspots({ eps_m: 250, min_samples: 3 });
      toast.success(`DBSCAN spatial clustering rebuilt! ${res?.clusters_created ?? 0} clusters generated.`);
    } catch {
      toast.error('Hotspot recomputation failed');
    } finally {
      setRecomputing(false);
    }
  };

  // Filtered lists
  const filteredReports = reports.filter((r) => {
    const matchesStatus = reportFilterStatus === 'all' || r.status === reportFilterStatus;
    const matchesSearch =
      !reportSearch ||
      r.description?.toLowerCase().includes(reportSearch.toLowerCase()) ||
      r.category?.name?.toLowerCase().includes(reportSearch.toLowerCase()) ||
      `#rpt-${r.id}`.includes(reportSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSearch =
      !userSearch ||
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  // Table Columns
  const reportColumns = [
    {
      header: 'Case ID',
      accessor: 'id',
      render: (r) => (
        <Link
          to={`/reports/${r.id}`}
          className="font-mono text-xs font-bold text-blue-600 hover:underline"
        >
          #RPT-{r.id}
        </Link>
      ),
    },
    {
      header: 'Defect',
      accessor: 'category',
      render: (r) => (
        <div className="flex items-center gap-2">
          <img src={r.photo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
          <div>
            <span className="font-bold text-xs text-slate-800 block">{r.category?.name}</span>
            <span className="text-[10px] text-slate-400 truncate max-w-xs block">
              {r.description}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (r) => (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
            r.status === 'resolved'
              ? 'bg-emerald-100 text-emerald-800'
              : r.status === 'rejected'
              ? 'bg-rose-100 text-rose-800'
              : r.status === 'in_progress'
              ? 'bg-orange-100 text-orange-800'
              : r.status === 'assigned'
              ? 'bg-purple-100 text-purple-800'
              : r.status === 'verified'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {r.status?.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Location / Ward',
      accessor: 'address',
      render: (r) => (
        <span className="text-xs text-slate-600 truncate max-w-[180px] block">
          {r.address || `GPS ${r.location?.lat?.toFixed(4)}, ${r.location?.lon?.toFixed(4)}`}
        </span>
      ),
    },
    {
      header: 'Submissions',
      accessor: 'report_count',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {r.report_count || 1} report(s)
        </span>
      ),
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (r) => (
        <span className="text-xs text-slate-500">
          {new Date(r.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const userColumns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (u) => <span className="font-mono text-xs text-slate-500">#{u.id}</span>,
    },
    {
      header: 'User',
      accessor: 'name',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
            {u.name?.charAt(0) || 'U'}
          </div>
          <div>
            <span className="font-bold text-xs text-slate-900 block">{u.name}</span>
            <span className="text-[11px] text-slate-400">{u.email || '(Email restricted)'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Current Role',
      accessor: 'role',
      render: (u) => (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
            u.role === 'admin'
              ? 'bg-purple-100 text-purple-800'
              : u.role === 'authority'
              ? 'bg-blue-100 text-blue-800'
              : u.role === 'verifier'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {u.role}
        </span>
      ),
    },
    {
      header: 'Electoral Ward',
      accessor: 'area_id',
      render: (u) => <span className="text-xs text-slate-600">Ward {u.area_id || 1}</span>,
    },
    {
      header: 'Provisioning Method',
      accessor: 'role',
      render: (u) => (
        <span className="text-[11px] font-medium text-slate-500">
          {u.role === 'resident' ? 'Public Registration' : 'CLI (`flask create-user`)'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header matching City Administrator Clearance */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 tracking-wider uppercase mb-1">
            <Building className="w-3.5 h-3.5" />
            <span>Municipal Governance & Platform Administration</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            City Administration Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Manage city reports, inspect role clearances, oversee infrastructure taxonomy, and trigger spatial clustering.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRecomputeHotspots}
            disabled={recomputing}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs text-xs font-bold px-3 py-2 rounded-2xl flex items-center gap-2 transition-all"
            title="Trigger DBSCAN spatial clustering (POST /analytics/hotspots/recompute)"
          >
            {recomputing ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            ) : (
              <Flame className="w-3.5 h-3.5 text-orange-500" />
            )}
            <span>{recomputing ? 'Clustering...' : 'Recompute Hotspots'}</span>
          </button>

          <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded-2xl px-3.5 py-2 text-xs font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600" />
            <span>Admin Clearance</span>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatisticCard
          title="City Reports"
          value={reports.length}
          subtext="Total Registered"
          badgeText="Active Cases"
          badgeType="primary"
          icon={FileText}
        />
        <StatisticCard
          title="Account Registries"
          value={users.length}
          subtext="Loaded Page"
          badgeText="Users Listing"
          badgeType="neutral"
          icon={Users}
        />
        <StatisticCard
          title="Defect Taxonomy"
          value={categories.length}
          subtext="Seeded Types"
          badgeText="Reference DB"
          badgeType="success"
          icon={Layers}
        />
        <StatisticCard
          title="Electoral Wards"
          value={areas.length}
          subtext="Configured Polygons"
          badgeText="PostGIS"
          badgeType="neutral"
          icon={MapPin}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {[
          { id: 'reports', label: 'All Reports & Triage', icon: FileText, count: reports.length },
          { id: 'users', label: 'User Clearances', icon: Users, count: users.length },
          { id: 'categories', label: 'Problem Categories', icon: Layers, count: categories.length },
          { id: 'areas', label: 'Wards & Areas', icon: MapPin, count: areas.length },
          { id: 'system', label: 'System & Workflow Engine', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status Filter:</span>
              <select
                value={reportFilterStatus}
                onChange={(e) => setReportFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value="all">All Statuses ({reports.length})</option>
                <option value="reported">Reported</option>
                <option value="verified">Verified</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Search reports by ID or defect..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <DataTable
            columns={reportColumns}
            data={filteredReports}
            loading={loading}
            emptyMessage="No reports match your filters"
            emptySubtext="Try clearing the search query or status filter"
          />
        </div>
      )}

      {/* 2. Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          {/* CLI Provisioning Info Alert Banner */}
          <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex items-start gap-3">
            <Terminal className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900 space-y-1">
              <span className="font-bold block">Access Control & Role Provisioning</span>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                Resident accounts are created via public sign-up (<code>POST /api/v1/auth/register</code>). Staff roles (<code>verifier</code>, <code>authority</code>, <code>admin</code>) are provisioned securely via backend CLI using <code>flask create-user --role &lt;role&gt;</code>. There is no public or client role-switching API.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Role Filter:</span>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value="all">All Roles</option>
                <option value="resident">Resident</option>
                <option value="verifier">Verifier</option>
                <option value="authority">Authority</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user name or email..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <DataTable
            columns={userColumns}
            data={filteredUsers}
            loading={loading}
            emptyMessage="No registered users found"
            emptySubtext="Try clearing the search query"
          />
        </div>
      )}

      {/* 3. Categories Tab (Reference Registry) */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Infrastructure Defect Taxonomy (GET /api/v1/categories)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Built-in problem categories seeded into the PostgreSQL database. Used by citizen report intake.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="font-mono text-[10px] text-slate-400 font-bold block mb-1">
                  CATEGORY #{c.id} • ICON: {c.icon || 'default'}
                </span>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{c.name}</h4>
                <p className="text-xs text-slate-500">Seeded Database Reference Category</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Areas Tab (Reference Registry) */}
      {activeTab === 'areas' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Municipal Wards & Geographic Sectors (GET /api/v1/areas)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Geographic areas and electoral wards with optional spatial polygon boundaries. Reports falling inside boundaries are auto-assigned to the area.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {areas.map((a) => (
              <div key={a.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="font-mono text-[10px] text-slate-400 font-bold block mb-1">
                  WARD ID #{a.id}
                </span>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{a.name}</h4>
                <p className="text-xs text-slate-500">PostGIS Boundary Polygon Indexed</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. System & Workflow Engine Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Status Progression Engine */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Strict Status Progression Workflow (Status Lifecycle)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">1. Reported</span>
                <p className="text-slate-500 text-[11px]">Intake from resident. Can transition to Verified or Rejected by Verifier/Admin.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">2. Verified</span>
                <p className="text-slate-500 text-[11px]">Triage officer verified defect. Assigned to an Authority via POST /assign with due date.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">3. In Progress</span>
                <p className="text-slate-500 text-[11px]">Field authority begins repair. Cannot be reassigned once work starts.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">4. Resolved</span>
                <p className="text-slate-500 text-[11px]">Completed by authority with notes. Final state alongside Rejected.</p>
              </div>
            </div>
          </div>

          {/* Architecture Checklist */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Backend Architecture Alignment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-400 block font-bold">API Base Path</span>
                <span className="text-lg font-mono font-bold text-slate-900">/api/v1</span>
                <p className="text-[11px] text-slate-500 mt-1">Photo uploads served from /uploads/ outside prefix.</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-400 block font-bold">Security & Roles</span>
                <span className="text-lg font-mono font-bold text-slate-900">JWT (7 Days)</span>
                <p className="text-[11px] text-slate-500 mt-1">Authorization: Bearer &lt;token&gt; header on all protected calls.</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-400 block font-bold">Geospatial Index</span>
                <span className="text-lg font-mono font-bold text-slate-900">PostGIS GiST</span>
                <p className="text-[11px] text-slate-500 mt-1">Geography points and polygons with spatial indexes.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
