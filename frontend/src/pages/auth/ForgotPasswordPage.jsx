import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

const INPUT = 'mt-2 w-full rounded-xl border border-[#cfe9f0] bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#1B8FC0] focus:outline-none focus:ring-2 focus:ring-[#38C6DC]/30';
const CONFIRMATION = 'If an account exists for that email address, password reset instructions will be sent.';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('We could not process that request right now. Please wait a moment and try again.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="min-h-screen bg-[#E6F5F8] px-4 py-10 sm:grid sm:place-items-center">
    <section className="mx-auto w-full max-w-lg rounded-3xl border border-[#cfe9f0] bg-white p-7 shadow-xl sm:p-10">
      <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B8FC0] hover:underline"><ArrowLeft size={16} /> Back to sign in</Link>
      <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#E6F5F8] text-[#0B5A9C]"><ShieldCheck size={25} /></div>
      {sent ? <div aria-live="polite">
        <h1 className="mt-5 text-2xl font-extrabold text-[#0B5A9C]">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{CONFIRMATION}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">If you requested a reset, use the link in the message within 15 minutes.</p>
        <Link to="/login" className="mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0B5A9C] px-4 font-semibold text-white hover:bg-[#084b82]">Return to sign in</Link>
      </div> : <>
        <h1 className="mt-5 text-2xl font-extrabold text-[#0B5A9C]">Forgot your password?</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Enter the email address associated with your CivicPulse account. We’ll send instructions if an account matches.</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label htmlFor="forgot-email" className="block text-sm font-semibold text-slate-700">Email address
            <span className="relative block"><Mail aria-hidden="true" size={17} className="absolute left-3 top-5 text-[#1B8FC0]" /><input id="forgot-email" type="email" name="email" autoComplete="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} className={`${INPUT} pl-10`} placeholder="you@example.com" /></span>
          </label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <button type="submit" disabled={loading} className="min-h-12 w-full rounded-xl bg-[#0B5A9C] px-4 font-semibold text-white hover:bg-[#084b82] disabled:cursor-wait disabled:opacity-60">{loading ? 'Sending…' : 'Send reset instructions'}</button>
        </form>
      </>}
      <p className="mt-7 text-center text-xs text-slate-500">CivicPulse · Public infrastructure</p>
    </section>
  </main>;
}
