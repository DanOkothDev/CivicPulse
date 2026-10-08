import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Award,
  CheckCircle2,
  Clock,
  Shield,
  FileText,
  ThumbsUp,
  Settings,
  Bell,
  Save,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import ReportCard from '../../components/ui/ReportCard';
import StatisticCard from '../../components/ui/StatisticCard';

export default function ResidentProfilePage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile editable fields
  const [name, setName] = useState(user?.name || 'Sarah Jenkins');
  const [phone, setPhone] = useState(user?.phone || '+1 (555) 234-8901');
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationPush, setNotificationPush] = useState(true);

  useEffect(() => {
    api.reports.list({ mine: true }).then((res) => {
      setReports(res.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    toast.success('Resident profile settings updated successfully');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={
              user?.avatar ||
              'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256'
            }
            alt={name}
            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-500/20 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900">{name}</h1>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full capitalize">
                {user?.role || 'Resident'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>{user?.email || 'resident@civicpulse.org'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-700 font-medium">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Ward 4 - Metro East</span>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center min-w-[120px]">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
              Trust Score
            </span>
            <span className="text-xl font-extrabold text-blue-600">
              {user?.trustScore || 98.4}%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { id: 'overview', label: 'Personal Info & Stats', icon: User },
          { id: 'reports', label: `My Reports (${reports.length})`, icon: FileText },
          { id: 'settings', label: 'Preferences & Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Overview & Stats */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatisticCard
              title="Verified Submissions"
              value="28"
              subtext="Reports"
              badgeText="100% Precision"
              badgeType="success"
              icon={CheckCircle2}
            />
            <StatisticCard
              title="Civic Impact Level"
              value="Tier V"
              subtext="Sentinel"
              badgeText="Top 1% Community"
              badgeType="primary"
              icon={Award}
            />
            <StatisticCard
              title="Average Resolution"
              value="4.2"
              subtext="Days"
              badgeText="Fast Track"
              badgeType="warning"
              icon={Clock}
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Verified Resident Profile Data
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">Citizen Member ID</span>
                <span className="font-mono font-bold text-slate-800">#CP-8842-D4-2021</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">Assigned Electoral Ward</span>
                <span className="font-bold text-slate-800">Ward 4 - Metro East</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">Account Tier</span>
                <span className="font-bold text-slate-800">Tier V - Master Sentinel Status</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">Active Watchlist Incidents</span>
                <span className="font-bold text-blue-600">14 Followed Workorders</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: My Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

      {/* Tab 3: Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900">
            Account Preferences & Notifications
          </h3>

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Email dispatch status alerts when reports are verified or resolved</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={notificationPush}
                  onChange={(e) => setNotificationPush(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>In-app push notifications for high-priority emergency municipal broadcasts</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
