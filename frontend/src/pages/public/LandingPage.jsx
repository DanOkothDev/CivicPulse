import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Wrench,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { api } from '../../services/api';

export default function LandingPage() {
  const [apiHealth, setApiHealth] = useState(null);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    let isMounted = true;
    api.health
      .check()
      .then((health) => {
        if (isMounted) setApiHealth(health);
      })
      .catch((error) => {
        if (isMounted) setApiError(error.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-blue-100/60 via-indigo-50/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[600px] -left-40 w-[600px] h-[600px] bg-emerald-100/35 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-6 lg:px-12 z-10">
        <div className="max-w-7xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.08] mb-6 max-w-5xl mx-auto">
            See a Problem.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
              Report It.
            </span>{' '}
            Track the Solution.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
            A municipal reporting platform for infrastructure issues. Submit a report with its location and photo, then follow its status through the staff workflow. Optional AI integrations can provide duplicate suggestions.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              to="/report/new"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-xl shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2.5 group"
            >
              <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Report an Issue</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/map"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl border border-slate-200/90 bg-white/90 hover:bg-white text-slate-800 font-bold text-sm shadow-sm hover:border-slate-300 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Explore Live Map</span>
            </Link>
          </div>

          {/* Quick Sign Up / Login Access */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-14">
            <span>New resident?</span>
            <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
              Create an account (Sign Up)
            </Link>
            <span>•</span>
            <span>Already registered?</span>
            <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
              Sign In
            </Link>
          </div>

          {/* Workflow Pipeline Container */}
          <div className="relative max-w-6xl mx-auto pt-4 pb-6">
            <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-10 relative overflow-hidden text-left bg-gradient-to-b from-white/95 to-slate-50/80">
              {/* Window Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="font-sans text-xs font-bold text-slate-700 ml-2">
                    CivicPulse • Transparent 4-Step Resolution Process
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Workflow Overview
                  </span>
                </div>
              </div>

              {/* 4-Stage Hero Workflow Pipeline Illustration */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-8 relative">
                {/* Stage 1 */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative group hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm mb-3">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
                    Stage 01
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                    Residents Reporting Issues
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Submits a photo, location, category, and description for an infrastructure issue.
                  </p>
                </div>

                {/* Stage 2 */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative group hover:border-indigo-300 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-3">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                    Stage 02
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                    Optional Background Processing
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    If configured, background integrations can classify reports and suggest possible duplicates.
                  </p>
                </div>

                {/* Stage 3 */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative group hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                    Stage 03
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                    Authorities Responding
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Authorized staff assign verified reports to authority users and may set a due date.
                  </p>
                </div>

                {/* Stage 4 */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative group hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm mb-3">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                    Stage 04
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                    Community Improvements
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Staff update the report status, and the author and followers receive in-app notifications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Final Call to Action */}
      <section className="py-20 px-6 lg:px-12 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Empower Your Neighborhood Today
          </h2>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Take a photo, drop a pin, and watch your local government resolve issues transparently.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/report/new"
              className="bg-white text-blue-700 hover:bg-blue-50 font-black text-xs py-3.5 px-7 rounded-xl shadow-xl transition-all flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Report an Issue</span>
            </Link>
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 font-bold text-xs py-3.5 px-7 rounded-xl transition-all flex items-center gap-2"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
