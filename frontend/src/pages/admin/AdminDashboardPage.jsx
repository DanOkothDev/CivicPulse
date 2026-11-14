import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Users,
  Layers,
  MapPin,
  Shield,
  Plus,
  Search,
  FileText,
  Flame,
  RefreshCw,
  ArrowRight,
  Sliders,
  UserPlus,
  Building2,
  BarChart3,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import DepartmentManagementPanel from "./DepartmentManagementPanel";
import AdminAnalyticsDashboard from "./AdminAnalyticsDashboard";

/*
  Theme (taken from the landing page design)
  mint background  #E6F5F8
  light cyan       #7FD0E0
  bright cyan      #38C6DC
  mid blue         #1B8FC0
  deep blue        #0B5A9C
  soft grey text   #5F5F5F
  Font: Montserrat (loaded below)
*/

const GRADIENT = "bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C]";
const CARD =
  "bg-white/80 rounded-3xl border border-[#cfe9f0] shadow-[0_10px_30px_-14px_rgba(11,90,156,0.35)]";
const INNER_CARD = "rounded-2xl bg-[#E6F5F8] border border-[#cfe9f0]";
const INPUT =
  "w-full px-3 py-2 bg-white border border-[#cfe9f0] rounded-xl text-xs text-[#4a4a4a] focus:outline-none focus:border-[#1B8FC0]";

// Pill button with the circled arrow, like the Subscribe button
function PillButton({
  icon: Icon = ArrowRight,
  children,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] py-1 pl-1 pr-5 text-xs font-semibold text-[#5F5F5F] transition-colors disabled:opacity-60 ${className}`}
      {...props}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#38C6DC] bg-[#E6F5F8] text-[#1B8FC0]">
        <Icon className={`h-4 w-4 ${props.disabled ? "animate-spin" : ""}`} />
      </span>
      <span>{children}</span>
    </button>
  );
}

