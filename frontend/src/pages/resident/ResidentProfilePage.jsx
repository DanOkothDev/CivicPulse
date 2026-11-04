import React, { useState, useEffect } from "react";
import {
  User,
  CheckCircle2,
  FileText,
  Settings,
  MapPin,
  Mail,
  Shield,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../services/api";
import ReportCard from "../../components/ui/ReportCard";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSkeleton from "../../components/ui/LoadingSkeleton";

/*
  Theme (same as the landing, login, register, admin and analytics pages)
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

function DetailTile({ label, icon: Icon, children }) {
  return (
    <div className={`${INNER_CARD} p-4`}>
      <dt className="flex items-center gap-1.5 text-[#7a8a90] mb-1.5 font-semibold">
        <Icon className="w-3.5 h-3.5 text-[#1B8FC0]" />
        {label}
      </dt>
      <dd className="font-bold text-[#4a4a4a] break-words">{children}</dd>
    </div>
  );
}

export default function ResidentProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [reports, setReports] = useState([]);
  const [areas, setAreas] = useState([]);
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

  useEffect(() => {
    let mounted = true;
    api.reports
      .list({ mine: true })
      .then((response) => {
        if (mounted) setReports(response.items || []);
      })
      .catch((error) => {
        if (mounted)
          toast.error(`Could not load your reports: ${error.message}`);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // Used to show the ward name instead of a number
    api.reference
      .getAreas()
      .then((list) => {
        if (mounted) setAreas(list || []);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const resolvedCount = reports.filter(
    (report) => report.status === "resolved",
  ).length;
  const wardName =
    user?.area_id == null
      ? "No ward chosen"
      : areas.find((area) => area.id === user.area_id)?.name || "Loading...";

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl bg-[#E6F5F8] p-6"
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

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Profile header */}
        <div className={`${CARD} p-6 flex items-center gap-5`}>
          <div
            className={`w-16 h-16 shrink-0 rounded-2xl ${GRADIENT} text-white flex items-center justify-center shadow-[0_8px_16px_-6px_rgba(11,90,156,0.6)]`}
          >
            <User className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-[#5F5F5F] truncate">
              {user?.name}
            </h1>
            <p className="text-xs text-[#5F5F5F] mt-1 truncate">
              {user?.email}
            </p>
            <span className="inline-block mt-2 bg-white text-[#0B5A9C] border border-[#cfe9f0] text-xs font-bold px-3 py-1 rounded-full capitalize">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "overview", label: "Overview", icon: User },
            {
              id: "reports",
              label: `My reports (${reports.length})`,
              icon: FileText,
            },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatTile
                title="Reports sent"
                value={reports.length}
                note="From your account"
                icon={FileText}
              />
              <StatTile
                title="Reports fixed"
                value={resolvedCount}
                note="Marked as resolved"
                icon={CheckCircle2}
              />
            </div>

            <div className={`${CARD} p-6 space-y-4`}>
              <h2 className="text-base font-extrabold text-[#5F5F5F]">
                Your details
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <DetailTile label="Email" icon={Mail}>
                  {user?.email}
                </DetailTile>
                <DetailTile label="Role" icon={Shield}>
                  <span className="capitalize">{user?.role}</span>
                </DetailTile>
                <DetailTile label="Ward" icon={MapPin}>
                  {wardName}
                </DetailTile>
              </dl>
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-4">
            {loading ? (
              <LoadingSkeleton count={2} type="card" />
            ) : reports.length ? (
              reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))
            ) : (
              <EmptyState
                title="No reports yet"
                description="Reports you send will show up here."
              />
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className={`${CARD} p-6`}>
            <h2 className="text-base font-extrabold text-[#5F5F5F]">
              Settings
            </h2>
            <p className="text-xs text-[#5F5F5F] mt-2">
              You can&apos;t edit your profile or notification choices yet. This
              is coming later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
