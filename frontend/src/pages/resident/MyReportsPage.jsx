import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, Search } from "lucide-react";
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

export default function MyReportsPage() {
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

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchVal, setSearchVal] = useState("");

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const res = await api.reports.list({
        mine: true,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchVal || undefined,
      });
      setReports(res.items || []);
    } catch (error) {
      toast.error(`Could not load your reports: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, [statusFilter, searchVal]);

  const handleUpvote = async (id) => {
    try {
      await api.reports.toggleFollow(id);
      fetchMyReports();
    } catch (error) {
      toast.error(`Could not update follow status: ${error.message}`);
    }
  };

  const statusCounts = {
    all: reports.length,
    reported: reports.filter((r) => r.status === "reported").length,
    in_progress: reports.filter((r) => r.status === "in_progress").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  const chipClass = (active) =>
    `text-xs font-semibold px-4 py-1.5 rounded-full transition-all shrink-0 whitespace-nowrap ${
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
          <h1 className="text-3xl font-extrabold text-[#5F5F5F] tracking-tight">
            My reports
          </h1>
          <p className="text-xs text-[#5F5F5F] mt-2 max-w-xl leading-relaxed">
            Follow the status, verification and repair progress of every issue
            you have reported.
          </p>
        </div>

        {/* Pill button with the circled icon */}
        <Link
          to="/report/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] py-1 pl-1 pr-5 text-xs font-semibold text-[#5F5F5F] transition-colors"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#38C6DC] bg-[#E6F5F8] text-[#1B8FC0]">
            <PlusCircle className="h-4 w-4" />
          </span>
          <span>Report a new issue</span>
        </Link>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: `All (${statusCounts.all})` },
            { id: "reported", label: `Reported (${statusCounts.reported})` },
            {
              id: "in_progress",
              label: `In progress (${statusCounts.in_progress})`,
            },
            { id: "resolved", label: `Resolved (${statusCounts.resolved})` },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={chipClass(statusFilter === item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative md:w-72">
          <Search className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search my reports"
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#cfe9f0] rounded-full text-xs text-[#4a4a4a] placeholder:text-[#7a8a90] focus:outline-none focus:border-[#1B8FC0]"
          />
        </div>
      </div>

      {/* Reports list */}
      {loading ? (
        <LoadingSkeleton count={3} type="card" />
      ) : reports.length === 0 ? (
        <div className={`${CARD} p-6`}>
          <EmptyState
            title="No reports found"
            description={
              statusFilter !== "all" || searchVal
                ? "No reports match your selected filters."
                : "You haven't submitted any reports yet. Help improve your community by reporting an issue."
            }
            actionLabel="Report an issue"
            onAction={() => window.location.assign("/report/new")}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onUpvote={handleUpvote}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
