import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  PlusCircle,
  CheckCircle2,
  ClipboardList,
  CheckSquare,
  MapPin,
  ArrowRight,
  Search,
  Bell,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../services/api";
import ReportCard from "../../components/ui/ReportCard";
import LoadingSkeleton from "../../components/ui/LoadingSkeleton";
import EmptyState from "../../components/ui/EmptyState";

/*
  Theme (same as the admin dashboard)
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

// Pill button with the circled icon, like the Subscribe button
function PillButton({
  icon: Icon = ArrowRight,
  children,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] py-1 pl-1 pr-5 text-xs font-semibold text-[#5F5F5F] transition-colors ${className}`}
      {...props}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#38C6DC] bg-[#E6F5F8] text-[#1B8FC0]">
        <Icon className="h-4 w-4" />
      </span>
      <span>{children}</span>
    </button>
  );
}

function PillLink({
  icon: Icon = ArrowRight,
  children,
  className = "",
  ...props
}) {
  return (
    <Link
      className={`inline-flex items-center gap-2 rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] py-1 pl-1 pr-5 text-xs font-semibold text-[#5F5F5F] transition-colors ${className}`}
      {...props}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#38C6DC] bg-[#E6F5F8] text-[#1B8FC0]">
        <Icon className="h-4 w-4" />
      </span>
      <span>{children}</span>
    </Link>
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
        <p className="text-2xl font-extrabold text-[#0B5A9C] leading-tight">
          {value}
        </p>
        <p className="text-[11px] text-[#7a8a90]">{note}</p>
      </div>
    </div>
  );
}

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "reported", label: "Reported" },
  { id: "in_progress", label: "In progress" },
  { id: "resolved", label: "Resolved" },
];

export default function ResidentDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

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

  const [activeTab, setActiveTab] = useState("my_reports");
  const [reports, setReports] = useState([]);
  const [followingReports, setFollowingReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchVal, setSearchVal] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [response, followingResponse] = await Promise.all([
        api.reports.list({
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: searchVal || undefined,
          mine: activeTab === "my_reports" ? true : undefined,
          following: activeTab === "following" ? true : undefined,
        }),
        api.reports.list({ following: true }),
      ]);
      setReports(response.items || []);
      setFollowingReports(followingResponse.items || []);
    } catch (err) {
      toast.error(`Could not load reports: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, searchVal, activeTab]);

  const handleUpvote = async (id) => {
    try {
      await api.reports.toggleFollow(id);
      toast.success("Report follow status updated");
      fetchReports();
    } catch (error) {
      toast.error(`Could not update follow status: ${error.message}`);
    }
  };

  const statusCounts = {
    all: reports.length,
    in_progress: reports.filter((r) => r.status === "in_progress").length,
    reported: reports.filter((r) => r.status === "reported").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  const chipClass = (active) =>
    `text-xs font-semibold px-4 py-1.5 rounded-full transition-all shrink-0 ${
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
        <div className="flex items-center gap-4">
          <div
            className={`h-14 w-14 shrink-0 rounded-2xl ${GRADIENT} text-white grid place-items-center text-xl font-extrabold shadow-[0_8px_16px_-6px_rgba(11,90,156,0.6)]`}
          >
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-[#5F5F5F] tracking-tight">
              {user?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5F5F5F] mt-1">
              <span className="capitalize font-semibold">{user?.role}</span>
              <span aria-hidden="true">|</span>
              <span>Account #{user?.id}</span>
              <span aria-hidden="true">|</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#1B8FC0]" />
                {user?.area_id
                  ? `Service area #${user.area_id}`
                  : "No service area assigned"}
              </span>
            </div>
          </div>
        </div>

        <PillLink
          to="/report/new"
          icon={PlusCircle}
          className="shrink-0"
          data-tour="resident-report"
        >
          File a new issue
        </PillLink>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          title="Total reports"
          value={statusCounts.all}
          note="Recorded in the registry"
          icon={ClipboardList}
        />
        <StatTile
          title="Active repairs"
          value={statusCounts.in_progress}
          note="Crews dispatched"
          icon={CheckSquare}
        />
        <StatTile
          title="Resolved issues"
          value={statusCounts.resolved}
          note="Inspection confirmed"
          icon={CheckCircle2}
        />
        <StatTile
          title="Followed incidents"
          value={followingReports.length}
          note="Live updates on"
          icon={Bell}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "my_reports", label: `My reports (${reports.length})` },
          { id: "following", label: `Following (${followingReports.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
              activeTab === tab.id
                ? `${GRADIENT} text-white shadow-[0_8px_18px_-8px_rgba(11,90,156,0.7)]`
                : "text-[#5F5F5F] hover:bg-white/70"
            }`}
            data-tour={tab.id === "my_reports" ? "resident-my-reports" : "resident-following"}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Reports */}
        <div className="lg:col-span-8">
          <div className={`${CARD} p-5 space-y-4`}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={chipClass(statusFilter === f.id)}
                  >
                    {f.label} ({statusCounts[f.id]})
                  </button>
                ))}
              </div>

              <div className="relative sm:w-60">
                <Search className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Filter reports"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-[#cfe9f0] rounded-full text-xs text-[#4a4a4a] focus:outline-none focus:border-[#1B8FC0]"
                />
              </div>
            </div>

            {loading ? (
              <LoadingSkeleton count={3} type="card" />
            ) : reports.length === 0 ? (
              <EmptyState
                title="No reports match these filters"
                description="Pick a different status or clear the search."
                action={
                  <Link
                    to="/report/new"
                    className={`rounded-full ${GRADIENT} px-5 py-2 text-xs font-bold text-white hover:brightness-110 transition inline-block`}
                  >
                    Submit a new report
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3.5">
                {reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onUpvote={handleUpvote}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Followed incidents */}
        <aside className="lg:col-span-4">
          <div className={`${CARD} p-5`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#cfe9f0]">
              <h2 className="text-base font-extrabold text-[#5F5F5F]">
                Following incidents
              </h2>
              <span className="text-[11px] font-bold bg-[#38C6DC]/30 text-[#0B5A9C] px-2.5 py-0.5 rounded-full">
                {followingReports.length} active
              </span>
            </div>

            <div className="space-y-3">
              {followingReports.slice(0, 3).map((report) => (
                <div key={report.id} className={`${INNER_CARD} p-3.5`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-[#7a8a90]">
                      #RPT-{report.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#cfe9f0] text-[#5F5F5F] capitalize">
                      {report.status.replace("_", " ")}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-[#4a4a4a] line-clamp-1 mb-2">
                    {report.description || report.category?.name}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] text-[#7a8a90]">
                    <span>{report.category?.name}</span>
                    <Link
                      to={`/reports/${report.id}`}
                      className="text-[#0B5A9C] font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Track live</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
              {!followingReports.length && !loading && (
                <p className="text-xs text-[#5F5F5F]">
                  You are not following any reports yet.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("following")}
              className="w-full mt-4 rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] py-2.5 text-xs font-semibold text-[#5F5F5F] transition-colors"
            >
              View all followed reports
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
