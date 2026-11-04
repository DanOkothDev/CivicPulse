import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  MapPin,
  Search,
  ThumbsUp,
  X,
  ArrowRight,
  PlusCircle,
} from "lucide-react";
import { api } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import MapComponent from "../../components/ui/MapComponent";
import StatusBadge from "../../components/ui/StatusBadge";

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
const SELECT =
  "text-xs font-semibold py-2 px-4 bg-white border border-[#cfe9f0] rounded-full text-[#5F5F5F] focus:outline-none focus:border-[#1B8FC0] cursor-pointer";

// Dot colors match the map markers, so they stay as they are
const LEGEND = [
  { label: "Reported", color: "bg-amber-500" },
  { label: "Verified", color: "bg-blue-600" },
  { label: "Assigned", color: "bg-purple-600" },
  { label: "In progress", color: "bg-orange-500" },
  { label: "Resolved", color: "bg-emerald-500" },
  { label: "Rejected", color: "bg-rose-500" },
];

export default function CommunityMapPage() {
  const [searchParams] = useSearchParams();
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
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "",
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all",
  );
  const [searchVal, setSearchVal] = useState(searchParams.get("search") || "");
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load categories and reports
  useEffect(() => {
    api.reference
      .getCategories()
      .then(setCategories)
      .catch((error) =>
        toast.error(`Could not load report categories: ${error.message}`),
      );
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.reports.list({
        status: statusFilter !== "all" ? statusFilter : undefined,
        category_id: selectedCategory || undefined,
        search: searchVal || undefined,
      });
      setReports(res.items || []);
    } catch (error) {
      toast.error(`Could not load map reports: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter, selectedCategory, searchVal]);

  const handleMarkerClick = (report) => {
    setSelectedReport(report);
  };

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl bg-[#E6F5F8] p-6 h-[calc(100vh-8.5rem)] min-h-[560px] flex flex-col gap-4"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-[#5F5F5F] tracking-tight">
            Community map
          </h1>
          <p className="text-xs text-[#5F5F5F] mt-1">
            See reported problems around the city and where they are.
          </p>
        </div>

        <Link
          to="/report/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] py-1 pl-1 pr-5 text-xs font-semibold text-[#5F5F5F] transition-colors"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#38C6DC] bg-[#E6F5F8] text-[#1B8FC0]">
            <PlusCircle className="h-4 w-4" />
          </span>
          <span>Report a problem</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 md:max-w-md">
          <Search className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search by problem, street or landmark"
            aria-label="Search the map"
            className="w-full pl-10 pr-9 py-2 bg-white border border-[#cfe9f0] rounded-full text-xs text-[#4a4a4a] placeholder:text-[#7a8a90] focus:outline-none focus:border-[#1B8FC0]"
          />
          {searchVal && (
            <button
              type="button"
              onClick={() => setSearchVal("")}
              aria-label="Clear search"
              className="absolute right-3 top-2.5 text-[#7a8a90] hover:text-[#0B5A9C]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className={SELECT}
          >
            <option value="all">All statuses</option>
            <option value="reported">Reported</option>
            <option value="verified">Verified</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            className={SELECT}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <span className="text-xs font-bold text-[#0B5A9C] bg-[#38C6DC]/30 px-3.5 py-2 rounded-full">
            {reports.length} on the map
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0 relative rounded-3xl overflow-hidden border border-[#cfe9f0] shadow-[0_10px_30px_-14px_rgba(11,90,156,0.35)]">
        <MapComponent
          center={[-1.2629, 36.8355]}
          zoom={13}
          reports={reports}
          selectedReport={selectedReport}
          onMarkerClick={handleMarkerClick}
          height="100%"
        />

        {/* Selected report card */}
        {selectedReport && (
          <div
            className={`${CARD} absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 p-4 z-20`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedReport.status} size="xs" />
                <span className="text-[11px] font-bold text-[#7a8a90]">
                  #{selectedReport.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                aria-label="Close"
                className="text-[#7a8a90] hover:text-[#0B5A9C] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-3 mb-3">
              <img
                src={selectedReport.photo_url}
                alt={selectedReport.category?.name}
                className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-[#cfe9f0]"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-xs font-bold text-[#4a4a4a] truncate mb-1">
                  {selectedReport.category?.name}
                </h2>
                <p className="text-[11px] text-[#5F5F5F] line-clamp-2 leading-relaxed">
                  {selectedReport.description}
                </p>
                <p className="text-[11px] text-[#7a8a90] mt-1 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-[#1B8FC0] shrink-0" />
                  <span>
                    {selectedReport.location
                      ? `${selectedReport.location.lat.toFixed(5)}, ${selectedReport.location.lon.toFixed(5)}`
                      : "Location unavailable"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#cfe9f0]">
              <span className="text-[11px] font-bold text-[#5F5F5F] flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5 text-[#1B8FC0]" />
                <span>
                  {selectedReport.report_count}{" "}
                  {selectedReport.report_count === 1 ? "upvote" : "upvotes"}
                </span>
              </span>

              <Link
                to={`/reports/${selectedReport.id}`}
                className={`inline-flex items-center gap-1.5 rounded-full ${GRADIENT} px-3.5 py-1.5 text-xs font-bold text-white hover:brightness-110 transition`}
              >
                <span>View details</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Legend */}
        <div
          className={`${CARD} absolute top-4 left-4 z-10 p-3 hidden sm:block`}
        >
          <div className="text-xs font-bold text-[#5F5F5F] mb-2">
            Status key
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            {LEGEND.map((item) => (
              <span
                key={item.label}
                className="flex items-center gap-1.5 text-[#5F5F5F]"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span>{item.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
