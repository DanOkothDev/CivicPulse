import { useState } from 'react';
import { Settings, Shield, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function NationalAdminProfile() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const updatePreference = async (key, value) => {
    setSaving(true);
    try {
      await api.users.updatePreferences({ [key]: value });
      await refreshUser();
      toast.success('Settings updated.');
    } catch (error) {
      toast.error(`Could not update settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const replayTour = async () => {
    setSaving(true);
    try {
      await api.users.updatePreferences({ product_tour_enabled: true, onboarding_completed: false });
      await refreshUser();
      window.dispatchEvent(new CustomEvent('civicpulse:open-onboarding'));
    } catch (error) {
      toast.error(`Could not restart the user journey: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
    <header className="rounded-3xl bg-gradient-to-br from-[#0B5A9C] to-[#1B8FC0] p-6 text-white shadow-lg sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-100">Account settings</p>
      <h1 className="mt-2 text-3xl font-bold">National admin profile</h1>
      <p className="mt-2 text-sm text-blue-50">Manage your profile preferences and review your administrator access.</p>
    </header>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2 text-blue-700"><User size={20} /></span><div><h2 className="font-bold text-slate-900">Profile</h2><p className="text-xs text-slate-500">National platform administrator</p></div></div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{user?.name}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{user?.email}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</dt><dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold capitalize text-slate-900"><Shield size={15} className="text-blue-700" />{user?.role}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access scope</dt><dd className="mt-1 text-sm font-semibold text-slate-900">National analytics and county staff administration</dd></div>
      </dl>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-cyan-50 p-2 text-cyan-800"><Settings size={20} /></span><div><h2 className="font-bold text-slate-900">App guide and preferences</h2><p className="text-xs text-slate-500">Control onboarding guidance for this account.</p></div></div>
      <div className="mt-5 divide-y divide-slate-100">
        {[["product_tour_enabled", 'Product tour', 'Show the role-specific tour when onboarding is available.'], ["feature_tips_enabled", 'Feature tips', 'Show contextual tips while using the dashboard.']].map(([key, label, description]) => <label key={key} className="flex items-center justify-between gap-4 py-4"><span><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></span><input type="checkbox" checked={user?.[key] !== false} disabled={saving} onChange={(event) => updatePreference(key, event.target.checked)} className="h-4 w-4 accent-blue-700" aria-label={label} /></label>)}
      </div>
      <button type="button" onClick={replayTour} disabled={saving} className="mt-3 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50">Replay admin tour</button>
    </section>
  </main>;
}