// White button with blue text, like Log In
function WhiteButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#0B5A9C] shadow-[0_6px_14px_-6px_rgba(11,90,156,0.45)] hover:bg-[#f4fbfd] transition-colors disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Solid gradient button
function GradientButton({ children, className = "", ...props }) {
  return (
    <button
      className={`rounded-full ${GRADIENT} px-5 py-2 text-xs font-bold text-white shadow-[0_8px_18px_-8px_rgba(11,90,156,0.7)] hover:brightness-110 transition disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function StatTile({ title, value, note, icon: Icon }) {
  return (
    <div className={`${CARD} p-5 flex items-center gap-4`}>
      <div
        className={`h-12 w-12 shrink-0 rounded-2xl ${GRADIENT} grid place-items-center text-white shadow-[0_8px_16px_-6px_rgba(11,90,156,0.6)]`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-[#5F5F5F]">{title}</p>
        <p className="text-xl font-extrabold text-[#0B5A9C] leading-tight">
          {value}
        </p>
        <p className="text-[11px] text-[#7a8a90]">{note}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Load the theme font once
  useEffect(() => {
    if (document.getElementById("montserrat-font")) return;
    const link = document.createElement("link");
    link.id = "montserrat-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  // Active tab state synced with URL query param
  const nationalAdmin = user?.role === "admin" && user.county_id == null;
  const activeTab = searchParams.get("tab") || "reports";
  const setActiveTab = (tabId) => setSearchParams({ tab: tabId });
  useEffect(() => {
    if (nationalAdmin && activeTab === "reports") setActiveTab("users");
  }, [nationalAdmin, activeTab]);

  // Data states
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [reports, setReports] = useState([]);
  const [counties, setCounties] = useState([]);
  const [selectedCountyId, setSelectedCountyId] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [reportFilterStatus, setReportFilterStatus] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [recomputing, setRecomputing] = useState(false);

  // Modals
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("resident");
  const [authorityDepartments, setAuthorityDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [loadingAuthorityDepartments, setLoadingAuthorityDepartments] = useState(false);
  const [authorityDepartmentError, setAuthorityDepartmentError] = useState("");

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [reportToAssign, setReportToAssign] = useState(null);
  const [selectedAuthorityId, setSelectedAuthorityId] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [assigning, setAssigning] = useState(false);

  const today = new Date();
  const minAssignmentDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, c, a, r, countyRows] = await Promise.all([
        api.admin.listUsers(),
        api.reference.getCategories(),
        api.reference.getAreas(),
        nationalAdmin ? Promise.resolve({ items: [] }) : api.reports.list(),
        api.reference.getCounties(),
      ]);
      setUsers(u || []);
      setCategories(c || []);
      setAreas(a || []);
      setReports(r.items || []);
      setCounties(countyRows || []);
    } catch (error) {
      toast.error(`Could not load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [nationalAdmin]);

  const handleOpenRoleModal = (u) => {
    setSelectedUser(u);
    setNewRole(u.role);
    setSelectedCountyId(u.county_id == null ? "" : String(u.county_id));
    setSelectedDepartmentId(u.department_id == null ? "" : String(u.department_id));
    setRoleModalOpen(true);
  };

  useEffect(() => {
    let active = true;
    if (newRole !== "authority" || !selectedCountyId) {
      setAuthorityDepartments([]);
      setAuthorityDepartmentError("");
      setLoadingAuthorityDepartments(false);
      return () => { active = false; };
    }
    setLoadingAuthorityDepartments(true);
    setAuthorityDepartmentError("");
    api.reference.getDepartments(Number(selectedCountyId))
      .then((rows) => {
        if (active) setAuthorityDepartments(rows || []);
      })
      .catch((error) => {
        if (active) setAuthorityDepartmentError(error.message);
      })
      .finally(() => {
        if (active) setLoadingAuthorityDepartments(false);
      });
    return () => { active = false; };
  }, [newRole, selectedCountyId]);

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newRole !== "resident" && !selectedCountyId) {
      toast.error("Choose a county for this staff account.");
      return;
    }
    if (newRole === "authority" && !selectedDepartmentId) {
      toast.error("Choose the authority user's county department before saving.");
      return;
    }
    try {
      await api.admin.updateUserRole(selectedUser.id, newRole, selectedCountyId ? Number(selectedCountyId) : null);
      if (newRole === "authority") {
        await api.admin.updateUserDepartment(
          selectedUser.id,
          Number(selectedDepartmentId),
        );
      }
      toast.success(`${selectedUser.name} is now a ${newRole}.`);
      setRoleModalOpen(false);
      loadData();
    } catch (error) {
      toast.error(`Could not change the role: ${error.message}`);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      await api.admin.addCategory({
        name: newCategoryName,
        icon: "facility",
      });
      toast.success(`Category "${newCategoryName}" added.`);
      setCategoryModalOpen(false);
      setNewCategoryName("");
      loadData();
    } catch (error) {
      toast.error(`Could not add the category: ${error.message}`);
    }
  };

  const handleAddArea = async (e) => {
    e.preventDefault();
    if (!newAreaName) return;
    try {
      await api.admin.addArea({
        name: newAreaName,
      });
      toast.success(`Ward "${newAreaName}" added.`);
      setAreaModalOpen(false);
      setNewAreaName("");
      loadData();
    } catch (error) {
      toast.error(`Could not add the ward: ${error.message}`);
    }
  };

  const handleOpenAssignModal = (report) => {
    setReportToAssign(report);
    setSelectedAuthorityId("");
    setAssignmentDueDate("");
    setAssignModalOpen(true);
  };

  const handleAssignReport = async (e) => {
    e.preventDefault();
    if (!reportToAssign || !selectedAuthorityId) return;

    setAssigning(true);
    try {
      await api.reports.assign(reportToAssign.id, {
        assignee_id: Number(selectedAuthorityId),
        due_date: assignmentDueDate || undefined,
      });
      toast.success(`Report #${reportToAssign.id} assigned.`);
      setAssignModalOpen(false);
      setReportToAssign(null);
      await loadData();
    } catch (error) {
      toast.error(`Could not assign the report: ${error.message}`);
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateReportArea = async (report, value) => {
    const areaId = value ? Number(value) : null;
    try {
      const updatedReport = await api.reports.updateArea(report.id, areaId);
      setReports((current) =>
        current.map((item) =>
          item.id === updatedReport.id
            ? { ...item, area_id: updatedReport.area_id }
            : item,
        ),
      );
      const areaName = areas.find((area) => area.id === areaId)?.name;
      toast.success(
        areaName
          ? `Report #${report.id} moved to ${areaName}.`
          : `Ward removed from report #${report.id}.`,
      );
    } catch (error) {
      toast.error(`Could not change the ward: ${error.message}`);
    }
  };

  const handleRecomputeHotspots = async () => {
    setRecomputing(true);
    try {
      const res = await api.analytics.recomputeHotspots({
        eps_m: 250,
        min_samples: 3,
      });
      toast.success(
        `Hotspots refreshed. Found ${res.clusters_created} hotspot areas.`,
      );
    } catch (err) {
      toast.error(err.message || "Could not refresh hotspots");
    } finally {
      setRecomputing(false);
    }
  };

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const matchesStatus =
      reportFilterStatus === "all" || r.status === reportFilterStatus;
    const matchesSearch =
      !reportSearch.trim() ||
      String(r.id).includes(reportSearch.trim()) ||
      (r.title && r.title.toLowerCase().includes(reportSearch.toLowerCase())) ||
      (r.description &&
        r.description.toLowerCase().includes(reportSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    const matchesSearch =
      !userSearch.trim() ||
      (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const eligibleAuthorities = users.filter((candidate) =>
    candidate.role === "authority" &&
    candidate.county_id === reportToAssign?.county_id &&
    candidate.department_id === reportToAssign?.department_id &&
    reportToAssign?.department_id != null
  );

  // Columns for reports table
  const reportColumns = [
    {
      header: "Report",
      accessor: "id",
      render: (r) => (
        <div className="flex items-center gap-3">
          {r.photo_url ? (
            <img
              src={r.photo_url}
              alt=""
              className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[#cfe9f0]"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#E6F5F8] text-[#1B8FC0] grid place-items-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#7a8a90]">
                #{r.id}
              </span>
              <span className="font-bold text-[#4a4a4a] text-xs truncate max-w-[220px] block">
                {r.title ||
                  r.description?.slice(0, 35) ||
                  r.category?.name ||
                  "Untitled report"}
              </span>
            </div>
            <span className="text-[11px] text-[#7a8a90]">
              {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      accessor: "category",
      render: (r) => (
        <span className="font-semibold text-xs text-[#4a4a4a]">
          {r.category?.name || "No category"}
        </span>
      ),
    },
    {
      header: "Responsible County",
      accessor: "county",
      render: (r) => (
        <span className="text-xs text-[#5F5F5F]">
          {r.county?.name || "Unresolved"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (r) => {
        const styles = {
          reported: "bg-amber-100 text-amber-800 border-amber-200",
          verified: "bg-sky-100 text-sky-800 border-sky-200",
          assigned: "bg-indigo-100 text-indigo-800 border-indigo-200",
          in_progress: "bg-orange-100 text-orange-800 border-orange-200",
          resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
          rejected: "bg-rose-100 text-rose-800 border-rose-200",
        };
        return (
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize inline-block ${
              styles[r.status] || "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {r.status ? r.status.replace("_", " ") : "Reported"}
          </span>
        );
      },
    },
    {
      header: "Ward",
      accessor: "area_name",
      render: (r) => (
        <div className="space-y-1.5">
          <span className="block text-xs text-[#5F5F5F]">
            {areas.find((area) => area.id === r.area_id)?.name ||
              (r.area_id ? `Ward #${r.area_id}` : "No ward")}
          </span>
          <select
            aria-label={`Choose ward for report ${r.id}`}
            value={r.area_id ?? ""}
            onChange={(e) => handleUpdateReportArea(r, e.target.value)}
            className="w-40 rounded-lg border border-[#cfe9f0] bg-white px-2 py-1 text-[11px] text-[#4a4a4a] focus:outline-none focus:border-[#1B8FC0]"
          >
            <option value="">No ward</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.status === "verified" && (
            <button
              type="button"
              onClick={() => handleOpenAssignModal(r)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] px-3 py-1.5 text-xs font-semibold text-[#5F5F5F] transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#1B8FC0]" />
              <span>Assign</span>
            </button>
          )}
          <Link
            to={`/reports/${r.id}`}
            className={`inline-flex items-center gap-1.5 rounded-full ${GRADIENT} px-3.5 py-1.5 text-xs font-bold text-white hover:brightness-110 transition`}
          >
            <span>View</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ),
    },
  ];

  // Columns for users table
  const userColumns = [
    {
      header: "User",
      accessor: "name",
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl ${GRADIENT} text-white grid place-items-center font-bold text-xs`}
          >
            {u.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <span className="font-bold text-[#4a4a4a] block text-xs">
              {u.name}
            </span>
            <span className="text-[11px] text-[#7a8a90]">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      accessor: "role",
      render: (u) => (
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
            u.role === "admin"
              ? "bg-[#0B5A9C] text-white"
              : u.role === "authority"
                ? "bg-[#38C6DC]/30 text-[#0B5A9C]"
                : u.role === "verifier"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-700"
          }`}
        >
          {u.role}
        </span>
      ),
    },
    {
      header: "County",
      accessor: "county",
      render: (u) => (
        <span className="text-xs text-[#5F5F5F]">
          {u.county?.name || "No county"}
        </span>
      ),
    },
    {
      header: "Department",
      accessor: "department",
      render: (u) => (
        <span className="text-xs text-[#5F5F5F]">
          {u.department?.name || "Not assigned"}
        </span>
      ),
    },
    {
      header: "Ward",
      accessor: "area_id",
      render: (u) => (
        <span className="text-xs text-[#5F5F5F]">
          {u.area_id == null
            ? "No ward"
            : areas.find((area) => area.id === u.area_id)?.name ||
              `Ward ${u.area_id}`}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (u) => (
        <button
          type="button"
          onClick={() => handleOpenRoleModal(u)}
          className="rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] px-3.5 py-1.5 text-xs font-semibold text-[#5F5F5F] transition-colors"
        >
          Change role
        </button>
      ),
    },
  ];

  const chipClass = (active) =>
    `text-xs font-semibold px-4 py-1.5 rounded-full transition-all capitalize shrink-0 ${
      active
        ? `${GRADIENT} text-white shadow-[0_6px_14px_-6px_rgba(11,90,156,0.7)]`
        : "bg-white text-[#5F5F5F] border border-[#cfe9f0] hover:bg-[#f4fbfd]"
    }`;

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl bg-[#E6F5F8] p-6 space-y-6"
      style={{
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Soft shapes in the corner, echoing the landing page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 -z-10 h-80 w-80 rounded-full bg-gradient-to-br from-[#38C6DC]/40 to-[#0B5A9C]/30 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-40 -right-6 -z-10 h-12 w-12 rotate-12 rounded-2xl bg-white/40"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#5F5F5F] tracking-tight">
            {activeTab === "analytics" ? "Analytics & performance" : "Admin dashboard"}
          </h1>
          <p className="text-xs text-[#5F5F5F] mt-2 max-w-xl leading-relaxed">
            {activeTab === "analytics"
              ? "Compare county outcomes and monitor CivicPulse operations with live platform data."
              : "Review reports, choose who can do what, edit categories and wards, and refresh the hotspot map."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {activeTab !== "analytics" && <PillButton
            icon={recomputing ? RefreshCw : Flame}
            onClick={handleRecomputeHotspots}
            disabled={recomputing}
            title="Refresh hotspots"
            data-tour="admin-hotspots"
          >
            {recomputing ? "Refreshing..." : "Refresh hotspots"}
          </PillButton>}

          <div className="bg-white rounded-xl px-3.5 py-2 text-xs font-bold text-[#0B5A9C] flex items-center gap-2 shadow-[0_6px_14px_-6px_rgba(11,90,156,0.45)]">
            <Shield className="w-4 h-4" />
            <span>Admin</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      {activeTab !== "analytics" && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {!nationalAdmin && <StatTile
          title="Reports"
          value={reports.length}
          note="Submitted so far"
          icon={FileText}
        />}
        <StatTile
          title="Users"
          value={users.length}
          note="All accounts"
          icon={Users}
        />
        <StatTile
          title="Categories"
          value={categories.length}
          note="For new reports"
          icon={Layers}
        />
        <StatTile
          title="Wards"
          value={areas.length}
          note="Areas covered"
          icon={MapPin}
        />
      </div>}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          {
            id: "reports",
            label: `Reports (${reports.length})`,
            icon: FileText,
          },
          { id: "users", label: `Users (${users.length})`, icon: Users },
          {
            id: "categories",
            label: `Categories (${categories.length})`,
            icon: Layers,
          },
          { id: "areas", label: `Wards (${areas.length})`, icon: MapPin },
          { id: "departments", label: "Departments", icon: Building2 },
          { id: "analytics", label: "Analytics & performance", icon: BarChart3 },
          { id: "system", label: "Settings", icon: Sliders },
        ].filter((tab) => !nationalAdmin || tab.id !== "reports").map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            data-tour={`admin-${tab.id}`}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === tab.id
                ? `${GRADIENT} text-white shadow-[0_8px_18px_-8px_rgba(11,90,156,0.7)]`
                : "text-[#5F5F5F] hover:bg-white/70"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "analytics" && <AdminAnalyticsDashboard />}

      {/* Reports */}
      {activeTab === "reports" && !nationalAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "All" },
                { id: "reported", label: "Reported" },
                { id: "verified", label: "Verified" },
                { id: "assigned", label: "Assigned" },
                { id: "in_progress", label: "In progress" },
                { id: "resolved", label: "Resolved" },
                { id: "rejected", label: "Rejected" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setReportFilterStatus(st.id)}
                  className={chipClass(reportFilterStatus === st.id)}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Search by number or title"
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#cfe9f0] rounded-full text-xs focus:outline-none focus:border-[#1B8FC0]"
              />
            </div>
          </div>

          <DataTable
            columns={reportColumns}
            data={filteredReports}
            loading={loading}
            emptyMessage="No reports match your filters"
            emptySubtext="Clear the search or pick a different status"
          />
        </div>
      )}

      {/* Users */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {nationalAdmin && <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">Assign a resident to a county and promote them to county admin, verifier, or authority. County staff can access reports only in their assigned county.</p>}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["all", "resident", "verifier", "authority", "admin"].map(
                (r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUserRoleFilter(r)}
                    className={chipClass(userRoleFilter === r)}
                  >
                    {r === "all" ? "Everyone" : `${r}s`}
                  </button>
                ),
              )}
            </div>

            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or email"
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#cfe9f0] rounded-full text-xs focus:outline-none focus:border-[#1B8FC0]"
              />
            </div>
          </div>

          <DataTable
            columns={userColumns}
            data={filteredUsers}
            loading={loading}
            emptyMessage="No users found"
            emptySubtext="Clear the search to see everyone"
          />
        </div>
      )}

      {/* Categories */}
      {activeTab === "categories" && (
        <div className={`${CARD} p-6 space-y-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-[#5F5F5F]">
                Report categories
              </h3>
              <p className="text-xs text-[#5F5F5F] mt-1">
                Residents pick one of these when they file a report.
              </p>
            </div>
            <PillButton icon={Plus} onClick={() => setCategoryModalOpen(true)}>
              Add category
            </PillButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className={`${INNER_CARD} p-4 flex items-center gap-3`}
              >
                <div
                  className={`h-9 w-9 shrink-0 rounded-xl ${GRADIENT} grid place-items-center text-white`}
                >
                  <Layers className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-[#4a4a4a]">{c.name}</h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wards */}
      {activeTab === "areas" && (
        <div className={`${CARD} p-6 space-y-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-[#5F5F5F]">Wards</h3>
              <p className="text-xs text-[#5F5F5F] mt-1">
                Residents and reports can be placed in any of these wards.
              </p>
            </div>
            <PillButton icon={Plus} onClick={() => setAreaModalOpen(true)}>
              Add ward
            </PillButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {areas.map((a) => (
              <div
                key={a.id}
                className={`${INNER_CARD} p-4 flex items-center gap-3`}
              >
                <div
                  className={`h-9 w-9 shrink-0 rounded-xl ${GRADIENT} grid place-items-center text-white`}
                >
                  <MapPin className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-[#4a4a4a]">{a.name}</h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "departments" && (
        <DepartmentManagementPanel user={user} toast={toast} />
      )}

      {/* Settings */}
      {activeTab === "system" && (
        <div className="space-y-6">
          <div className={`${CARD} p-6 space-y-4`}>
            <div>
              <h3 className="text-base font-extrabold text-[#5F5F5F]">
                How a report moves
              </h3>
              <p className="text-xs text-[#5F5F5F] mt-1 leading-relaxed max-w-2xl">
                Every report goes through the same steps in order. A report
                can&apos;t skip a step, and a report that is already in progress
                can&apos;t be reassigned.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                {
                  title: "Reported",
                  desc: "A resident sends in the problem with a location and photo.",
                },
                {
                  title: "Verified",
                  desc: "A verifier or admin confirms it and checks for duplicates.",
                },
                {
                  title: "Assigned",
                  desc: "The report is given to an authority, with a due date if needed.",
                },
                {
                  title: "In progress",
                  desc: "A crew has taken the job and started the work.",
                },
                {
                  title: "Resolved",
                  desc: "The work is done and the people following it are told.",
                },
              ].map((step, idx) => (
                <div key={step.title} className={`${INNER_CARD} p-4 space-y-2`}>
                  <div
                    className={`h-8 w-8 rounded-xl ${GRADIENT} text-white grid place-items-center text-xs font-bold`}
                  >
                    {idx + 1}
                  </div>
                  <h4 className="text-xs font-bold text-[#4a4a4a]">
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-[#5F5F5F] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={`${CARD} p-6 space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#5F5F5F]">
                  Hotspots
                </h3>
                <p className="text-xs text-[#5F5F5F] mt-1">
                  Hotspots are places where several reports have come in close
                  together.
                </p>
              </div>
              <PillButton
                icon={recomputing ? RefreshCw : Flame}
                onClick={handleRecomputeHotspots}
                disabled={recomputing}
              >
                {recomputing ? "Refreshing..." : "Refresh hotspots"}
              </PillButton>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className={`${INNER_CARD} p-4`}>
                <span className="font-semibold text-[#5F5F5F] block mb-1">
                  Distance
                </span>
                <span className="text-xl font-extrabold text-[#0B5A9C]">
                  250 meters
                </span>
                <p className="text-[11px] text-[#5F5F5F] mt-1">
                  Reports this close to each other are grouped together.
                </p>
              </div>
              <div className={`${INNER_CARD} p-4`}>
                <span className="font-semibold text-[#5F5F5F] block mb-1">
                  Reports needed
                </span>
                <span className="text-xl font-extrabold text-[#0B5A9C]">
                  3 reports
                </span>
                <p className="text-[11px] text-[#5F5F5F] mt-1">
                  A group needs at least this many reports to count as a
                  hotspot.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change role */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={`Change role: ${selectedUser?.name}`}
        subtitle="Choose what this person can do"
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          {nationalAdmin && <div>
            <label htmlFor="staff-county" className="mb-1 block text-xs font-bold text-[#5F5F5F]">Assigned county</label>
            <select id="staff-county" value={selectedCountyId} onChange={(event) => { setSelectedCountyId(event.target.value); setSelectedDepartmentId(""); }} className={INPUT}>
              <option value="">{newRole === "resident" ? "No county" : "Select a county"}</option>
              {counties.map((county) => <option key={county.id} value={county.id}>{county.name}</option>)}
            </select>
          </div>}
          <div>
            <label className="block text-xs font-bold text-[#5F5F5F] mb-2">
              Role
            </label>
            <div className="space-y-2">
              {[
                {
                  r: "resident",
                  label: "Resident",
                  desc: "Can send reports, check their status, and follow issues",
                },
                {
                  r: "verifier",
                  label: "Verifier",
                  desc: "Can review new reports, confirm them, and merge duplicates",
                },
                {
                  r: "authority",
                  label: "Authority",
                  desc: "Can take on work, send crews, and mark reports resolved",
                },
                {
                  r: "admin",
                  label: "Admin",
                  desc: "Can manage users and operations in their assigned county",
                },
              ].map((item) => (
                <label
                  key={item.r}
                  className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-colors ${
                    newRole === item.r
                      ? "bg-[#E6F5F8] border-[#1B8FC0]"
                      : "bg-white border-[#cfe9f0]"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={item.r}
                    checked={newRole === item.r}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="accent-[#1B8FC0]"
                  />
                  <div>
                    <span className="font-bold text-xs text-[#4a4a4a] block">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-[#5F5F5F]">
                      {item.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {newRole === "authority" && (
            <div>
              <label htmlFor="authority-department" className="mb-1 block text-xs font-bold text-[#5F5F5F]">
                Assigned department
              </label>
              {selectedCountyId ? (
                <>
                <select
                  id="authority-department"
                  value={selectedDepartmentId}
                  onChange={(event) => setSelectedDepartmentId(event.target.value)}
                  disabled={loadingAuthorityDepartments}
                  required
                  className={INPUT}
                >
                  <option value="">
                    {loadingAuthorityDepartments ? "Loading departments..." : "Select a department"}
                  </option>
                  {authorityDepartments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
                {authorityDepartmentError && (
                  <p role="alert" className="mt-1 text-xs text-rose-700">
                    Could not load departments: {authorityDepartmentError}
                  </p>
                )}
                </>
              ) : (
                <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                  Choose a county before assigning this user as an authority.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#cfe9f0]">
            <WhiteButton onClick={() => setRoleModalOpen(false)}>
              Cancel
            </WhiteButton>
            <GradientButton type="submit">Save role</GradientButton>
          </div>
        </form>
      </Modal>

      {/* Add category */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Add category"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5F5F5F] mb-1">
              Category name
            </label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Damaged traffic sign"
              required
              className={INPUT}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#cfe9f0]">
            <WhiteButton onClick={() => setCategoryModalOpen(false)}>
              Cancel
            </WhiteButton>
            <GradientButton type="submit">Save category</GradientButton>
          </div>
        </form>
      </Modal>

      {/* Add ward */}
      <Modal
        isOpen={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
        title="Add ward"
      >
        <form onSubmit={handleAddArea} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5F5F5F] mb-1">
              Ward name
            </label>
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="e.g. Ward 8 - Dagoretti North"
              required
              className={INPUT}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#cfe9f0]">
            <WhiteButton onClick={() => setAreaModalOpen(false)}>
              Cancel
            </WhiteButton>
            <GradientButton type="submit">Save ward</GradientButton>
          </div>
        </form>
      </Modal>

      {/* Assign report */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign report #${reportToAssign?.id}`}
        subtitle="Choose who should handle this verified report."
      >
        <form onSubmit={handleAssignReport} className="space-y-4">
          <div>
            <label
              htmlFor="report-assignee"
              className="block text-xs font-bold text-[#5F5F5F] mb-1"
            >
              Assign to
            </label>
            <select
              id="report-assignee"
              value={selectedAuthorityId}
              onChange={(e) => setSelectedAuthorityId(e.target.value)}
              required
              className={INPUT}
            >
              <option value="">Select an authority</option>
              {users
                .filter((candidate) => eligibleAuthorities.some((eligible) => eligible.id === candidate.id))
                .map((authority) => (
                  <option key={authority.id} value={authority.id}>
                    {authority.name} · {authority.department?.name}
                  </option>
                ))}
            </select>
            {eligibleAuthorities.length === 0 && (
              <p className="text-[11px] text-amber-700 mt-1">
                No authority is assigned to this report&apos;s county and department.
                Assign a user to that department first.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="assignment-due-date"
              className="block text-xs font-bold text-[#5F5F5F] mb-1"
            >
              Due date{" "}
              <span className="font-normal text-[#7a8a90]">(optional)</span>
            </label>
            <input
              id="assignment-due-date"
              type="date"
              value={assignmentDueDate}
              min={minAssignmentDate}
              onChange={(e) => setAssignmentDueDate(e.target.value)}
              className={INPUT}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#cfe9f0]">
            <WhiteButton
              onClick={() => setAssignModalOpen(false)}
              disabled={assigning}
            >
              Cancel
            </WhiteButton>
            <GradientButton
              type="submit"
              disabled={
                assigning ||
                eligibleAuthorities.length === 0
              }
            >
              {assigning ? "Assigning..." : "Assign report"}
            </GradientButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
