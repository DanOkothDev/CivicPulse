import React, { useState, useEffect, useRef } from "react";
import {
  User,
  CheckCircle2,
  FileText,
  Settings,
  MapPin,
  Mail,
  Shield,
  Compass,
  PlayCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../services/api";
import { Link } from "react-router-dom";
import { roleFeatureGuides } from "../../components/onboarding/featureContent";
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
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [reports, setReports] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    product_tour_enabled: true,
    feature_tips_enabled: true,
  });
  const [savingPreference, setSavingPreference] = useState(false);
  const [replayPending, setReplayPending] = useState(false);
  const preferenceRequestRef = useRef(false);

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

  useEffect(() => {
    if (!user) return;
    setPreferences({
      product_tour_enabled: user.product_tour_enabled !== false,
      feature_tips_enabled: user.feature_tips_enabled !== false,
    });
  }, [user]);

  const updatePreference = async (key, value) => {
    if (preferenceRequestRef.current) return;
    preferenceRequestRef.current = true;
    setSavingPreference(true);
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try {
      await api.users.updatePreferences({ [key]: value });
      await refreshUser();
    } catch (error) {
      setPreferences((current) => ({ ...current, [key]: !value }));
      toast.error(`Could not update your preference: ${error.message}`);
    } finally {
      preferenceRequestRef.current = false;
      setSavingPreference(false);
    }
  };

  const replayOnboarding = async () => {
    if (preferenceRequestRef.current) return;
    preferenceRequestRef.current = true;
    setReplayPending(true);
    setSavingPreference(true);
    try {
      await api.users.updatePreferences({
        product_tour_enabled: true,
        onboarding_completed: false,
      });
      await refreshUser();
    } catch (error) {
      toast.error(`Could not restart the user journey: ${error.message}`);
      return;
    } finally {
      preferenceRequestRef.current = false;
      setSavingPreference(false);
      setReplayPending(false);
    }
    window.dispatchEvent(new CustomEvent('civicpulse:open-onboarding'));
  };

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
          <div className="space-y-6">
            <div className={`${CARD} p-6`}>
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-base font-extrabold text-[#5F5F5F]">
                    App Guide & Preferences
                  </h2>
                  <p className="text-xs text-[#5F5F5F] mt-1">
                    Manage onboarding and helpful guidance across CivicPulse.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={replayOnboarding}
                  disabled={replayPending || savingPreference}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#38C6DC] to-[#0B5A9C] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_18px_-10px_rgba(11,90,156,0.8)] disabled:cursor-wait disabled:opacity-60"
                >
                  <PlayCircle className="h-4 w-4" />
                  {replayPending ? "Preparing..." : "Replay User Journey"}
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-[#cfe9f0] bg-[#E6F5F8] p-4">
                  <div>
                    <p className="text-sm font-bold text-[#5F5F5F]">Product Tour</p>
                    <p className="text-[11px] text-[#5F5F5F]">Show a guided walkthrough when you sign in.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePreference('product_tour_enabled', !preferences.product_tour_enabled)}
                    disabled={savingPreference}
                    aria-pressed={preferences.product_tour_enabled}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition disabled:cursor-wait disabled:opacity-60 ${preferences.product_tour_enabled ? 'bg-[#38C6DC]' : 'bg-slate-300'}`}
                    aria-label="Toggle product tour"
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${preferences.product_tour_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-[#cfe9f0] bg-[#E6F5F8] p-4">
                  <div>
                    <p className="text-sm font-bold text-[#5F5F5F]">Contextual Tips</p>
                    <p className="text-[11px] text-[#5F5F5F]">Allow helpful hints and tips across the app.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePreference('feature_tips_enabled', !preferences.feature_tips_enabled)}
                    disabled={savingPreference}
                    aria-pressed={preferences.feature_tips_enabled}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition disabled:cursor-wait disabled:opacity-60 ${preferences.feature_tips_enabled ? 'bg-[#38C6DC]' : 'bg-slate-300'}`}
                    aria-label="Toggle contextual tips"
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${preferences.feature_tips_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className={`${CARD} p-6`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-extrabold text-[#5F5F5F]">
                  Feature Guide
                </h2>
                <div className="flex items-center gap-1.5 text-[#1B8FC0]">
                  <Compass className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em]">Browse</span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {(roleFeatureGuides[user?.role] || roleFeatureGuides.resident).map(
                  ({ name, description, howTo, icon: Icon, to }) => (
                  <article key={name} className="rounded-2xl border border-[#cfe9f0] bg-[#E6F5F8] p-4">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${GRADIENT} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#5F5F5F]">{name}</p>
                        <p className="text-[11px] text-[#5F5F5F]">{description}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#5F5F5F]">
                      <span className="font-bold">How to use:</span> {howTo}
                    </p>
                    <Link
                      to={to}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0B5A9C] hover:underline"
                    >
                      Open feature
                      <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
