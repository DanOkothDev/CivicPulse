import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    area_id: 1,
  });
  const [areas, setAreas] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(true);

  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.reference.getAreas().then(setAreas).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        area_id: Number(formData.area_id),
      });
      toast.success('Resident account created successfully! Welcome to CivicPulse.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left Side Branding */}
        <div className="lg:col-span-5 bg-slate-900 text-white p-8 flex flex-col justify-between relative">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide text-slate-100 uppercase">
                  CivicPulse
                </h3>
                <p className="text-[11px] text-slate-400">Citizen Verification Portal</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-6">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Verified Resident Registration</span>
            </div>

            <h2 className="text-2xl font-extrabold text-white leading-snug mb-3">
              Become a Guardian of Your Community.
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Joining CivicPulse gives you direct telemetric visibility into municipal work orders. Submit issues, track repairs with GPS precision, and build your civic trust score.
            </p>

            <div className="space-y-3 pt-2">
              {[
                'Real-time municipal dispatch logs',
                'Camera & GPS geolocation verification',
                'Status audit trail from intake to resolution',
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-[11px] text-slate-400 pt-6 border-t border-slate-800">
            Official Municipal Citizen Services • Free & Open
          </div>
        </div>

        {/* Right Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">
                Create Resident Account
              </h2>
              <p className="text-xs text-slate-500">
                All citizen accounts default to resident verified role.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="resident@civicpulse.org"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Residential Ward */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Residential Ward / Zone
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <select
                    name="area_id"
                    value={formData.area_id}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Min 8 characters"
                      className="w-full pl-10 pr-9 py-2 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Repeat passphrase"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>
                    I agree to the Community Reporting Terms and certify that submitted infrastructure reports will represent bona fide civic hazards.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !agreed}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md shadow-blue-600/30 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Resident Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
              Sign In to CivicPulse
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
