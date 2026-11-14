import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, UserPlus, Users, ShieldOff } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AdminAnalyticsDashboard from './AdminAnalyticsDashboard';

const INPUT = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';

export default function NationalAdminDashboard() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'staff' ? 'staff' : 'analytics';
  const [counties, setCounties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', role: 'admin', county_id: '', department_id: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [countyRows, users] = await Promise.all([api.reference.getCounties(), api.admin.listUsers()]);
      setCounties(countyRows || []);
      setStaff((users || []).filter((item) => ['admin', 'verifier', 'authority'].includes(item.role)));
      setError('');
    } catch (cause) {
      setError(cause.message || 'Could not load staff accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (activeTab !== 'staff' || !staff.some((item) => item.temporary_password_email_status === 'pending')) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const users = await api.admin.listUsers();
        setStaff((users || []).filter((item) => ['admin', 'verifier', 'authority'].includes(item.role)));
      } catch {
        // Keep the queued status visible; the normal page load will surface connection errors.
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeTab, staff]);

  useEffect(() => {
    if (form.role !== 'authority' || !form.county_id) {
      setDepartments([]);
      return;
    }
    let active = true;
    api.reference.getDepartments(Number(form.county_id))
      .then((rows) => { if (active) setDepartments(rows || []); })
      .catch((cause) => { if (active) setError(cause.message || 'Could not load departments.'); });
    return () => { active = false; };
  }, [form.role, form.county_id]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value, ...(key === 'county_id' ? { department_id: '' } : {}) }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const created = await api.admin.createStaffUser({
        name: form.name.trim(), email: form.email.trim(),
        role: form.role, county_id: Number(form.county_id),
        ...(form.role === 'authority' ? { department_id: Number(form.department_id) } : {}),
      });
      if (created.temporary_password_email_status === 'pending') {
        toast.success(`${form.role} account created. The temporary password email is queued.`);
      } else {
        toast.error(`${form.role} account created, but the email could not be queued. Retry it from the staff list.`);
      }
      setForm({ name: '', email: '', role: 'admin', county_id: '', department_id: '' });
      await load();
    } catch (cause) {
      setError(cause.message || 'Could not create the staff account.');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (account) => {
    if (!window.confirm(`Revoke ${account.name}'s ${account.role} access? They will no longer be able to sign in.`)) return;
    setError('');
    setRevokingId(account.id);
    try {
      await api.admin.revokeStaffUser(account.id);
      toast.success(`Access revoked for ${account.name}.`);
      await load();
    } catch (cause) {
      setError(cause.message || 'Could not revoke this account.');
    } finally {
      setRevokingId(null);
    }
  };

  const retryEmail = async (account) => {
    setError('');
    setRetryingId(account.id);
    try {
      const updated = await api.admin.retryStaffEmail(account.id);
      if (updated.temporary_password_email_status === 'pending') {
        toast.success(`A new temporary password email is queued for ${account.name}.`);
      } else {
        toast.error(`The email could not be queued for ${account.name}. Check the background worker and retry.`);
      }
      await load();
    } catch (cause) {
      setError(cause.message || 'Could not retry the onboarding email.');
    } finally {
      setRetryingId(null);
    }
  };

  return <div className="mx-auto max-w-7xl space-y-7 p-4 sm:p-8">
    <header className="rounded-3xl bg-gradient-to-br from-[#0B5A9C] to-[#1B8FC0] p-6 text-white shadow-lg sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-100">National administration</p>
      <h1 id="national-admin-title" className="mt-2 text-3xl font-bold">National administration</h1>
      <p className="mt-2 max-w-2xl text-sm text-blue-50">Monitor advanced county analytics and manage county staff accounts.</p>
    </header>

    <nav className="flex gap-2 border-b border-slate-200" aria-label="National admin sections">
      {[['analytics', 'Advanced analytics'], ['staff', 'Staff accounts']].map(([tab, label]) => <button key={tab} type="button" onClick={() => setSearchParams(tab === 'analytics' ? {} : { tab })} aria-current={activeTab === tab ? 'page' : undefined} className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === tab ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
    </nav>

    {activeTab === 'analytics' ? <AdminAnalyticsDashboard /> : <>
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2 text-blue-700"><UserPlus size={20} /></span><div><h2 className="font-bold text-slate-900">Create staff account</h2><p className="text-xs text-slate-500">A temporary password will be emailed to the new account holder.</p></div></div>
        <label className="block text-sm font-semibold text-slate-700">Full name<input required maxLength={120} autoComplete="name" className={INPUT} value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
        <label className="block text-sm font-semibold text-slate-700">Email address<input required type="email" maxLength={255} autoComplete="email" className={INPUT} value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">Role<select className={INPUT} value={form.role} onChange={(event) => update('role', event.target.value)}><option value="admin">County admin</option><option value="verifier">Verifier</option><option value="authority">Authority</option></select></label>
          <label className="block text-sm font-semibold text-slate-700">County<select required className={INPUT} value={form.county_id} onChange={(event) => update('county_id', event.target.value)}><option value="">Select county</option>{counties.map((county) => <option key={county.id} value={county.id}>{county.name}</option>)}</select></label>
        </div>
        {form.role === 'authority' && <label className="block text-sm font-semibold text-slate-700">Department<select required disabled={!form.county_id} className={INPUT} value={form.department_id} onChange={(event) => update('department_id', event.target.value)}><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>}
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <button type="submit" disabled={saving || !counties.length} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{saving ? 'Creating account…' : 'Create account'}</button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="county-staff-heading">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5"><span className="rounded-xl bg-cyan-50 p-2 text-cyan-800"><Users size={20} /></span><div><h2 id="county-staff-heading" className="font-bold text-slate-900">County staff</h2><p className="text-xs text-slate-500">{staff.length} account{staff.length === 1 ? '' : 's'}</p></div></div>
        {loading ? <p className="p-6 text-sm text-slate-500">Loading staff accounts…</p> : staff.length === 0 ? <p className="p-6 text-sm text-slate-500">No county staff accounts yet.</p> : <ul className="divide-y divide-slate-100">{staff.map((account) => <li key={account.id} className="flex items-start gap-3 p-4 sm:p-5"><span className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600"><Building2 size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{account.name}</p><p className="truncate text-xs text-slate-500">{account.email}</p><p className="mt-1 text-xs text-slate-600">{account.county?.name || 'No county'} · <span className="capitalize">{account.role === 'admin' ? 'County admin' : account.role}</span>{account.department?.name ? ` · ${account.department.name}` : ''}</p>{account.is_active === false && <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Access revoked</span>}{account.is_active !== false && account.temporary_password_email_status && <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${account.temporary_password_email_status === 'sent' ? 'bg-emerald-50 text-emerald-700' : account.temporary_password_email_status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{account.temporary_password_email_status === 'sent' ? 'Temporary password emailed' : account.temporary_password_email_status === 'failed' ? 'Email delivery failed' : 'Email queued'}</span>}</div>{account.is_active !== false && <div className="flex shrink-0 flex-col items-end gap-2">{account.temporary_password_email_status === 'failed' && <button type="button" onClick={() => retryEmail(account)} disabled={retryingId === account.id} className="rounded-lg border border-amber-300 px-2.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">{retryingId === account.id ? 'Queuing…' : 'Retry email'}</button>}<button type="button" onClick={() => revoke(account)} disabled={revokingId === account.id} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50" aria-label={`Revoke ${account.name} access`}><ShieldOff size={14} />{revokingId === account.id ? 'Revoking…' : 'Revoke'}</button></div>}</li>)}</ul>}
      </section>
    </section>
    </>}
  </div>;
}
