import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Sparkline } from '../../components/ui/Charts';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const routeForRole = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'authority') return '/authority/assigned';
    if (role === 'verifier') return '/verifier/queue';
    return '/dashboard';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      toast.success(`Welcome back, ${loggedUser?.name || 'User'}!`);
      navigate(routeForRole(loggedUser?.role));
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleEmail, targetRole) => {
    setEmail(roleEmail);
    setPassword('password123');
    setLoading(true);
    try {
      const loggedUser = await login(roleEmail, 'password123');
      toast.success(`Logged in as ${loggedUser?.role || targetRole}`);
      navigate(routeForRole(loggedUser?.role || targetRole));
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left Dark Pane */}
        <div className="lg:col-span-5 bg-slate-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          {/* Top Brand tag */}
          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-3.5 mb-8 group hover:opacity-95 transition-opacity" title="Back to Landing Page">
              <img
                src="/logo.png"
                alt="CivicPulse Logo"
                className="h-14 sm:h-16 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              />
              <div>
                <h3 className="font-black text-lg tracking-wide text-white uppercase">
                  CivicPulse
                </h3>
                <p className="text-xs text-slate-400">Public Infrastructure</p>
              </div>
            </Link>

            <div className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-2">
              Digital Democracy in Action
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white mb-4">
              Empowering Communities, Accelerating Public Infrastructure.
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Unified platform for residents, field verifiers, authorities, and administrators to report and resolve community infrastructure.
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
              <span>Secure Authentication</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Encrypted Connection</span>
            </div>
          </div>
        </div>

        {/* Right White Card - Standard Normal Sign-In Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Sign In
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Welcome back! Please enter your details to sign in.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Password <span className="text-rose-500">*</span>
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
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
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

              <div className="flex items-center text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>Remember me</span>
                </label>
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
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Switcher Row for testing */}
            <div className="mt-5 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 font-medium text-[11px]">Demo quick access:</span>
              <div className="flex flex-wrap gap-1.5">
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
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 font-semibold text-[11px] transition-colors shadow-2xs"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Register Link Box */}
            <div className="mt-5 p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 text-center text-xs">
              <span className="text-slate-600">Don't have an account? </span>
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
            <span>© {new Date().getFullYear()} CivicPulse. All rights reserved.</span>
            <div className="flex gap-3">
              <a href="#" className="hover:text-slate-600">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-slate-600">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
