import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AboutPage() {
  const { switchRole } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  // How It Works Steps (6 sequential stages)
  const howItWorksSteps = [
    {
      number: '01',
      title: 'Resident submits report',
      shortDesc: 'Citizen snaps a photo of an issue on their phone with automatic GPS lock and description.',
      role: 'Resident (Citizen)',
      actorIcon: Users,
      badge: 'Step 1 • Intake',
      details: 'Sub-meter browser geolocation locks the coordinates. Image metadata captures timestamp and orientation. Takes under 30 seconds.',
      metric: 'Average submission: 28 seconds',
    },
    {
      number: '02',
      title: 'AI checks duplicates',
      shortDesc: 'Machine learning analyzes 200m spatial proximity and visual similarity to detect duplicates.',
      role: 'AI Verification Engine',
      actorIcon: Sparkles,
      badge: 'Step 2 • Machine Learning',
      details: 'Spatial radius calculations and category classifiers match existing tickets to prevent redundant truck dispatches.',
      metric: '94% duplicate clustering accuracy',
    },
    {
      number: '03',
      title: 'Verification officer reviews',
      shortDesc: 'Municipal triage officer inspects AI suggestions, validates evidence, and approves valid cases.',
      role: 'Verifier (Triage Desk)',
      actorIcon: ShieldCheck,
      badge: 'Step 3 • Validation',
      details: 'Triage officer confirms defect severity, tags appropriate jurisdiction, and rejects fraudulent or duplicate filings.',
      metric: 'Average triage time: 42 minutes',
    },
    {
      number: '04',
      title: 'Authority receives assignment',
      shortDesc: 'Public Works assigns field crews with guaranteed SLA deadlines and prioritized work orders.',
      role: 'Authority (Field Crews)',
      actorIcon: Wrench,
      badge: 'Step 4 • Dispatch',
      details: 'Field teams receive work orders with routing maps, required materials, and clear resolution milestones.',
      metric: 'SLA target: 48h resolution clock',
    },
    {
      number: '05',
      title: 'Issue resolved',
      shortDesc: 'Field crew completes physical repair, uploads proof-of-work photo, and marks ticket complete.',
      role: 'Field Crew & Inspector',
      actorIcon: CheckCircle2,
      badge: 'Step 5 • Field Repair',
      details: 'Photo proof of completed work is appended to the ticket audit trail for civic transparency and review.',
      metric: '100% verified repair proof',
    },
    {
      number: '06',
      title: 'Resident receives notification',
      shortDesc: 'Citizens who reported or followed the issue receive instant notification with resolution details.',
      role: 'Neighborhood Community',
      actorIcon: Bell,
      badge: 'Step 6 • Closed-Loop',
      details: 'The reporting citizen earns Civic XP trust points, and the live community map status turns green.',
      metric: 'Instant SMS & Push Delivery',
    },
  ];

  // 4 User Roles
  const userRoles = [
    {
      name: 'Resident',
      roleKey: 'resident',
      badge: 'Citizen Engagement',
      actionTitle: 'Reports problems',
      description: 'Snaps photos with GPS lock, follows local repairs, receives resolution alerts, and builds neighborhood trust scores.',
      destination: '/dashboard',
      color: 'from-blue-500/10 to-indigo-500/10 border-blue-200',
      iconColor: 'bg-blue-600 text-white',
      accentColor: 'text-blue-600',
      icon: Users,
      features: ['Photo & GPS submission', 'Track neighborhood tickets', 'Earn Civic XP badges', 'Follow local wards'],
    },
    {
      name: 'Verifier',
      roleKey: 'verifier',
      badge: 'Intake & Triage',
      actionTitle: 'Reviews reports',
      description: 'Inspects AI duplicate detections within 200m, validates photo authenticity, merges duplicates, and approves for dispatch.',
      destination: '/verifier/queue',
      color: 'from-sky-500/10 to-cyan-500/10 border-sky-200',
      iconColor: 'bg-sky-600 text-white',
      accentColor: 'text-sky-600',
      icon: ShieldCheck,
      features: ['200m AI duplicate clustering', 'Photo severity inspection', 'Merge & split operations', 'Ward jurisdiction routing'],
    },
    {
      name: 'Authority',
      roleKey: 'authority',
      badge: 'Field Operations',
      actionTitle: 'Fixes defects',
      description: 'Receives prioritized work orders with SLA timers, updates live progress in the field, and uploads photo proof of repair.',
      destination: '/authority/assigned',
      color: 'from-indigo-500/10 to-purple-500/10 border-indigo-200',
      iconColor: 'bg-indigo-600 text-white',
      accentColor: 'text-indigo-600',
      icon: Wrench,
      features: ['Field work orders dispatch', 'SLA countdown timers', 'Resolution photo evidence', 'Crew route optimization'],
    },
    {
      name: 'Administrator',
      roleKey: 'admin',
      badge: 'Oversight & Governance',
      actionTitle: 'Monitors the system',
      description: 'Manages user roles, configures ward polygons, oversees system-wide SLAs, and tracks infrastructure health metrics.',
      destination: '/admin',
      color: 'from-purple-500/10 to-pink-500/10 border-purple-200',
      iconColor: 'bg-purple-600 text-white',
      accentColor: 'text-purple-600',
      icon: Building2,
      features: ['System-wide governance', 'User role management', 'Ward boundaries & categories', 'Full audit trail access'],
    },
  ];

  const handleTestDriveRole = (roleKey, destination) => {
    switchRole(roleKey);
    navigate(destination);
  };

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 block mb-3">
            About CivicPulse
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
            Citizen Intelligence for Modern Cities
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            CivicPulse bridges the divide between citizens and local government. We replace chaotic chat threads and lost complaints with automated spatial verification and auditable resolution workflows.
          </p>
        </div>

        {/* Section 1: End-To-End Lifecycle */}
        <section className="mb-24 sm:mb-32">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 block mb-2">
              End-To-End Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              From Citizen Report to Field Resolution
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
              Every issue follows a strict, verifiable sequence where every action, timestamp, and photograph is recorded.
            </p>
          </div>

          {/* Step Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {howItWorksSteps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`p-4 rounded-2xl text-left transition-all border ${
                  activeStep === idx
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 -translate-y-1'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${
                    activeStep === idx ? 'text-blue-200' : 'text-blue-600'
                  }`}
                >
                  Step {step.number}
                </span>
                <h4 className="text-xs font-bold truncate">{step.title}</h4>
                <span
                  className={`text-[10px] font-semibold block mt-1 ${
                    activeStep === idx ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {step.role}
                </span>
              </button>
            ))}
          </div>

          {/* Active Step Showcase Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-12 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-extrabold tracking-wide">
                    {howItWorksSteps[activeStep].badge}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    Actor: {howItWorksSteps[activeStep].role}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {howItWorksSteps[activeStep].title}
                </h3>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  {howItWorksSteps[activeStep].shortDesc}
                </p>

                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {howItWorksSteps[activeStep].details}
                </p>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900 font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Performance Metric: {howItWorksSteps[activeStep].metric}</span>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400 font-mono">
                    <span>AUDIT_RECORD_STAGE #{howItWorksSteps[activeStep].number}</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      VERIFIED
                    </span>
                  </div>
                  <div className="py-6 space-y-3 font-mono text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>FLOW:</span>
                      <span className="text-blue-300 font-bold">{howItWorksSteps[activeStep].title}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>RESPONSIBLE:</span>
                      <span className="text-white font-bold">{howItWorksSteps[activeStep].role}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>INTEGRITY:</span>
                      <span className="text-emerald-300 font-bold">PostGIS SRID 4326</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Automated In-App Dispatch Sync</span>
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
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 block mb-2">
              Stakeholder Ecosystem
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              One Platform, Four Dedicated Stakeholders
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
              CivicPulse enforces strict role-based access control. Each civic actor operates with specialized tools tailored to their responsibility.
            </p>
          </div>

          {/* 4 Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {userRoles.map((roleObj, i) => (
              <div
                key={i}
                className={`p-6 rounded-3xl bg-gradient-to-b ${roleObj.color} border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl ${roleObj.iconColor} flex items-center justify-center shadow-sm`}>
                      <roleObj.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                      {roleObj.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 mb-1">
                    {roleObj.name}
                  </h3>
                  <span className={`text-xs font-bold ${roleObj.accentColor} block mb-3`}>
                    {roleObj.actionTitle}
                  </span>

                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    {roleObj.description}
                  </p>

                  <div className="space-y-2 mb-6">
                    {roleObj.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-[11px] text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleTestDriveRole(roleObj.roleKey, roleObj.destination)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-900 hover:text-white text-slate-800 text-xs font-bold border border-slate-200/90 shadow-2xs transition-all flex items-center justify-center gap-1.5 group"
                >
                  <span>Test Drive {roleObj.name} View</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Testimonials */}
        <section className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 block mb-2">
              Voices from the Ground
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Trusted by Citizens & City Crews Alike
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
              Read how CivicPulse transforms neighborhood infrastructure for everyone involved.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-4">
                  {'★'.repeat(5)}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed italic mb-6">
                  "I reported a deep road pothole on Monday morning on my phone. By Tuesday afternoon, the verifier approved the case, Crew 4B was on site, and I received photo proof of the patch."
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200/60">
                <span className="font-bold text-xs text-slate-900 block">Faith Wanjiku</span>
                <span className="text-[11px] text-slate-500">Ward 4 Resident</span>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-4">
                  {'★'.repeat(5)}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed italic mb-6">
                  "The 200m spatial duplicate matching completely cleaned up our intake inbox. Instead of 40 separate tickets for one burst pipe, we have one parent ticket with verified community count."
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200/60">
                <span className="font-bold text-xs text-slate-900 block">J. Ramirez</span>
                <span className="text-[11px] text-slate-500">Municipal Triage Verifier</span>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-4">
                  {'★'.repeat(5)}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed italic mb-6">
                  "Our asphalt crew receives tickets with exact GPS coordinates and photo evidence before we roll out the trucks. No guessing, no driving in circles looking for the problem."
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200/60">
                <span className="font-bold text-xs text-slate-900 block">Alex Chen</span>
                <span className="text-[11px] text-slate-500">Public Works Field Crew Lead</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-10 sm:p-14 text-center shadow-xl">
          <h3 className="text-2xl sm:text-4xl font-black mb-4 tracking-tight">
            Ready to improve your neighborhood?
          </h3>
          <p className="text-blue-100 max-w-xl mx-auto text-sm sm:text-base mb-8">
            Join thousands of active residents taking action to build safer, more responsive communities.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/report/new"
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs py-3 px-6 rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Report an Issue</span>
            </Link>
            <Link
              to="/map"
              className="bg-blue-800/80 hover:bg-blue-800 text-white border border-blue-400/40 font-bold text-xs py-3 px-6 rounded-xl transition-all flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              <span>Explore Live Map</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
