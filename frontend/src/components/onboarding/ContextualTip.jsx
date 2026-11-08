import React, { useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const tips = {
  resident: {
    '/dashboard': 'Use My Reports to follow progress and Notifications to read updates about reports you submit or follow.',
    '/report/new': 'A clear location, useful photo and concise description help verifiers assess your report.',
    '/my-reports': 'Follow a report to receive relevant progress updates, even when you did not submit it.',
    '/community-map': 'The map helps explore reports by location; hotspot analytics are available to authority and admin roles.',
  },
  verifier: {
    '/verifier/queue': 'Review the report details and AI suggestion, then verify or reject it. Similarity suggestions are for human review and do not reject reports automatically.',
  },
  authority: {
    '/authority/assigned': 'Update the status of your assigned work as repairs progress so report followers can stay informed.',
  },
  admin: {
    '/admin': 'Use the dashboard sections to manage users, report assignments, categories, wards and hotspot analysis.',
    '/analytics': 'Hotspot clusters summarize recurring report locations and can be recomputed from the admin dashboard.',
  },
};

export default function ContextualTip() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const role = user?.role || 'resident';
  const key = `civicpulse-tip-dismissed:${role}:${pathname}`;
  const tip = tips[role]?.[pathname];

  useEffect(() => {
    setDismissed(window.sessionStorage.getItem(key) === 'true');
  }, [key]);

  if (!tip || user?.feature_tips_enabled === false || dismissed) return null;

  const dismiss = () => {
    window.sessionStorage.setItem(key, 'true');
    setDismissed(true);
  };

  return (
    <aside
      role="note"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700"
    >
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
      <p className="flex-1">{tip}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss tip for this session"
        className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-800"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </aside>
  );
}
