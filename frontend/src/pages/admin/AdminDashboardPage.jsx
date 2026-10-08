import React, { useState, useEffect } from 'react';
import {
  Building,
  Users,
  Layers,
  MapPin,
  Shield,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Search,
  FileText,
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

  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setUsers(u);
      setCategories(c);
      setAreas(a);
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
      toast.success(`Area "${newAreaName}" added!`);
      setAreaModalOpen(false);
      setNewAreaName('');
      loadData();
    } catch {
      toast.error('Failed to add area');
    }
  };

  const userColumns = [
    {
      header: 'User',
      accessor: 'name',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
          <div>
            <span className="font-bold text-slate-900 block text-xs">{u.name}</span>
            <span className="text-[11px] text-slate-400">{u.email}</span>
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
      {/* Header */}
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
            Manage users, grant verified role permissions, configure infrastructure taxonomy, and oversee ward boundary definitions.
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded-2xl px-4 py-2 text-xs font-bold flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-600" />
          <span>System Administrator Clearance</span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatisticCard
          title="Registered Users"
          value={users.length}
          subtext="Accounts"
          badgeText="Verified Residents"
          badgeType="primary"
          icon={Users}
        />
        <StatisticCard
          title="Active Categories"
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
        <StatisticCard
          title="Total Incidents"
          value={reports.length}
          subtext="Dossiers"
          badgeText="Audit Log"
          badgeType="primary"
          icon={FileText}
        />
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { id: 'users', label: `Users & Roles (${users.length})`, icon: Users },
          { id: 'categories', label: `Incident Categories (${categories.length})`, icon: Layers },
          { id: 'areas', label: `Wards & Boundaries (${areas.length})`, icon: MapPin },
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

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <DataTable
            columns={userColumns}
            data={users}
            loading={loading}
          />
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Infrastructure Defect Taxonomy
            </h3>
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
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

      {/* Areas Tab */}
      {activeTab === 'areas' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Municipal Wards & Geographic Sectors
            </h3>
            <button
              onClick={() => setAreaModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
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
              placeholder="e.g. Department of Public Works"
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
              placeholder="e.g. Ward 8 - South Heights"
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
