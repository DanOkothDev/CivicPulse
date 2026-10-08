import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Shield,
  Activity,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Sparkline } from '../../components/ui/Charts';

export default function LoginPage() {
  const [email, setEmail] = useState('resident@civicpulse.org');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const { login, switchRole } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Successfully authenticated');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail, targetRole) => {
    setEmail(roleEmail);
    setPassword('password123');
    switchRole(targetRole);
    login(roleEmail, 'password123').then(() => {
      toast.success(`Logged in as ${targetRole}`);
      navigate('/dashboard');
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* Left Dark Pane matching image.png */}
        <div className="lg:col-span-5 bg-slate-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          {/* Top Brand tag */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide text-slate-100 uppercase">
                  CivicPulse Engine
                </h3>
                <p className="text-[11px] text-slate-400">Public Infrastructure v2.4</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
              <span>Gateway Operational • 99.98% SLA</span>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-2">
              Digital Democracy in Action
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white mb-4">
              Empowering Communities, Accelerating Public Infrastructure.
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Unified access layer for Metro Ward residents, field technicians, and oversight commissioners. Transparent municipal accountability at street level.
            </p>
          </div>

          {/* Metric widget */}
          <div className="relative z-10 bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 my-6">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400 font-medium">Resolution Velocity (Last 24h)</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                +18.4% faster
              </span>
            </div>
            <div className="h-10 flex items-center mb-2">
              <Sparkline data={[12, 18, 15, 24, 28, 38, 46]} color="#10b981" height={36} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-700/60 pt-2">
              <span>Triage avg: <strong className="text-white">42m</strong></span>
              <span>Workorders resolved: <strong className="text-white">1,429</strong></span>
            </div>
          </div>

          {/* Footer security badges */}
          <div className="relative z-10 flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>FedRAMP Aligned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>FIPS 140-2</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>SOC2 Type II</span>
            </div>
          </div>
        </div>

        {/* Right White Card matching image.png */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Header: Title and Ward tag */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900 text-sm">CivicPulse</span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase">
                      Secure Access
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Municipal Operations & Citizen Portal</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>Metro City East</span>
              </div>
            </div>

            {/* Quick SSO / Gov Passkey sign in buttons */}
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Government & Passkey Sign In
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('resident@civicpulse.org', 'resident')}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  <span>City ID / Login.gov</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('verifier@civicpulse.org', 'verifier')}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Passkey or Hardware</span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Or Sign In With Credentials
              </span>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Municipal or Resident Email <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">SSO Auto-detect</span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="resident@civicpulse.org or name@metro.gov"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>ℹ️ Personnel with <strong>@metro.gov</strong> will be redirected to Active Directory.</span>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Secret Key / Password <span className="text-rose-500">*</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info('Password reset instructions dispatched to your recovery channel.');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your security passphrase"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-white focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>Keep terminal active for 30 days</span>
                </label>
                <span className="text-[11px] font-mono text-emerald-600 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  TLS 1.3
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md shadow-blue-600/30 hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to CivicPulse</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Switcher Row */}
            <div className="mt-4 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-semibold">Quick Role Logins:</span>
              <div className="flex gap-1.5">
                {[
                  { r: 'resident', label: 'Resident', email: 'resident@civicpulse.org' },
                  { r: 'verifier', label: 'Verifier', email: 'verifier@civicpulse.org' },
                  { r: 'authority', label: 'Authority', email: 'authority@civicpulse.org' },
                  { r: 'admin', label: 'Admin', email: 'admin@civicpulse.org' },
                ].map((item) => (
                  <button
                    key={item.r}
                    type="button"
                    onClick={() => handleQuickLogin(item.email, item.r)}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 font-bold text-[10px] capitalize transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Register Link Box */}
            <div className="mt-5 p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 text-center text-xs">
              <span className="text-slate-600">Don't have an authenticated account? </span>
              <Link
                to="/register"
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
              >
                <span>Register as Resident</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Footer credentials */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-3">
              <span>🔒 256-bit Municipal Encryption</span>
              <span>•</span>
              <span>SOC2 Type II Certified</span>
              <span>•</span>
              <span>Official City Gateway</span>
            </div>
            <div className="flex gap-3">
              <a href="#" className="hover:text-slate-600">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-slate-600">Accessibility (ADA)</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
