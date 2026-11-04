import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

/*
  Theme (same as the admin dashboard and the landing page design)
  mint background  #E6F5F8
  light cyan       #7FD0E0
  bright cyan      #38C6DC
  mid blue         #1B8FC0
  deep blue        #0B5A9C
  soft grey text   #5F5F5F
*/

const GRADIENT = "bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C]";
const INPUT =
  "w-full pl-10 pr-4 py-2.5 bg-white text-xs sm:text-sm text-[#4a4a4a] rounded-xl border border-[#cfe9f0] focus:border-[#1B8FC0] focus:ring-2 focus:ring-[#38C6DC]/30 focus:outline-none transition-all";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

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

  const routeForRole = (role) => {
    if (role === "admin") return "/admin";
    if (role === "authority") return "/authority/assigned";
    if (role === "verifier") return "/verifier/queue";
    return "/dashboard";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      toast.success(`Welcome back, ${loggedUser?.name || "User"}!`);
      navigate(routeForRole(loggedUser?.role));
    } catch (err) {
      toast.error(
        err.message ||
          "Could not sign in. Please check your email and password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#E6F5F8] flex items-center justify-center p-4 sm:p-6 lg:p-8"
      style={{
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_30px_60px_-25px_rgba(11,90,156,0.45)] border border-[#cfe9f0] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Left pane */}
        <div
          className={`lg:col-span-5 ${GRADIENT} text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden`}
        >
          {/* Soft shapes, echoing the landing page */}
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-24 -left-10 h-40 w-40 rounded-full bg-white/10 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-20 right-10 h-12 w-12 rotate-12 rounded-2xl bg-white/25 shadow-lg pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-40 right-24 h-7 w-7 rotate-12 rounded-xl bg-white/25 shadow-lg pointer-events-none"
          />

          <div className="relative z-10">
            <Link
              to="/"
              className="inline-flex items-center gap-3 mb-8 bg-white rounded-2xl px-3 py-2 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.4)] hover:brightness-105 transition"
              title="Back to the home page"
            >

              <div>
                <h3 className="font-extrabold text-base text-[#0B5A9C] leading-tight">
                  CivicPulse
                </h3>
                <p className="text-[11px] text-[#5F5F5F]">
                  Public infrastructure
                </p>
              </div>
            </Link>

            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white mb-4">
              Report problems. Get them fixed.
            </h1>
            <p className="text-xs text-white/90 leading-relaxed max-w-sm">
              One place for residents, verifiers, authorities and administrators
              to report and fix problems with roads, water, lighting and other
              public services.
            </p>
          </div>

          <div className="relative z-10 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/30 my-6">
            <p className="text-sm font-semibold text-white">
              Sign in with your CivicPulse account
            </p>
            <p className="text-xs text-white/90 mt-2 leading-relaxed">
              New here? Residents can create an account.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-4 pt-4 border-t border-white/25 text-[11px] text-white/90 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Secure sign-in</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Encrypted connection</span>
            </div>
          </div>
        </div>

        {/* Right pane: sign-in form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-[#5F5F5F] tracking-tight">
                Sign in
              </h2>
              <p className="text-sm text-[#5F5F5F] mt-2">
                Welcome back. Enter your details to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-bold text-[#5F5F5F] mb-1.5"
                >
                  Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className={INPUT}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-bold text-[#5F5F5F]"
                  >
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info(
                        "Password reset is not available yet. Please contact an admin.",
                      );
                    }}
                    className="text-xs font-semibold text-[#1B8FC0] hover:text-[#0B5A9C] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className={`${INPUT} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-3 text-[#7a8a90] hover:text-[#0B5A9C] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[#5F5F5F] font-medium select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#1B8FC0]"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              {/* Pill button with circled arrow, like Subscribe */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] p-1 pr-12 text-base font-semibold text-[#5F5F5F] transition-colors disabled:opacity-60"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[#38C6DC] bg-[#E6F5F8] text-[#1B8FC0]">
                  {loading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-[#38C6DC]/40 border-t-[#1B8FC0] animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </span>
                <span className="flex-1 text-center">
                  {loading ? "Signing in..." : "Sign in"}
                </span>
              </button>
            </form>

            <div className="mt-5 p-3.5 bg-[#E6F5F8] rounded-2xl border border-[#cfe9f0] text-center text-xs">
              <span className="text-[#5F5F5F]">
                Don&apos;t have an account?{" "}
              </span>
              <Link
                to="/register"
                className="font-bold text-[#0B5A9C] hover:underline inline-flex items-center gap-1"
              >
                <span>Register as a resident</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-[#cfe9f0] flex flex-wrap items-center justify-between text-[11px] text-[#7a8a90] gap-2">
            <span>
              © {new Date().getFullYear()} CivicPulse. All rights reserved.
            </span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-[#0B5A9C]">
                Privacy policy
              </a>
              <a href="#" className="hover:text-[#0B5A9C]">
                Terms of service
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
