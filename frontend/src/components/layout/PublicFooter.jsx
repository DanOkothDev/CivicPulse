import React, { useEffect } from "react";
import { Link } from "react-router-dom";

/*
  Theme (same as the landing, login, register and dashboard pages)
  mint background   #E6F5F8
  light cyan        #7FD0E0
  bright cyan       #38C6DC
  mid blue          #1B8FC0
  deep blue         #0B5A9C
  soft grey text    #5F5F5F
*/

const GRADIENT = "bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C]";
const LINK =
  "text-[#5F5F5F] hover:text-[#0B5A9C] hover:underline transition-colors";

export default function PublicFooter() {
  // Load Montserrat font dynamically
  useEffect(() => {
    if (document.getElementById("montserrat-font")) return;
    const link = document.createElement("link");
    link.id = "montserrat-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <footer
      className="relative overflow-hidden bg-[#E6F5F8] text-[#5F5F5F] border-t border-[#cfe9f0] py-14 px-6 lg:px-12 text-xs"
      style={{
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Soft shapes, echoing the landing page */}
      <div
        aria-hidden="true"
        className="absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-[#38C6DC]/30 to-[#0B5A9C]/20 blur-2xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className={`absolute top-10 right-16 h-8 w-8 rotate-12 rounded-xl ${GRADIENT} opacity-70 shadow-lg pointer-events-none`}
      />
      <div
        aria-hidden="true"
        className="absolute bottom-16 right-40 h-5 w-5 rotate-12 rounded-lg bg-white/70 shadow pointer-events-none"
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-[#cfe9f0]">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-3"
              title="Back to the home page"
            >

              <span className="font-extrabold text-xl tracking-tight text-[#0B5A9C]">
                CivicPulse
              </span>
            </Link>
            <p className="max-w-sm text-xs leading-relaxed">
              Report problems with roads, water, lighting and other public
              services, and follow each one until it is fixed.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-extrabold text-[#0B5A9C] text-sm mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <Link to="/" className={LINK}>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className={LINK}>
                  About
                </Link>
              </li>
              <li>
                <Link to="/map" className={LINK}>
                  Map
                </Link>
              </li>
              <li>
                <Link to="/faq" className={LINK}>
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-extrabold text-[#0B5A9C] text-sm mb-4">
              Your account
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <Link to="/register" className={LINK}>
                  Create an account
                </Link>
              </li>
              <li>
                <Link to="/login" className={LINK}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className={LINK}>
                  My dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#7a8a90] font-medium">
          <p>© {new Date().getFullYear()} CivicPulse. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span>Open source</span>
            <span>Clear updates from report to repair</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
