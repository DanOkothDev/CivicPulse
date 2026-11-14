import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const INPUT = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';

export default function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 10) {
      setError('Use at least 10 characters for your new password.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.auth.changePassword(password);
      const updatedUser = await refreshUser();
      toast.success('Your password has been updated.');
      if (updatedUser?.role === 'admin') navigate('/admin', { replace: true });
      else if (updatedUser?.role === 'verifier') navigate('/verifier/queue', { replace: true });
      else if (updatedUser?.role === 'authority') navigate('/authority/assigned', { replace: true });
      else navigate('/dashboard', { replace: true });
    } catch (cause) {
      setError(cause.message || 'Could not update your password.');
    } finally {
      setSaving(false);
    }
  };

  return <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl place-items-center p-4 sm:p-8">
    <section className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-[.9fr_1.1fr]">
      <div className="bg-gradient-to-br from-[#0B5A9C] to-[#1B8FC0] p-7 text-white sm:p-9">
        <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><ShieldCheck size={24} /></span>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[.16em] text-blue-100">First sign in</p>
        <h1 className="mt-2 text-3xl font-bold">Create your password</h1>
        <p className="mt-3 text-sm leading-relaxed text-blue-50">The temporary password was for first access only. Choose a new password to secure your CivicPulse account.</p>
        <p className="mt-8 rounded-xl bg-white/10 p-3 text-xs">Account: <strong>{user?.email}</strong></p>
      </div>
      <form onSubmit={submit} className="space-y-5 p-7 sm:p-9">
        <div className="flex items-center gap-2 text-slate-800"><KeyRound size={18} className="text-blue-700" /><h2 className="font-bold">Set a new password</h2></div>
        <label className="block text-sm font-semibold text-slate-700">New password<input required type="password" minLength={10} autoComplete="new-password" className={INPUT} value={password} onChange={(event) => setPassword(event.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">At least 10 characters.</span></label>
        <label className="block text-sm font-semibold text-slate-700">Confirm new password<input required type="password" minLength={10} autoComplete="new-password" className={INPUT} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <button type="submit" disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{saving ? 'Updating password…' : 'Save new password'}</button>
      </form>
    </section>
  </main>;
}
