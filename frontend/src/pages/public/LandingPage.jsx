import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Wrench,
} from "lucide-react";
import { api } from "../../services/api";

/*
  Theme (taken from the landing page design)
  mint background  #E6F5F8
  light cyan       #7FD0E0
  bright cyan      #38C6DC
  mid blue         #1B8FC0
  deep blue        #0B5A9C
  soft grey text   #5F5F5F
*/

const GRADIENT = "bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C]";

// Pill button with the circled arrow, like Subscribe
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

// White button with blue text, like Log In
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

const STEPS = [
  {
    icon: Camera,
    title: "Residents report",
    text: "Send a photo, location, category and short description of the problem.",
  },
  {
    icon: Sparkles,
    title: "Reports are checked",
    text: "Where it is switched on, reports are sorted automatically and possible duplicates are suggested to staff.",
  },
  {
    icon: Wrench,
    title: "Authorities respond",
    text: "Staff give verified reports to an authority and can set a due date.",
  },
  {
    icon: CheckCircle2,
    title: "You see the result",
    text: "Staff update the status, and the person who reported it and anyone following it get a notification.",
  },
];

export default function LandingPage() {
  const [apiHealth, setApiHealth] = useState(null);
  const [apiError, setApiError] = useState("");

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
    <div
      className="relative overflow-x-hidden bg-[#E6F5F8]"
      style={{
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Hero */}
      <section className="relative px-6 lg:px-12 pt-12 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <div className="relative z-10 max-w-xl">
            <p className="text-lg font-semibold text-[#5F5F5F] mb-2">
              Report. Track. Fixed.
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#5F5F5F] tracking-tight leading-[1.05] mb-6">
              See a problem. Report it. Track the fix.
            </h1>
            <p className="text-sm text-[#2f3a3f] leading-relaxed mb-8 max-w-md">
              Report a road, water, lighting or other public problem with a
              photo and its location, then follow it until it is fixed. Reports
              about the same problem nearby are flagged so staff can review them
              together.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <PillLink to="/report/new">Report an issue</PillLink>
              <WhiteLink to="/map" icon={MapPin}>
                View the map
              </WhiteLink>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5F5F5F]">
              <span>New here?</span>
              <Link
                to="/register"
                className="font-bold text-[#0B5A9C] hover:underline"
              >
                Create an account
              </Link>
              <span className="ml-2">Already have one?</span>
              <Link
                to="/login"
                className="font-bold text-[#0B5A9C] hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Shapes, taken from the design */}
          <div
            aria-hidden="true"
            className="relative h-72 sm:h-96 lg:h-[520px]"
          >
            <svg
              viewBox="0 0 600 520"
              preserveAspectRatio="xMidYMid slice"
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <linearGradient id="lp-main" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7FD0E0" />
                  <stop offset="0.45" stopColor="#38C6DC" />
                  <stop offset="1" stopColor="#0B5A9C" />
                </linearGradient>
                <linearGradient id="lp-soft" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#ffffff" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path
                d="M170 0 H600 V520 H250 C190 470 205 400 275 372 C335 348 335 290 288 272 C228 250 168 262 138 205 C108 150 135 70 170 0 Z"
                fill="url(#lp-main)"
              />
              <path
                d="M230 0 H600 V300 C560 340 500 330 470 290 C440 250 380 250 350 200 C320 150 260 120 230 0 Z"
                fill="url(#lp-soft)"
              />
              <path
                d="M170 40 C220 160 300 170 360 140"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.7"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              <path
                d="M365 150 C400 200 395 260 350 290"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.7"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
            </svg>
            <div className="absolute right-[18%] top-[48%] h-16 w-16 rotate-12 rounded-2xl bg-white/45 shadow-lg" />
            <div className="absolute right-[8%] top-[64%] h-9 w-9 rotate-12 rounded-xl bg-white/45 shadow-lg" />
            <div className="absolute right-[26%] top-[76%] h-10 w-10 rotate-12 rounded-xl bg-white/45 shadow-lg" />
            <div className="absolute right-[2%] top-[80%] h-12 w-12 rotate-12 rounded-2xl bg-white/45 shadow-lg" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative px-6 lg:px-12 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#5F5F5F] mb-8">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, idx) => (
              <div
                key={step.title}
                className="rounded-3xl bg-white/80 border border-[#cfe9f0] p-6 shadow-[0_10px_30px_-14px_rgba(11,90,156,0.35)]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`h-12 w-12 rounded-2xl ${GRADIENT} grid place-items-center text-white shadow-[0_8px_16px_-6px_rgba(11,90,156,0.6)]`}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-[#1B8FC0]">
                    Step {idx + 1}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#4a4a4a] mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-[#5F5F5F] leading-relaxed">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section
        className={`relative overflow-hidden ${GRADIENT} text-white px-6 lg:px-12 py-20`}
      >
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-10 left-10 h-14 w-14 rotate-12 rounded-2xl bg-white/25 shadow-lg pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute top-12 left-1/3 h-8 w-8 rotate-12 rounded-xl bg-white/25 shadow-lg pointer-events-none"
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Report a problem in your area today
          </h2>
          <p className="text-white/90 text-sm sm:text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Take a photo, mark the location, and follow the repair until it is
            done.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <WhiteLink to="/report/new" icon={Camera}>
              Report an issue
            </WhiteLink>
            <Link
              to="/register"
              className="inline-flex items-center gap-3 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 p-1 pr-7 text-sm font-semibold text-white transition-colors"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/70 bg-white/20">
                <ArrowRight className="w-4 h-4" />
              </span>
              <span>Create a free account</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
