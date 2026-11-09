import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  ArrowRight,
  Home,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../services/api";

/*
  Theme (same as the login page, admin dashboard and landing page design)
  mint background  #E6F5F8
  light cyan       #7FD0E0
  bright cyan      #38C6DC
  mid blue         #1B8FC0
  deep blue        #0B5A9C
  soft grey text   #5F5F5F
*/

const GRADIENT = "bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C]";
const INPUT =
  "w-full pl-10 pr-4 py-2 bg-white text-xs sm:text-sm text-[#4a4a4a] rounded-xl border border-[#cfe9f0] focus:border-[#1B8FC0] focus:ring-2 focus:ring-[#38C6DC]/30 focus:outline-none transition-all";
const LABEL = "block text-xs font-bold text-[#5F5F5F] mb-1";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    area_id: "",
    county_id: "",
  });
  const [areas, setAreas] = useState([]);
  const [counties, setCounties] = useState([]);
  const [countiesLoading, setCountiesLoading] = useState(true);
  const [countiesError, setCountiesError] = useState("");
  const [countyRetry, setCountyRetry] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(true);

  const { register } = useAuth();
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

  useEffect(() => {
    api.reference
      .getAreas()
      .then(setAreas)
      .catch((error) => toast.error(`Could not load wards: ${error.message}`));
  }, []);

  useEffect(() => {
    let active = true;
    setCountiesLoading(true);
    setCountiesError("");
    api.reference
      .getCounties()
      .then((records) => {
        if (active) setCounties(records);
      })
      .catch((error) => {
        if (active) setCountiesError(error.message);
      })
      .finally(() => {
        if (active) setCountiesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [countyRetry]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password || !formData.county_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        area_id: formData.area_id ? Number(formData.area_id) : undefined,
        county_id: Number(formData.county_id),
      });
      toast.success("Your account is ready. Welcome to CivicPulse!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Could not create your account");
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled = loading || !agreed;

  return (
    <div
      className="min-h-screen bg-[#E6F5F8] flex items-center justify-center p-4 sm:p-6 lg:p-8"
      style={{
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-[0_30px_60px_-25px_rgba(11,90,156,0.45)] border border-[#cfe9f0] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Left pane */}
        <div
          className={`lg:col-span-5 ${GRADIENT} text-white p-8 flex flex-col justify-between relative overflow-hidden`}
        >
          {/* Soft shapes, echoing the landing page */}
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-28 -left-10 h-40 w-40 rounded-full bg-white/10 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-24 right-8 h-12 w-12 rotate-12 rounded-2xl bg-white/25 shadow-lg pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-44 right-20 h-7 w-7 rotate-12 rounded-xl bg-white/25 shadow-lg pointer-events-none"
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
                <p className="text-[11px] text-[#5F5F5F]">Resident accounts</p>
              </div>
            </Link>

            <h2 className="text-2xl font-extrabold text-white leading-snug mb-3">
              Help improve your neighborhood.
            </h2>
            <p className="text-xs text-white/90 leading-relaxed mb-6">
              With a CivicPulse account you can report problems, see when
              repairs are planned, and follow each one until it is fixed.
            </p>

            <div className="space-y-3">
              {[
                "Get updates on the problems you report",
                "Add a photo and location to each report",
                "See every step from report to repair",
              ].map((text) => (
                <div
                  key={text}
                  className="flex items-center gap-2.5 text-xs text-white"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-[11px] text-white/90 pt-6 mt-6 border-t border-white/25">
            Free for all residents
          </div>
        </div>

        {/* Right pane: form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h2 className="text-3xl font-extrabold text-[#5F5F5F] tracking-tight mb-2">
                Create an account
              </h2>
              <p className="text-xs text-[#5F5F5F]">
                Sign up as a resident to start sending reports.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="reg-name" className={LABEL}>
                  Full name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="reg-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Amina Otieno"
                    className={INPUT}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" className={LABEL}>
                  Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="reg-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="e.g. wanjiku@gmail.com"
                    className={INPUT}
                  />
                </div>
              </div>

              {/* County */}
              <div>
                <label htmlFor="reg-county" className={LABEL}>
                  Your county <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-3 pointer-events-none" />
                  <select
                    id="reg-county"
                    name="county_id"
                    value={formData.county_id}
                    onChange={handleChange}
                    required
                    disabled={countiesLoading || Boolean(countiesError) || counties.length === 0}
                    aria-describedby="reg-county-status"
                    className={`${INPUT} appearance-none cursor-pointer pr-10 disabled:cursor-not-allowed disabled:bg-slate-50`}
                  >
                    <option value="">
                      {countiesLoading
                        ? "Loading counties..."
                        : countiesError
                          ? "Counties unavailable"
                          : counties.length === 0
                            ? "No counties available"
                            : "Select your county"}
                    </option>
                    {counties.map((county) => (
                      <option key={county.id} value={county.id}>
                        {county.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#7a8a90] absolute right-3.5 top-3 pointer-events-none" />
                </div>
                <p id="reg-county-status" role={countiesError ? "alert" : undefined} className="mt-1 text-[11px] text-[#7a8a90]">
                  {countiesLoading
                    ? "Loading the county list..."
                    : countiesError
                      ? `Could not load counties: ${countiesError}`
                      : counties.length === 0
                        ? "County selection is temporarily unavailable. Please try again later."
                        : "Choose the county where you are registered to live."}
                </p>
                {countiesError && (
                  <button
                    type="button"
                    onClick={() => setCountyRetry((attempt) => attempt + 1)}
                    className="mt-1 text-[11px] font-bold text-[#0B5A9C] underline"
                  >
                    Try loading counties again
                  </button>
                )}
              </div>

              {/* Ward */}
              <div>
                <label htmlFor="reg-area" className={LABEL}>
                  Your ward
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-3 pointer-events-none" />
                  <select
                    id="reg-area"
                    name="area_id"
                    value={formData.area_id}
                    onChange={handleChange}
                    className={`${INPUT} appearance-none cursor-pointer pr-10`}
                  >
                    <option value="">Not sure / skip</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#7a8a90] absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-password" className={LABEL}>
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="At least 8 characters"
                      className={`${INPUT} pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide passwords" : "Show passwords"
                      }
                      className="absolute right-2.5 top-2.5 text-[#7a8a90] hover:text-[#0B5A9C] transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-confirm" className={LABEL}>
                    Confirm password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      id="reg-confirm"
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Enter it again"
                      className={INPUT}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-[#5F5F5F]">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-[#1B8FC0]"
                  />
                  <span>
                    I agree to the community reporting terms and will only
                    report real problems.
                  </span>
                </label>
              </div>

              {/* Pill button with circled arrow, like Subscribe */}
              <button
                type="submit"
                disabled={submitDisabled}
                className="w-full flex items-center rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] p-1 pr-12 text-base font-semibold text-[#5F5F5F] transition-colors disabled:opacity-60 disabled:hover:bg-[#7FD0E0]/70"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[#38C6DC] bg-[#E6F5F8] text-[#1B8FC0]">
                  {loading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-[#38C6DC]/40 border-t-[#1B8FC0] animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </span>
                <span className="flex-1 text-center">
                  {loading ? "Creating account..." : "Create account"}
                </span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-[#cfe9f0] flex flex-col items-center gap-3 text-xs text-[#5F5F5F]">
            <p>
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-bold text-[#0B5A9C] hover:underline"
              >
                Sign in
              </Link>
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-semibold text-[#1B8FC0] hover:text-[#0B5A9C] hover:underline"
            >
              <Home className="h-3.5 w-3.5" />
              Return to landing page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
