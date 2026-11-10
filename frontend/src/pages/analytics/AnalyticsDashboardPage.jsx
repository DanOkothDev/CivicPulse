import React, { useState, useEffect } from "react";
import {
  Flame,
  Clock,
  AlertTriangle,
  Layers,
  ChevronDown,
} from "lucide-react";
import { api } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { BarChart, DonutChart } from "../../components/ui/Charts";
import MapComponent from "../../components/ui/MapComponent";

/*
  Theme (same as the landing, login, register and admin pages)
  mint background  #E6F5F8
  light cyan       #7FD0E0
  bright cyan      #38C6DC
  mid blue         #1B8FC0
  deep blue        #0B5A9C
  soft grey text   #5F5F5F
*/

const GRADIENT = "bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C]";
const CARD =
  "bg-white/80 rounded-3xl border border-[#cfe9f0] shadow-[0_10px_30px_-14px_rgba(11,90,156,0.35)]";
const INNER_CARD = "rounded-2xl bg-[#E6F5F8] border border-[#cfe9f0]";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

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

export default function AnalyticsDashboardPage() {
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState("");
  const [loading, setLoading] = useState(true);

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

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [sum, spots, a] = await Promise.all([
        api.analytics.getSummary(selectedArea || undefined),
        api.analytics.getHotspots(),
        api.reference.getAreas(),
      ]);
      setSummary(sum);
      setHotspots(spots);
      setAreas(a);
    } catch (error) {
      toast.error(`Could not load the numbers: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedArea]);

  // Chart data, in the theme colors
  const statusChartData = summary
    ? [
        {
          label: "Reported",
          value: summary.by_status?.reported ?? 0,
          color: "bg-[#7FD0E0]",
        },
        {
          label: "Verified",
          value: summary.by_status?.verified ?? 0,
          color: "bg-[#38C6DC]",
        },
        {
          label: "Assigned",
          value: summary.by_status?.assigned ?? 0,
          color: "bg-[#1B8FC0]",
        },
        {
          label: "In progress",
          value: summary.by_status?.in_progress ?? 0,
          color: "bg-[#0B5A9C]",
        },
        {
          label: "Resolved",
          value: summary.by_status?.resolved ?? 0,
          color: "bg-emerald-500",
        },
      ]
    : [];

  const categoryDonutData = summary
    ? Object.entries(summary.by_category || {}).map(
        ([label, value], index) => ({
          label,
          value,
          color: [
            "#38C6DC",
            "#0B5A9C",
            "#7FD0E0",
            "#1B8FC0",
            "#5F5F5F",
            "#a5e3ee",
          ][index % 6],
        }),
      )
    : [];

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
            Reports at a glance
          </h1>
          <p className="text-xs text-[#5F5F5F] mt-2 max-w-xl leading-relaxed">
            See which problems keep coming back, where reports are piling up,
            and how quickly they get fixed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              aria-label="Filter by ward"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="appearance-none cursor-pointer text-xs font-bold py-2.5 pl-4 pr-9 bg-white text-[#0B5A9C] rounded-xl shadow-[0_6px_14px_-6px_rgba(11,90,156,0.45)] focus:outline-none focus:ring-2 focus:ring-[#38C6DC]/40"
            >
              <option value="">All wards</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#1B8FC0] absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          title="All reports"
          value={summary?.total_reports ?? 0}
          note="Sent in so far"
          icon={Layers}
        />
        <StatTile
          title="Average days to fix"
          value={
            summary?.avg_days_to_resolve == null
              ? "—"
              : `${summary.avg_days_to_resolve} days`
          }
          note="Resolved reports only"
          icon={Clock}
        />
        <StatTile
          title="Hotspots"
          value={hotspots.length}
          note="Places with many reports"
          icon={Flame}
        />
        <StatTile
          title="Open reports"
          value={summary?.open_reports ?? 0}
          note="Not yet resolved or rejected"
          icon={AlertTriangle}
        />
      </div>

      {/* Hotspots */}
      <div className={`${CARD} p-6 space-y-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-[#5F5F5F]">
              Hotspots
            </h3>
            <p className="text-xs text-[#5F5F5F] mt-1">
              Reports close together are grouped here, so crews know where to go
              first.
            </p>
          </div>
          <span className="text-xs font-bold text-[#0B5A9C] bg-white rounded-full border border-[#cfe9f0] px-4 py-1.5">
            {plural(hotspots.length, "hotspot", "hotspots")}
          </span>
        </div>

        <div className="h-80 rounded-2xl overflow-hidden border border-[#cfe9f0] relative">
          <MapComponent
            center={[-1.2629, 36.8355]}
            zoom={13}
            hotspots={hotspots}
            height="100%"
          />
        </div>

        {hotspots.length === 0 && !loading ? (
          <p className="text-xs text-[#5F5F5F]">No hotspots right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {hotspots.map((spot, index) => (
              <div
                key={spot.id}
                className={`${INNER_CARD} p-3.5 flex items-start gap-3`}
              >
                <div
                  className={`w-9 h-9 rounded-xl ${GRADIENT} text-white flex items-center justify-center shrink-0`}
                >
                  <Flame className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#4a4a4a] truncate mb-0.5">
                    {spot.top_category || `Hotspot ${index + 1}`}
                  </h4>
                  <p className="text-[11px] text-[#5F5F5F]">
                    {plural(spot.report_count, "report", "reports")} within{" "}
                    {spot.radius_m} meters
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${CARD} p-6 space-y-4`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-extrabold text-[#5F5F5F]">
              Reports by status
            </h3>
            <span className="text-xs text-[#7a8a90] font-semibold">
              Up to date
            </span>
          </div>

          <BarChart data={statusChartData} height={200} />
        </div>

        <div className={`${CARD} p-6 space-y-4`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-extrabold text-[#5F5F5F]">
              Reports by category
            </h3>
            <span className="text-xs text-[#7a8a90] font-semibold">
              Share of all reports
            </span>
          </div>

          <DonutChart data={categoryDonutData} size={160} />
        </div>
      </div>

      {/* Open reports by ward */}
      <div className={`${CARD} p-6 space-y-4`}>
        <h3 className="text-base font-extrabold text-[#5F5F5F]">
          Open reports by ward
        </h3>

        {(summary?.open_by_area || []).length === 0 && !loading ? (
          <p className="text-xs text-[#5F5F5F]">No open reports in any ward.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(summary?.open_by_area || []).map((area) => (
              <div key={area.area_id} className={`${INNER_CARD} p-4`}>
                <h4 className="text-xs font-bold text-[#4a4a4a] mb-1">
                  {area.name}
                </h4>
                <span className="text-lg font-extrabold text-[#0B5A9C]">
                  {plural(area.open, "open report", "open reports")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
