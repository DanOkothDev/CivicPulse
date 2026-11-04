import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Sparkles,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  Bell,
  Building2,
  Clock,
  ArrowRight,
  MapPin,
  Camera,
} from "lucide-react";

/*
  Theme (taken from the reference landing page)
  mint background   #E6F5F8
  light cyan        #7FD0E0
  bright cyan       #38C6DC
  mid blue          #1B8FC0
  deep blue         #0B5A9C
  soft grey text    #5F5F5F
*/

const GRADIENT = "bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C]";

// Pill button with the circled arrow, matching reference
function PillLink({ to, icon: Icon = ArrowRight, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-3 rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] p-1 pr-8 text-base font-semibold text-[#5F5F5F] transition-colors"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[#38C6DC] bg-[#E6F5F8] text-[#1B8FC0]">
        <Icon className="w-5 h-5" />
      </span>
      <span>{children}</span>
    </Link>
  );
}

// White button with deep blue text, matching reference
function WhiteLink({ to, icon: Icon, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0B5A9C] shadow-[0_8px_18px_-8px_rgba(11,90,156,0.5)] hover:bg-[#f4fbfd] transition-colors"
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{children}</span>
    </Link>
  );
}

export default function AboutPage() {
  const [activeStep, setActiveStep] = useState(0);

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

  // How It Works Steps (6 sequential stages)
  const howItWorksSteps = [
    {
      number: "01",
      title: "Resident submits report",
      shortDesc:
        "A resident submits an issue with its location, description, and a supporting photo.",
      role: "Resident (Citizen)",
      actorIcon: Users,
      badge: "Step 1 • Intake",
      details:
        "The report is stored with its category, coordinates, description, and uploaded photo.",
    },
    {
      number: "02",
      title: "Background processing",
      shortDesc:
        "Reports can be automatically categorized and checked for nearby duplicates.",
      role: "Background Worker",
      actorIcon: Sparkles,
      badge: "Step 2 • Optional AI",
      details:
        "AI processing is optional and runs through the background worker; it is not required to submit a report.",
    },
    {
      number: "03",
      title: "Verification officer reviews",
      shortDesc:
        "A verifier reviews the report and its evidence before approving or rejecting it.",
      role: "Verifier (Triage Desk)",
      actorIcon: ShieldCheck,
      badge: "Step 3 • Validation",
      details:
        "Every status change and rejection reason is recorded in the report history.",
    },
    {
      number: "04",
      title: "Authority receives assignment",
      shortDesc:
        "An authorized staff member assigns a verified report to an authority user.",
      role: "Authority (Field Crews)",
      actorIcon: Wrench,
      badge: "Step 4 • Dispatch",
      details:
        "Assignments can include an optional due date; the assigned authority can then advance the work status.",
    },
    {
      number: "05",
      title: "Issue resolved",
      shortDesc:
        "The assigned authority updates the report as work progresses and marks it resolved.",
      role: "Field Crew & Inspector",
      actorIcon: CheckCircle2,
      badge: "Step 5 • Field Repair",
      details:
        "The status history records the resolution as part of the report’s audit trail.",
    },
    {
      number: "06",
      title: "Resident receives notification",
      shortDesc:
        "Report authors and followers are notified when important status changes occur.",
      role: "Neighborhood Community",
      actorIcon: Bell,
      badge: "Step 6 • Closed-Loop",
      details:
        "Notifications are available in the application and link back to the related report.",
    },
  ];

  // 4 User Roles
  const userRoles = [
    {
      name: "Resident",
      badge: "Citizen Engagement",
      actionTitle: "Reports problems",
      description:
        "Submits reports with location and photo evidence, follows reports, and receives status notifications.",
      icon: Users,
      features: [
        "Submit a report with a photo",
        "Track report status",
        "Follow reports",
        "View in-app notifications",
      ],
    },
    {
      name: "Verifier",
      badge: "Intake & Triage",
      actionTitle: "Reviews reports",
      description:
        "Reviews reports, checks available duplicate suggestions, and verifies or rejects submissions.",
      icon: ShieldCheck,
      features: [
        "Review report evidence",
        "Check optional duplicate suggestions",
        "Verify or reject reports",
        "Merge or unmerge duplicates",
      ],
    },
    {
      name: "Authority",
      badge: "Field Operations",
      actionTitle: "Fixes defects",
      description:
        "Works on assigned reports, updates their status, and records resolution notes.",
      icon: Wrench,
      features: [
        "View assigned work orders",
        "Start work",
        "Record status changes",
        "Mark work resolved",
      ],
    },
    {
      name: "Administrator",
      badge: "Oversight & Governance",
      actionTitle: "Monitors the system",
      description:
        "Manages user roles, report categories, and service areas, and can access staff analytics.",
      icon: Building2,
      features: [
        "Manage user roles",
        "Manage categories",
        "Manage service areas",
        "View staff analytics",
      ],
    },
  ];

  return (
    <div
      className="relative overflow-x-hidden bg-[#E6F5F8]"
      style={{
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          {/* Page Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#1B8FC0] block mb-3">
              About CivicPulse
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-[#5F5F5F] tracking-tight leading-tight mb-6">
              Citizen Intelligence for Modern Cities
            </h1>
            <p className="text-base sm:text-lg text-[#5F5F5F] leading-relaxed">
              CivicPulse bridges the divide between citizens and local
              government. We replace chaotic chat threads and lost complaints
              with automated spatial verification and auditable resolution
              workflows.
            </p>
          </div>

          {/* Section 1: End-To-End Lifecycle */}
          <section className="mb-24 sm:mb-32">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#1B8FC0] block mb-2">
                End-To-End Lifecycle
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#5F5F5F] tracking-tight">
                From Citizen Report to Field Resolution
              </h2>
              <p className="text-sm sm:text-base text-[#5F5F5F] mt-3 leading-relaxed">
                Every issue follows a strict, verifiable sequence where every
                action, timestamp, and photograph is recorded.
              </p>
            </div>

            {/* Step Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              {howItWorksSteps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`p-4 rounded-3xl text-left transition-all border ${
                    activeStep === idx
                      ? `${GRADIENT} text-white border-transparent shadow-[0_10px_25px_-10px_rgba(11,90,156,0.5)] -translate-y-1`
                      : "bg-white/80 border-[#cfe9f0] text-[#5F5F5F] hover:border-[#38C6DC] hover:bg-white"
                  }`}
                >
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-widest block mb-1 ${
                      activeStep === idx ? "text-[#E6F5F8]" : "text-[#1B8FC0]"
                    }`}
                  >
                    Step {step.number}
                  </span>
                  <h4 className="text-xs font-extrabold truncate">
                    {step.title}
                  </h4>
                  <span
                    className={`text-[10px] font-semibold block mt-1 ${
                      activeStep === idx ? "text-white/80" : "text-[#5F5F5F]/70"
                    }`}
                  >
                    {step.role}
                  </span>
                </button>
              ))}
            </div>

            {/* Active Step Showcase Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-[#cfe9f0] shadow-[0_15px_35px_-15px_rgba(11,90,156,0.3)] p-8 sm:p-12 relative overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3.5 py-1 rounded-full bg-[#E6F5F8] text-[#0B5A9C] text-xs font-extrabold tracking-wide border border-[#7FD0E0]/50">
                      {howItWorksSteps[activeStep].badge}
                    </span>
                    <span className="px-3.5 py-1 rounded-full bg-[#E6F5F8]/70 text-[#5F5F5F] text-xs font-bold">
                      Actor: {howItWorksSteps[activeStep].role}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-4xl font-extrabold text-[#5F5F5F] tracking-tight">
                    {howItWorksSteps[activeStep].title}
                  </h3>

                  <p className="text-sm sm:text-base text-[#5F5F5F] leading-relaxed">
                    {howItWorksSteps[activeStep].shortDesc}
                  </p>

                  <p className="text-xs sm:text-sm text-[#5F5F5F]/80 leading-relaxed">
                    {howItWorksSteps[activeStep].details}
                  </p>
                </div>

                <div className="lg:col-span-5">
                  <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400 font-mono">
                      <span>
                        WORKFLOW_STAGE #{howItWorksSteps[activeStep].number}
                      </span>
                      <span className="text-[#38C6DC] flex items-center gap-1 font-bold">
                        <span className="w-2 h-2 rounded-full bg-[#38C6DC]" />
                        PROCESS OVERVIEW
                      </span>
                    </div>
                    <div className="py-6 space-y-3 font-mono text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>FLOW:</span>
                        <span className="text-[#38C6DC] font-bold">
                          {howItWorksSteps[activeStep].title}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>RESPONSIBLE:</span>
                        <span className="text-white font-bold">
                          {howItWorksSteps[activeStep].role}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>RECORD:</span>
                        <span className="text-emerald-400 font-bold">
                          Report workflow history
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#38C6DC]" />
                        <span>In-app report notifications</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: One Platform, Four Dedicated Stakeholders */}
          <section className="mb-24 sm:mb-32">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#1B8FC0] block mb-2">
                Stakeholder Ecosystem
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#5F5F5F] tracking-tight">
                One Platform, Four Dedicated Stakeholders
              </h2>
              <p className="text-sm sm:text-base text-[#5F5F5F] mt-3 leading-relaxed">
                CivicPulse enforces strict role-based access control. Each civic
                actor operates with specialized tools tailored to their
                responsibility.
              </p>
            </div>

            {/* 4 Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {userRoles.map((roleObj, i) => (
                <div
                  key={i}
                  className="p-6 rounded-3xl bg-white/80 border border-[#cfe9f0] shadow-[0_10px_30px_-14px_rgba(11,90,156,0.35)] hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl ${GRADIENT} flex items-center justify-center text-white shadow-[0_8px_16px_-6px_rgba(11,90,156,0.6)]`}
                      >
                        <roleObj.icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold text-[#5F5F5F] bg-[#E6F5F8] px-2.5 py-1 rounded-full border border-[#7FD0E0]">
                        {roleObj.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-[#5F5F5F] mb-1">
                      {roleObj.name}
                    </h3>
                    <span className="text-xs font-bold text-[#1B8FC0] block mb-3">
                      {roleObj.actionTitle}
                    </span>

                    <p className="text-xs text-[#5F5F5F] leading-relaxed mb-6">
                      {roleObj.description}
                    </p>

                    <div className="space-y-2.5 mb-6">
                      {roleObj.features.map((feat, fIdx) => (
                        <div
                          key={fIdx}
                          className="flex items-center gap-2 text-[11px] text-[#5F5F5F]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#38C6DC] shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Link
                    to="/login"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#E6F5F8] hover:bg-[#0B5A9C] hover:text-white text-[#0B5A9C] text-xs font-bold border border-[#7FD0E0]/60 transition-all flex items-center justify-center gap-1.5 group"
                  >
                    <span>Sign in to access this role</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Banner matching reference style */}
          <section
            className={`relative overflow-hidden ${GRADIENT} text-white rounded-3xl p-10 sm:p-14 text-center shadow-xl`}
          >
            <div
              aria-hidden="true"
              className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 pointer-events-none"
            />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                Ready to improve your neighborhood?
              </h2>
              <p className="text-white/90 text-sm sm:text-base mb-8">
                Join thousands of active residents taking action to build safer,
                more responsive communities.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <WhiteLink to="/report/new" icon={Camera}>
                  Report an issue
                </WhiteLink>
                <PillLink to="/map" icon={MapPin}>
                  Explore live map
                </PillLink>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
