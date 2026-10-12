import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Building,
  Users,
  Layers,
  MapPin,
  Shield,
  Plus,
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
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
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

  // Modals
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('resident');

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDept, setNewCategoryDept] = useState('');

  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');

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

  const handleOpenRoleModal = (u) => {
    setSelectedUser(u);
    setNewRole(u.role);
    setRoleModalOpen(true);
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.admin.updateUserRole(selectedUser.id, newRole);
      toast.success(`Updated ${selectedUser.name}'s role to ${newRole}`);
      setRoleModalOpen(false);
      loadData();
    } catch {
      toast.error('Failed to change role');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      await api.admin.addCategory({
        name: newCategoryName,
        department: newCategoryDept || 'Public Infrastructure',
        icon: 'facility',
      });
      toast.success(`Category "${newCategoryName}" created!`);
      setCategoryModalOpen(false);
      setNewCategoryName('');
      setNewCategoryDept('');
      loadData();
    } catch {
      toast.error('Failed to add category');
    }
  };

  const handleAddArea = async (e) => {
    e.preventDefault();
    if (!newAreaName) return;
    try {
      await api.admin.addArea({
        name: newAreaName,
        population: '75,000',
        openIssues: 0,
      });
      toast.success(`Ward "${newAreaName}" added!`);
      setAreaModalOpen(false);
      setNewAreaName('');
      loadData();
    } catch {
      toast.error('Failed to add area');
    }
  };

  const handleRecomputeHotspots = async () => {
    setRecomputing(true);
    try {
      const res = await api.analytics.recomputeHotspots({ eps_m: 250, min_samples: 3 });
      toast.success(`DBSCAN Clustering complete! Found ${res.clusters_created || 0} active spatial clusters.`);
    } catch (err) {
      toast.error(err.message || 'Clustering recompute failed');
    } finally {
      setRecomputing(false);
    }
  };

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const matchesStatus = reportFilterStatus === 'all' || r.status === reportFilterStatus;
    const matchesSearch =
      !reportSearch.trim() ||
      String(r.id).includes(reportSearch.trim()) ||
      (r.title && r.title.toLowerCase().includes(reportSearch.toLowerCase())) ||
      (r.description && r.description.toLowerCase().includes(reportSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSearch =
      !userSearch.trim() ||
      (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  // Columns for Reports Table
  const reportColumns = [
    {
      header: 'Incident',
      accessor: 'id',
      render: (r) => (
        <div className="flex items-center gap-3">
          <img
            src={r.image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=200'}
            alt=""
            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold text-slate-400">#{r.id}</span>
              <span className="font-bold text-slate-900 text-xs truncate max-w-[220px] block">
                {r.title || r.description?.slice(0, 35) || 'Community Report'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Category & Dept',
      accessor: 'category_name',
      render: (r) => {
        const cat = categories.find((c) => c.id === r.category_id);
        return (
          <div>
            <span className="font-semibold text-xs text-slate-800 block">
              {r.category_name || cat?.name || 'General Defect'}
            </span>
            <span className="text-[10px] text-slate-400">
              {cat?.department || 'Municipal Dept'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (r) => {
        const styles = {
          reported: 'bg-amber-100 text-amber-800 border-amber-200',
          verified: 'bg-blue-100 text-blue-800 border-blue-200',
          assigned: 'bg-purple-100 text-purple-800 border-purple-200',
          in_progress: 'bg-orange-100 text-orange-800 border-orange-200',
          resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          rejected: 'bg-rose-100 text-rose-800 border-rose-200',
        };
        return (
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize inline-block ${
              styles[r.status] || 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {r.status ? r.status.replace('_', ' ') : 'Reported'}
          </span>
        );
      },
    },
    {
      header: 'Ward / Area',
      accessor: 'area_name',
      render: (r) => (
        <span className="text-xs text-slate-600">
          {r.area_name || (r.area_id ? `Ward ${r.area_id}` : 'Ward 4')}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (r) => (
        <Link
          to={`/reports/${r.id}`}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl inline-flex items-center gap-1 transition-colors"
        >
          <span>View Case</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  // Columns for Users Table
  const userColumns = [
    {
      header: 'User',
      accessor: 'name',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <img
            src={u.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256'}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
          <div>
            <span className="font-bold text-slate-900 block text-xs">{u.name}</span>
            <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Role',
      accessor: 'role',
      render: (u) => (
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
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
      header: 'Actions',
      accessor: 'actions',
      render: (u) => (
        <button
          onClick={() => handleOpenRoleModal(u)}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg"
        >
          Change Role
        </button>
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
            Manage city reports, assign role clearances, oversee infrastructure taxonomy, and trigger spatial clustering.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRecomputeHotspots}
            disabled={recomputing}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs text-xs font-bold px-3 py-2 rounded-2xl flex items-center gap-2 transition-all"
            title="Trigger DBSCAN spatial clustering (Section 9 of PDF)"
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
          subtext="Total Dossiers"
          badgeText="Active Cases"
          badgeType="primary"
          icon={FileText}
        />
        <StatisticCard
          title="Registered Users"
          value={users.length}
          subtext="Accounts"
          badgeText="All Roles"
          badgeType="primary"
          icon={Users}
        />
        <StatisticCard
          title="Defect Categories"
          value={categories.length}
          subtext="Taxonomy"
          badgeText="Infrastructure"
          badgeType="success"
          icon={Layers}
        />
        <StatisticCard
          title="Monitored Wards"
          value={areas.length}
          subtext="Districts"
          badgeText="Municipal Zones"
          badgeType="warning"
          icon={MapPin}
        />
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        {[
          { id: 'reports', label: `City Reports (${reports.length})`, icon: FileText },
          { id: 'users', label: `Users & Roles (${users.length})`, icon: Users },
          { id: 'categories', label: `Categories (${categories.length})`, icon: Layers },
          { id: 'areas', label: `Wards (${areas.length})`, icon: MapPin },
          { id: 'system', label: 'System & Engine', icon: Sliders },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
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

      {/* 1. Reports Oversight Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Cases' },
                { id: 'reported', label: 'Reported' },
                { id: 'verified', label: 'Verified' },
                { id: 'assigned', label: 'Assigned' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'resolved', label: 'Resolved' },
                { id: 'rejected', label: 'Rejected' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setReportFilterStatus(st.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all capitalize shrink-0 ${
                    reportFilterStatus === st.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Search report # or title..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <DataTable
            columns={reportColumns}
            data={filteredReports}
            loading={loading}
            emptyMessage="No reports match your filters"
            emptySubtext="Try clearing the search or status filter"
          />
        </div>
      )}

      {/* 2. Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Role Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'resident', 'verifier', 'authority', 'admin'].map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all capitalize shrink-0 ${
                    userRoleFilter === r
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {r === 'all' ? 'All Roles' : `${r}s`}
                </button>
              ))}
            </div>

            {/* User Search Input */}
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

      {/* 3. Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Infrastructure Defect Taxonomy
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Categories configure automated dispatch routing across city departments.
              </p>
            </div>
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="font-mono text-[10px] text-slate-400 font-bold block mb-1">
                  CATEGORY #{c.id}
                </span>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{c.name}</h4>
                <p className="text-xs text-slate-500">{c.department || 'Municipal Dept'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Areas Tab */}
      {activeTab === 'areas' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Municipal Wards & Geographic Sectors
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Geographic areas align spatial polygons with electoral ward boundaries.
              </p>
            </div>
            <button
              onClick={() => setAreaModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Ward</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {areas.map((a) => (
              <div key={a.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="font-mono text-[10px] text-slate-400 font-bold block mb-1">
                  AREA #{a.id}
                </span>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{a.name}</h4>
                <p className="text-xs text-slate-500">Population: {a.population || '80,000'}</p>
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
                Strict Status Progression Workflow (Section 6 of Overview)
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              CivicPulse enforces a centralized status lifecycle in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">app/status_flow.py</code>. Reports cannot skip workflow stages, and in-progress assignments are protected from reassignment.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              {[
                { title: '1. Reported', desc: 'Resident submits with coordinates and photo evidence.', pill: 'bg-amber-100 text-amber-800' },
                { title: '2. Verified', desc: 'Verifier or Admin confirms defect and checks duplicates.', pill: 'bg-blue-100 text-blue-800' },
                { title: '3. Assigned', desc: 'Case assigned to authority with mandatory due date.', pill: 'bg-purple-100 text-purple-800' },
                { title: '4. In Progress', desc: 'Field crew takes ownership and deploys maintenance.', pill: 'bg-orange-100 text-orange-800' },
                { title: '5. Resolved', desc: 'Service completed. Followers and submitter notified.', pill: 'bg-emerald-100 text-emerald-800' },
              ].map((step, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${step.pill}`}>
                    Stage {idx + 1}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">{step.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* DBSCAN Hotspots Clustering Engine */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  DBSCAN Spatial Hotspot Clustering (POST /analytics/hotspots/recompute)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRecomputeHotspots}
                disabled={recomputing}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                {recomputing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Run Clustering Now</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="font-bold text-slate-700 block mb-1">Clustering Radius (eps_m)</span>
                <span className="text-lg font-mono font-bold text-slate-900">250 meters</span>
                <p className="text-[11px] text-slate-500 mt-1">Spatial density threshold for incident correlation.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="font-bold text-slate-700 block mb-1">Density Threshold (min_samples)</span>
                <span className="text-lg font-mono font-bold text-slate-900">3 reports</span>
                <p className="text-[11px] text-slate-500 mt-1">Minimum incidents required to classify a civic hotspot.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="font-bold text-slate-700 block mb-1">Spatial Indexing</span>
                <span className="text-lg font-mono font-bold text-slate-900">PostGIS GiST</span>
                <p className="text-[11px] text-slate-500 mt-1">Geography points and polygons with spatial indexes.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={`Change Role: ${selectedUser?.name}`}
        subtitle="Elevate or restrict platform privileges"
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Select Clearance Role
            </label>
            <div className="space-y-2">
              {[
                { r: 'resident', label: 'Resident', desc: 'Can submit reports, track status, and follow community issues' },
                { r: 'verifier', label: 'Verifier', desc: 'Can review triage queue, verify defects, and merge duplicates' },
                { r: 'authority', label: 'Authority', desc: 'Can accept work orders, deploy crews, and mark resolved' },
                { r: 'admin', label: 'Admin', desc: 'Full citywide platform governance and user clearance access' },
              ].map((item) => (
                <label
                  key={item.r}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                    newRole === item.r ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={item.r}
                    checked={newRole === item.r}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 capitalize block">{item.label}</span>
                    <span className="text-[11px] text-slate-500">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRoleModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              Save Role Clearance
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Add Defect Category"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category Name</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Traffic Sign Damage"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
            <input
              type="text"
              value={newCategoryDept}
              onChange={(e) => setNewCategoryDept(e.target.value)}
              placeholder="e.g. Nairobi City County - Transport & Roads"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl"
            >
              Save Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Area Modal */}
      <Modal
        isOpen={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
        title="Add Municipal Ward"
      >
        <form onSubmit={handleAddArea} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ward Name</label>
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="e.g. Ward 8 - Dagoretti North"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl"
            >
              Save Ward
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
