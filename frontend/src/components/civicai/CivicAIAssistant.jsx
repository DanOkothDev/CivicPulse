import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, X, Send, Sparkles, LoaderCircle, MapPinned, ClipboardList, HelpCircle, LocateFixed, ChevronRight, ChevronLeft, CheckCircle2, Mic, MicOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ImageUploadComponent from '../ui/ImageUploadComponent';
import MapComponent from '../ui/MapComponent';
import FormattedAssistantMessage from './FormattedAssistantMessage';

const starter = { role: 'assistant', content: 'Hi! I’m CivicAI. I can answer questions about CivicPulse, find reports you can access, and walk you through reporting an issue.' };
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export default function CivicAIAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([starter]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reportStep, setReportStep] = useState(null);
  const [categories, setCategories] = useState([]);
  const [reportDraft, setReportDraft] = useState({ categoryId: '', description: '', photo: null, location: null, address: '', landmark: '' });
  const [reportError, setReportError] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [reportRequestId, setReportRequestId] = useState(null);
  const [pendingOperation, setPendingOperation] = useState(null);
  const [pendingUserRoleChange, setPendingUserRoleChange] = useState(null);
  const [operationBusy, setOperationBusy] = useState(false);
  const [operationError, setOperationError] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const SpeechRecognitionApi = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);
  useEffect(() => {
    if (!user?.id) return;
    setHistoryLoaded(false);
    try {
      const key = `civicai:${user.id}`;
      const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (Array.isArray(saved)) setMessages(saved); // Upgrade an existing tab session.
      else if (saved?.savedAt && Date.now() - saved.savedAt < SESSION_TTL_MS && Array.isArray(saved.messages)) {
        setMessages(saved.messages);
      } else if (saved) sessionStorage.removeItem(key);
    } catch { /* Ignore an invalid or unavailable session cache. */ }
    setHistoryLoaded(true);
  }, [user?.id]);
  useEffect(() => {
    if (!user?.id || !historyLoaded) return;
    try { sessionStorage.setItem(`civicai:${user.id}`, JSON.stringify({ savedAt: Date.now(), messages: messages.slice(-20) })); }
    catch { /* Conversation still works if browser storage is disabled. */ }
  }, [historyLoaded, messages, user?.id]);
  useEffect(() => {
    if (!user?.id) return;
    const key = `civicai-report:${user.id}`;
    try {
      if (reportResult) {
        sessionStorage.removeItem(key);
      } else if (reportRequestId && reportStep) {
        // Keep the text task resumable for this browser session. File and precise location
        // are intentionally omitted and must be supplied again after a refresh.
        sessionStorage.setItem(key, JSON.stringify({
          savedAt: Date.now(),
          requestId: reportRequestId,
          categoryId: reportDraft.categoryId,
          description: reportDraft.description,
          address: reportDraft.address,
          landmark: reportDraft.landmark,
        }));
      }
    } catch { /* The task remains available in component state. */ }
  }, [reportDraft, reportRequestId, reportResult, reportStep, user?.id]);

  useEffect(() => {
    if (!user?.id || user.role !== 'resident') return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(`civicai-report:${user.id}`) || 'null');
      if (saved?.requestId && Date.now() - saved.savedAt < SESSION_TTL_MS) {
        setReportRequestId(saved.requestId);
        setReportDraft((draft) => ({ ...draft, ...saved, photo: null, location: null }));
      } else if (saved) sessionStorage.removeItem(`civicai-report:${user.id}`);
    } catch { /* Ignore stale/incomplete browser task state. */ }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!reportStep || categories.length) return;
    api.reference.getCategories().then(setCategories).catch((cause) => setReportError(`Could not load categories: ${cause.message}`));
  }, [categories.length, reportStep]);

  async function send(value = input) {
    const content = value.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError('');
    try {
      const response = await api.civicai.chat(next.slice(-12));
      setMessages([...next, { role: 'assistant', content: response.message }]);
      response.actions?.forEach((action) => {
        if (action.type === 'start_guided_tour') {
          window.dispatchEvent(new CustomEvent('civicpulse:start-guided-tour', { detail: { tour: action.tour } }));
        }
        if (action.type === 'start_report_submission') startReportTask(action);
        if (action.type === 'confirm_status_change') {
          setPendingOperation(action);
          setOperationError('');
        }
        if (action.type === 'confirm_user_role_change') {
          setPendingUserRoleChange(action);
          setOperationError('');
        }
      });
    } catch (cause) {
      setError(cause.message || 'CivicAI could not respond. Try again.');
      setMessages(next);
    } finally {
      setBusy(false);
    }
  }

  function toggleVoiceInput() {
    if (voiceListening) {
      recognitionRef.current?.stop();
      setVoiceListening(false);
      return;
    }
    if (!SpeechRecognitionApi || busy) return;
    setVoiceError('');
    try {
      const recognition = new SpeechRecognitionApi();
      recognition.lang = navigator.language || 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .slice(event.resultIndex || 0)
          .filter((result) => result.isFinal)
          .map((result) => result[0]?.transcript || '')
          .join(' ')
          .trim();
        if (transcript) {
          setInput((current) => `${current.trim()}${current.trim() ? ' ' : ''}${transcript}`.slice(0, 2000));
        }
      };
      recognition.onerror = (event) => {
        const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone access was denied. Allow it in your browser settings or type your message.'
          : event.error === 'no-speech'
            ? 'No speech was detected. Try again or type your message.'
            : 'Voice input is unavailable right now. You can type your message instead.';
        setVoiceError(message);
        setVoiceListening(false);
      };
      recognition.onend = () => {
        setVoiceListening(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      recognition.start();
      setVoiceListening(true);
    } catch {
      recognitionRef.current = null;
      setVoiceListening(false);
      setVoiceError('Could not start voice input. Check microphone access or type your message.');
    }
  }

  function closeAssistant() {
    recognitionRef.current?.stop();
    setVoiceListening(false);
    setOpen(false);
  }

  function startReportTask(prefill = {}) {
    if (user?.role !== 'resident') return;
    setReportDraft({ categoryId: prefill.category_id ? String(prefill.category_id) : '', description: prefill.description || '', photo: null, location: null, address: '', landmark: '' });
    setReportRequestId(crypto.randomUUID());
    setReportResult(null);
    setReportError('');
    setReportStep('details');
  }

  function requestPreciseLocation() {
    if (!navigator.geolocation) {
      setReportError('This browser does not support location sharing. Select a point on the map instead.');
      return;
    }
    setReportError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setReportDraft((draft) => ({ ...draft, location: { lat: coords.latitude, lon: coords.longitude } })),
      () => setReportError('Location was not shared. You can try again or select a point on the map.'),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function submitReport() {
    if (!reportDraft.categoryId || !reportDraft.description.trim() || !reportDraft.photo?.file || !reportDraft.location) {
      setReportError('Add a category, description, JPEG/PNG photo and map location before submitting.');
      return;
    }
    setSubmittingReport(true);
    setReportError('');
    const form = new FormData();
    form.append('category_id', String(reportDraft.categoryId));
    form.append('description', reportDraft.description.trim());
    form.append('photo', reportDraft.photo.file);
    form.append('lat', String(reportDraft.location.lat));
    form.append('lon', String(reportDraft.location.lon));
    form.append('address', reportDraft.address.trim());
    form.append('landmark', reportDraft.landmark.trim());
    try {
      const created = await api.reports.create(form, { idempotencyKey: reportRequestId });
      setReportResult(created);
      setReportStep(null);
      setMessages((current) => [...current, {
        role: 'assistant',
        content: `Report #${created.id} was submitted successfully. Its current status is ${created.status}.`,
      }]);
    } catch (cause) {
      setReportError(`${cause.message} Your report details are still here; correct the location or try submitting again.`);
    } finally {
      setSubmittingReport(false);
    }
  }

  async function confirmStatusChange() {
    if (!pendingOperation || operationBusy) return;
    setOperationBusy(true);
    setOperationError('');
    try {
      const updated = await api.reports.updateStatus(pendingOperation.report_id, {
        status: pendingOperation.status,
        note: pendingOperation.note,
      });
      setMessages((current) => [...current, {
        role: 'assistant', content: `Report #${updated.id} is now ${updated.status}.`,
      }]);
      setPendingOperation(null);
    } catch (cause) {
      setOperationError(`${cause.message} The report was not changed. You can retry or cancel.`);
    } finally {
      setOperationBusy(false);
    }
  }

  async function confirmUserRoleChange() {
    if (!pendingUserRoleChange || operationBusy) return;
    setOperationBusy(true);
    setOperationError('');
    try {
      const updated = await api.updateUserRole(pendingUserRoleChange.user_id, pendingUserRoleChange.role);
      setMessages((current) => [...current, {
        role: 'assistant', content: `${updated.name}'s role is now ${updated.role}.`,
      }]);
      setPendingUserRoleChange(null);
    } catch (cause) {
      setOperationError(`${cause.message} The role was not changed. You can retry or cancel.`);
    } finally {
      setOperationBusy(false);
    }
  }

  if (!user) return null;
  return (
    <>
      {!open && <button type="button" onClick={() => setOpen(true)} aria-label="Open CivicAI assistant"
        className="fixed z-40 bottom-20 right-4 lg:bottom-6 lg:right-6 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#38C6DC] to-[#0B5A9C] px-4 py-3 text-sm font-bold text-white shadow-xl hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5A9C]">
        <Sparkles className="h-5 w-5" /> <span>CivicAI</span>
      </button>}
      {open && <section aria-label="CivicAI assistant" className="fixed z-50 inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[min(420px,calc(100vw-32px))] sm:h-[min(680px,calc(100dvh-48px))] flex flex-col bg-white sm:rounded-3xl shadow-2xl border border-[#cfe9f0] overflow-hidden">
        <header className="flex items-center justify-between bg-gradient-to-r from-[#0B5A9C] to-[#1B8FC0] p-4 text-white">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-white/15 p-2"><Bot className="h-5 w-5" /></div><div><h2 className="font-extrabold">CivicAI</h2><p className="text-xs text-white/75">Your CivicPulse assistant · {user.role}</p></div></div>
          <button type="button" onClick={closeAssistant} aria-label="Close CivicAI" className="rounded-full p-2 hover:bg-white/15 focus-visible:outline focus-visible:outline-2"><X className="h-5 w-5" /></button>
        </header>
        <div ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions" className="flex-1 overflow-y-auto space-y-3 bg-[#f6fbfc] p-4">
          {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-5 ${message.role === 'user' ? 'ml-auto bg-[#0B5A9C] text-white rounded-br-md' : 'bg-white border border-[#d8edf2] text-slate-700 rounded-bl-md'}`}>
            {message.role === 'assistant' ? <FormattedAssistantMessage text={message.content} /> : message.content}
            {message.role === 'assistant' && index === messages.length - 1 && <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => send('How do I report an infrastructure problem?')} className="inline-flex items-center gap-1 rounded-full border border-[#cfe9f0] px-2.5 py-1.5 text-xs font-semibold text-[#0B5A9C]"><HelpCircle className="h-3.5 w-3.5" /> Guide me</button>
              <button type="button" onClick={() => send('Show me my reports and their status')} className="inline-flex items-center gap-1 rounded-full border border-[#cfe9f0] px-2.5 py-1.5 text-xs font-semibold text-[#0B5A9C]"><ClipboardList className="h-3.5 w-3.5" /> My reports</button>
              <button type="button" onClick={() => send('I want to report an infrastructure issue')} className="inline-flex items-center gap-1 rounded-full border border-[#cfe9f0] px-2.5 py-1.5 text-xs font-semibold text-[#0B5A9C]"><MapPinned className="h-3.5 w-3.5" /> Report issue</button>
              {user.role === 'resident' && <button type="button" onClick={startReportTask} className="inline-flex items-center gap-1 rounded-full border border-[#cfe9f0] px-2.5 py-1.5 text-xs font-semibold text-[#0B5A9C]"><MapPinned className="h-3.5 w-3.5" /> Start report</button>}
            </div>}
          </div>)}
          {pendingOperation && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Confirmation required</p>
            <p className="mt-1 text-sm font-bold text-slate-800">Change report #{pendingOperation.report_id} ({pendingOperation.category}) to {pendingOperation.status.replace('_', ' ')}?</p>
            {pendingOperation.note && <p className="mt-1 text-xs text-slate-600">Note: {pendingOperation.note}</p>}
            <div className="mt-3 flex gap-2"><button type="button" onClick={() => { setPendingOperation(null); setOperationError(''); }} disabled={operationBusy} className="min-h-10 flex-1 rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-600">Cancel</button><button type="button" onClick={confirmStatusChange} disabled={operationBusy} className="min-h-10 flex-1 rounded-full bg-[#0B5A9C] text-xs font-bold text-white disabled:opacity-60">{operationBusy ? 'Updating…' : 'Confirm status change'}</button></div>
            {operationError && <p role="alert" className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{operationError}</p>}
          </div>}
          {pendingUserRoleChange && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Confirmation required</p>
            <p className="mt-1 text-sm font-bold text-slate-800">Change {pendingUserRoleChange.user_name}&apos;s role from {pendingUserRoleChange.current_role} to {pendingUserRoleChange.role}?</p>
            <div className="mt-3 flex gap-2"><button type="button" onClick={() => { setPendingUserRoleChange(null); setOperationError(''); }} disabled={operationBusy} className="min-h-10 flex-1 rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-600">Cancel</button><button type="button" onClick={confirmUserRoleChange} disabled={operationBusy} className="min-h-10 flex-1 rounded-full bg-[#0B5A9C] text-xs font-bold text-white disabled:opacity-60">{operationBusy ? 'Updating…' : 'Confirm role change'}</button></div>
            {operationError && <p role="alert" className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{operationError}</p>}
          </div>}
          {reportStep && <div className="rounded-2xl border border-[#bfe5ed] bg-white p-3.5 text-sm shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#1B8FC0]">Report an issue</p><h3 className="font-extrabold text-[#0B5A9C]">{reportStep === 'details' ? 'Describe it' : reportStep === 'photo' ? 'Add a photo' : reportStep === 'location' ? 'Choose its location' : 'Review before sending'}</h3></div>
              <button type="button" onClick={() => { setReportStep(null); setReportError(''); }} className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">Save for later</button>
            </div>
            {reportStep === 'details' && <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-600">Issue category<select aria-label="Issue category" value={reportDraft.categoryId} onChange={(event) => setReportDraft({ ...reportDraft, categoryId: event.target.value })} className="mt-1 w-full rounded-xl border border-[#cfe9f0] bg-white p-2.5 text-sm">
                <option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select></label>
              <label className="block text-xs font-bold text-slate-600">What happened?<textarea aria-label="Report description" maxLength={500} rows={3} value={reportDraft.description} onChange={(event) => setReportDraft({ ...reportDraft, description: event.target.value })} placeholder="Describe the issue and what needs attention…" className="mt-1 w-full resize-y rounded-xl border border-[#cfe9f0] p-2.5 text-sm" /></label>
              <button type="button" onClick={() => { if (!reportDraft.categoryId || !reportDraft.description.trim()) { setReportError('Choose a category and add a short description.'); return; } setReportError(''); setReportStep('photo'); }} className="flex min-h-10 w-full items-center justify-center gap-1 rounded-full bg-[#0B5A9C] px-3 text-xs font-bold text-white">Continue <ChevronRight className="h-4 w-4" /></button>
            </div>}
            {reportStep === 'photo' && <div className="space-y-3"><p className="text-xs leading-5 text-slate-600">Attach a JPEG or PNG image (up to 5 MB) to help the verification team assess the issue.</p><ImageUploadComponent image={reportDraft.photo} onImageChange={(photo) => setReportDraft((draft) => ({ ...draft, photo }))} onImageRemove={() => setReportDraft((draft) => ({ ...draft, photo: null }))} allowedTypes={['image/jpeg', 'image/png', 'image/jpg']} />
              <div className="flex gap-2"><button type="button" onClick={() => setReportStep('details')} className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full border border-[#cfe9f0] text-xs font-semibold text-[#0B5A9C]"><ChevronLeft className="h-4 w-4" /> Back</button><button type="button" onClick={() => { if (!reportDraft.photo?.file) { setReportError('Please attach a photo to continue.'); return; } setReportError(''); setReportStep('location'); }} className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full bg-[#0B5A9C] text-xs font-bold text-white">Continue <ChevronRight className="h-4 w-4" /></button></div>
            </div>}
            {reportStep === 'location' && <div className="space-y-3">
              <p className="text-xs leading-5 text-slate-600">Share precise device location only if you choose, or tap the map to place a pin. Address text is not geocoded; the pin must mark the actual issue location.</p>
              <button type="button" onClick={requestPreciseLocation} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[#cfe9f0] bg-[#effafd] text-xs font-bold text-[#0B5A9C]"><LocateFixed className="h-4 w-4" /> Share precise location</button>
              <div className="overflow-hidden rounded-xl border border-[#cfe9f0]"><MapComponent center={reportDraft.location ? [reportDraft.location.lat, reportDraft.location.lon] : [-1.2921, 36.8219]} zoom={reportDraft.location ? 15 : 6} pickerMode pickedLocation={reportDraft.location} onLocationPick={(location) => setReportDraft((draft) => ({ ...draft, location }))} height="190px" /></div>
              {reportDraft.location && <p className="text-xs text-emerald-700">Location selected <CheckCircle2 className="inline h-3.5 w-3.5" /></p>}
              <label className="block text-xs font-bold text-slate-600">Address or road name <input maxLength={255} value={reportDraft.address} onChange={(event) => setReportDraft({ ...reportDraft, address: event.target.value })} placeholder="Optional; e.g. Kenyatta Avenue" className="mt-1 w-full rounded-xl border border-[#cfe9f0] p-2.5 text-sm" /></label>
              <label className="block text-xs font-bold text-slate-600">Nearby landmark <input maxLength={120} value={reportDraft.landmark} onChange={(event) => setReportDraft({ ...reportDraft, landmark: event.target.value })} placeholder="Optional" className="mt-1 w-full rounded-xl border border-[#cfe9f0] p-2.5 text-sm" /></label>
              <div className="flex gap-2"><button type="button" onClick={() => setReportStep('photo')} className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full border border-[#cfe9f0] text-xs font-semibold text-[#0B5A9C]"><ChevronLeft className="h-4 w-4" /> Back</button><button type="button" onClick={() => { if (!reportDraft.location) { setReportError('Select a point on the map or share your precise location.'); return; } setReportError(''); setReportStep('review'); }} className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full bg-[#0B5A9C] text-xs font-bold text-white">Review <ChevronRight className="h-4 w-4" /></button></div>
            </div>}
            {reportStep === 'review' && <div className="space-y-3">
              <dl className="space-y-2 rounded-xl bg-[#f5fbfc] p-3 text-xs"><div><dt className="font-bold text-slate-500">Category</dt><dd className="text-slate-800">{categories.find((item) => String(item.id) === String(reportDraft.categoryId))?.name}</dd></div><div><dt className="font-bold text-slate-500">Description</dt><dd className="text-slate-800">{reportDraft.description}</dd></div><div><dt className="font-bold text-slate-500">Photo</dt><dd className="text-slate-800">{reportDraft.photo?.name}</dd></div><div><dt className="font-bold text-slate-500">Address / landmark</dt><dd className="text-slate-800">{[reportDraft.address, reportDraft.landmark].filter(Boolean).join(' · ') || 'Not provided'}</dd></div><div><dt className="font-bold text-slate-500">Map pin</dt><dd className="text-slate-800">{reportDraft.location?.lat.toFixed(5)}, {reportDraft.location?.lon.toFixed(5)}</dd></div></dl>
              <p className="text-xs text-slate-600">Everything look right? CivicPulse will validate this location against county boundaries before saving.</p>
              <div className="flex gap-2"><button type="button" onClick={() => setReportStep('location')} disabled={submittingReport} className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full border border-[#cfe9f0] text-xs font-semibold text-[#0B5A9C]"><ChevronLeft className="h-4 w-4" /> Correct</button><button type="button" onClick={submitReport} disabled={submittingReport} className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-[#38C6DC] to-[#0B5A9C] text-xs font-bold text-white disabled:opacity-60">{submittingReport ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending…</> : 'Yes, submit report'}</button></div>
            </div>}
            {reportError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs leading-5 text-rose-700">{reportError}</p>}
          </div>}
          {!reportStep && !reportResult && user.role === 'resident' && reportRequestId && (reportDraft.categoryId || reportDraft.description || reportDraft.photo || reportDraft.location) && <button type="button" onClick={() => {
            setReportError('');
            setReportStep(!reportDraft.categoryId || !reportDraft.description.trim() ? 'details' : !reportDraft.photo?.file ? 'photo' : !reportDraft.location ? 'location' : 'review');
          }} className="w-full rounded-xl border border-[#bfe9f0] bg-white p-3 text-left text-xs font-bold text-[#0B5A9C]">Resume your saved report draft →</button>}
          {reportResult && <Link to={`/reports/${reportResult.id}`} onClick={() => setOpen(false)} className="block rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">View submitted report #{reportResult.id} →</Link>}
          {busy && <div className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> CivicAI is thinking…</div>}
          {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error} {error.includes('not configured') && 'Please contact your CivicPulse administrator.'}</div>}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); send(); }} className="border-t border-[#d8edf2] bg-white p-3">
          <div className="flex items-end gap-2">
          <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} aria-label="Message CivicAI" placeholder="Ask CivicAI anything…" rows={1} maxLength={2000} className="max-h-28 min-h-11 flex-1 resize-y rounded-2xl border border-[#cfe9f0] px-3 py-2.5 text-sm outline-none focus:border-[#1B8FC0]" />
          <button type="button" onClick={toggleVoiceInput} disabled={!SpeechRecognitionApi || busy} aria-label={voiceListening ? 'Stop voice input' : 'Start voice input'} aria-pressed={voiceListening} title={!SpeechRecognitionApi ? 'Voice input is not supported in this browser' : 'Speak a message'} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0B5A9C] disabled:cursor-not-allowed disabled:opacity-40 ${voiceListening ? 'border-rose-300 bg-rose-50 text-rose-700 animate-pulse' : 'border-[#cfe9f0] bg-white text-[#0B5A9C]'}`}>
            {voiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0B5A9C] text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </div>
          <p className="mt-1.5 text-[10px] leading-4 text-slate-500">Voice transcription may be handled by your browser’s speech service. Review the text before sending.</p>
          {voiceListening && <p role="status" aria-live="polite" className="mt-1 text-xs font-semibold text-rose-700">Listening… Speak now, then stop or wait for transcription.</p>}
          {voiceError && <p role="alert" className="mt-1 text-xs text-rose-700">{voiceError}</p>}
        </form>
      </section>}
    </>
  );
}
