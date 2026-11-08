import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

const roleTours = {
  resident: [
    {
      title: 'Report a problem',
      description: 'Residents can report local infrastructure problems here. Select this button to open the report form.',
      selector: '[data-tour="resident-report"]',
      path: '/dashboard',
      advanceOnTargetClick: true,
    },
    {
      title: 'Use your location',
      description: 'Choose this only if you want to share your current location. CivicPulse will not request it unless you use this control.',
      selector: '[data-tour="report-location"]',
      path: '/report/new',
    },
    {
      title: 'Choose a category',
      description: 'Select the infrastructure category that best describes the problem.',
      selector: '[data-tour="report-category"]',
      path: '/report/new',
    },
    {
      title: 'Describe the problem',
      description: 'Add useful details about what happened and where crews can find it.',
      selector: '[data-tour="report-description"]',
      path: '/report/new',
    },
    {
      title: 'Add a photo',
      description: 'A clear photo can help reviewers verify the issue. Choose a file only if you want to attach one.',
      selector: '[data-tour="report-photo"]',
      path: '/report/new',
    },
    {
      title: 'Submit your report',
      description: 'This button sends a completed report for processing. Use Next to continue the tour without submitting a report.',
      selector: '[data-tour="report-submit"]',
      path: '/report/new',
      nextPath: '/dashboard',
      nextLabel: 'Go to My Reports',
    },
    {
      title: 'Track your reports',
      description: 'Open My Reports to follow submitted reports and see their progress.',
      selector: '[data-tour="resident-my-reports"]',
      path: '/dashboard',
      advanceOnTargetClick: true,
    },
    {
      title: 'Follow incidents',
      description: 'The Following tab collects incidents you choose to follow so you can keep up with their progress.',
      selector: '[data-tour="resident-following"]',
      path: '/dashboard',
      nextPath: '/my-reports',
      nextLabel: 'Open My Reports',
    },
    {
      title: 'Open a report',
      description: 'Select a report to see its details and available follow controls.',
      selector: '[data-tour="resident-report-link"]',
      path: '/my-reports',
      advanceOnTargetClick: true,
      optional: true,
    },
    {
      title: 'Follow report updates',
      description: 'Follow Report subscribes you to updates about this incident. Use it only when you want those updates.',
      selector: '[data-tour="report-follow"]',
      path: ['/my-reports', /^\/reports\/[^/]+$/],
      nextPath: '/my-reports',
      nextLabel: 'See report summaries',
      optional: true,
    },
    {
      title: 'Recognize related reports',
      description: 'A merged-count badge groups multiple submissions that are being handled as one case.',
      selector: '[data-tour="resident-merged-count"]',
      path: '/my-reports',
      optional: true,
    },
    {
      title: 'Open notifications',
      description: 'Use notifications to read status and duplicate-related updates about reports you sent or follow.',
      selector: '[data-tour="resident-notifications"]',
      path: null,
      advanceOnTargetClick: true,
    },
    {
      title: 'Read report updates',
      description: 'The notification feed includes updates for reports you submitted or follow, including duplicate-related changes.',
      selector: '[data-tour="resident-notifications-page"]',
      path: '/notifications',
    },
  ],
  verifier: [
    {
      title: 'Verifier queue',
      description: 'Review incoming reports here. Select a report to inspect it, reject an invalid report, or correct a duplicate merge with Split / Unmerge.',
      selector: '[data-tour="verifier-queue"]',
      path: '/verifier/queue',
    },
    {
      title: 'Select a report',
      description: 'Choose a report to see its details and available verification actions.',
      selector: '[data-tour="verifier-report"]',
      path: '/verifier/queue',
      advanceOnTargetClick: true,
      optional: true,
    },
    {
      title: 'Reject a report',
      description: 'Reject a report only when it does not meet verification requirements; the rejection flow asks for a reason.',
      selector: '[data-tour="verifier-reject"]',
      path: '/verifier/queue',
      optional: true,
    },
    {
      title: 'Reverse a duplicate merge',
      description: 'For a report that was merged incorrectly, Split / Unmerge reverses that merge. This action appears only for merged reports.',
      selector: '[data-tour="verifier-unmerge"]',
      path: '/verifier/queue',
      optional: true,
    },
  ],
  authority: [
    {
      title: 'Assigned incidents',
      description: 'This dashboard lists incidents assigned to your authority account. Assignment itself is handled by administrators.',
      selector: '[data-tour="authority-dashboard"]',
      path: '/authority/assigned',
    },
    {
      title: 'Start assigned work',
      description: 'Use Start Work when you begin an assigned repair. This changes its status; you do not need to activate it during the tour.',
      selector: '[data-tour="authority-start-work"]',
      path: '/authority/assigned',
      optional: true,
    },
    {
      title: 'Record a resolution',
      description: 'When work is in progress, Mark Resolved opens the form for recording completion details.',
      selector: '[data-tour="authority-resolve"]',
      path: '/authority/assigned',
      optional: true,
    },
  ],
  admin: [
    {
      title: 'Manage reports',
      description: 'Review reports and manage assignments to authorities from this tab.',
      selector: '[data-tour="admin-reports"]',
      path: '/admin',
    },
    {
      title: 'Manage users',
      description: 'Review user accounts and administer role access here.',
      selector: '[data-tour="admin-users"]',
      path: '/admin',
      advanceOnTargetClick: true,
    },
    {
      title: 'Manage categories',
      description: 'Maintain the categories residents can select when filing reports.',
      selector: '[data-tour="admin-categories"]',
      path: '/admin',
      advanceOnTargetClick: true,
    },
    {
      title: 'Manage wards',
      description: 'Maintain the wards available across CivicPulse.',
      selector: '[data-tour="admin-areas"]',
      path: '/admin',
      advanceOnTargetClick: true,
    },
    {
      title: 'Refresh hotspots',
      description: 'Administrators can recompute hotspot groupings from report data. The refresh is optional; the tour will not run it for you.',
      selector: '[data-tour="admin-hotspots"]',
      path: '/admin',
    },
  ],
};

const homePaths = {
  resident: '/dashboard',
  verifier: '/verifier/queue',
  authority: '/authority/assigned',
  admin: '/admin',
};

function pathMatches(step, pathname) {
  const allowedPaths = Array.isArray(step.path) ? step.path : [step.path];
  return allowedPaths.some((path) => (
    path === null
    || path === undefined
    || (path instanceof RegExp ? path.test(pathname) : path === pathname)
  ));
}

export default function OnboardingTour({ open, onClose }) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [target, setTarget] = useState(null);
  const [position, setPosition] = useState(null);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [saving, setSaving] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [pendingStep, setPendingStep] = useState(null);
  const tooltipRef = useRef(null);
  const targetRef = useRef(null);
  const previousFocusRef = useRef(null);
  const steps = useMemo(() => roleTours[user?.role] || roleTours.resident, [user?.role]);
  const current = steps[currentStep];

  const persistPreferences = useCallback(async (patch) => {
    setSaving(true);
    try {
      await api.users.updatePreferences(patch);
      await refreshUser();
      return true;
    } catch (error) {
      toast.error(`Could not save your onboarding settings: ${error.message}`);
      return false;
    } finally {
      setSaving(false);
    }
  }, [refreshUser, toast]);

  const finishTour = useCallback(async () => {
    if (saving) return;
    if (await persistPreferences({ onboarding_completed: true })) onClose?.();
  }, [onClose, persistPreferences, saving]);

  const skipTour = useCallback(async () => {
    if (saving) return;
    if (await persistPreferences({
      onboarding_completed: false,
      product_tour_enabled: false,
    })) onClose?.();
  }, [onClose, persistPreferences, saving]);

  const moveToStep = useCallback((index) => {
    const next = steps[index];
    if (!next) return;
    if (!pathMatches(next, location.pathname)) {
      const destination = Array.isArray(next.path)
        ? next.path.find((path) => typeof path === 'string')
        : next.path;
      if (!destination) {
        setPendingStep(null);
        setCurrentStep(index);
        return;
      }
      setPendingStep(index);
      navigate(destination);
      return;
    }
    setPendingStep(null);
    setCurrentStep(index);
  }, [location.pathname, navigate, steps]);

  const advance = useCallback(() => {
    if (currentStep === steps.length - 1) {
      finishTour();
      return;
    }
    const nextIndex = currentStep + 1;
    const next = steps[nextIndex];
    if (current?.nextPath) {
      setPendingStep(nextIndex);
      navigate(current.nextPath);
      return;
    }
    moveToStep(nextIndex);
  }, [current, currentStep, finishTour, moveToStep, navigate, steps]);

  const goBack = useCallback(() => {
    if (currentStep > 0) moveToStep(currentStep - 1);
  }, [currentStep, moveToStep]);

  useEffect(() => {
    if (!open || !user) return;
    previousFocusRef.current = document.activeElement;
    setCurrentStep(0);
    setPendingStep(null);
    const home = homePaths[user.role] || homePaths.resident;
    if (
      location.pathname !== home
      || (user.role === 'admin' && new URLSearchParams(location.search).get('tab') !== 'reports')
    ) {
      navigate(user.role === 'admin' ? '/admin?tab=reports' : home);
    }
  // Opening starts a fresh walkthrough; later route changes preserve the active step.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  useEffect(() => {
    if (pendingStep === null) return;
    const pending = steps[pendingStep];
    if (pending && pathMatches(pending, location.pathname)) {
      setCurrentStep(pendingStep);
      setPendingStep(null);
    }
  }, [location.pathname, pendingStep, steps]);

  useEffect(() => {
    if (
      open
      && user?.role === 'resident'
      && currentStep === 5
      && /^\/reports\/[^/]+$/.test(location.pathname)
    ) {
      setPendingStep(6);
      navigate('/dashboard');
    }
  }, [currentStep, location.pathname, navigate, open, user?.role]);

  useEffect(() => {
    if (!open || !user) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        skipTour();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, skipTour, user]);

  useEffect(() => {
    if (!open || !current || !pathMatches(current, location.pathname)) {
      setTarget(null);
      setPosition(null);
      setSpotlightRect(null);
      return undefined;
    }

    let active = true;
    let observer;
    let timer;
    const findTarget = () => {
      if (!active || targetRef.current) return;
      const element = document.querySelector(current.selector);
      if (!element || element.getClientRects().length === 0) return;
      targetRef.current = element;
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      setTarget(element);
      setWaiting(false);
    };

    targetRef.current = null;
    setTarget(null);
    setPosition(null);
    setSpotlightRect(null);
    setWaiting(false);
    const waitingTimer = window.setTimeout(() => {
      if (active && !targetRef.current) setWaiting(true);
    }, 900);
    observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    findTarget();
    timer = window.setInterval(findTarget, 250);
    return () => {
      active = false;
      observer?.disconnect();
      window.clearInterval(timer);
      window.clearTimeout(waitingTimer);
      targetRef.current = null;
    };
  }, [current, location.pathname, open]);

  useEffect(() => {
    if (!target) return undefined;
    const originalOutline = target.style.outline;
    const originalOutlineOffset = target.style.outlineOffset;
    const originalBoxShadow = target.style.boxShadow;
    const previousDescription = target.getAttribute('aria-describedby');
    target.style.outline = '3px solid #0B5A9C';
    target.style.outlineOffset = '4px';
    target.style.boxShadow = '0 0 0 7px rgba(56, 198, 220, 0.28)';
    target.setAttribute('aria-describedby', 'onboarding-spotlight-description');

    return () => {
      target.style.outline = originalOutline;
      target.style.outlineOffset = originalOutlineOffset;
      target.style.boxShadow = originalBoxShadow;
      if (previousDescription === null) target.removeAttribute('aria-describedby');
      else target.setAttribute('aria-describedby', previousDescription);
    };
  }, [target]);

  useEffect(() => {
    if (!target) return undefined;
    const updatePosition = () => {
      const targetRect = target.getBoundingClientRect();
      setSpotlightRect({
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
        height: targetRect.height,
      });
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      if (!tooltipRect) return;
      const margin = 12;
      const width = Math.min(tooltipRect.width, window.innerWidth - margin * 2);
      const left = Math.max(margin, Math.min(
        targetRect.left + targetRect.width / 2 - width / 2,
        window.innerWidth - width - margin,
      ));
      const below = targetRect.bottom + margin;
      const top = below + tooltipRect.height <= window.innerHeight - margin
        ? below
        : Math.max(margin, targetRect.top - tooltipRect.height - margin);
      setPosition({ left, top });
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    observer?.observe(target);
    if (tooltipRef.current) observer?.observe(tooltipRef.current);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const frame = window.requestAnimationFrame(updatePosition);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [target, currentStep]);

  useEffect(() => {
    if (!target || !current?.advanceOnTargetClick) return undefined;
    const handleTargetClick = () => {
      const nextIndex = currentStep + 1;
      const next = steps[nextIndex];
      if (!next) {
        finishTour();
      } else if (!pathMatches(next, location.pathname)) {
        setPendingStep(nextIndex);
      } else {
        setCurrentStep(nextIndex);
      }
    };
    target.addEventListener('click', handleTargetClick, true);
    return () => target.removeEventListener('click', handleTargetClick, true);
  }, [current, currentStep, finishTour, location.pathname, steps, target]);

  useEffect(() => {
    if (open) return;
    const previouslyFocused = previousFocusRef.current;
    if (previouslyFocused?.isConnected) previouslyFocused.focus?.();
  }, [open]);

  if (!open || !user || !current) return null;

  const tooltipStyle = target && position
    ? { left: `${position.left}px`, top: `${position.top}px` }
    : undefined;
  const spotlightStyle = spotlightRect && {
    left: `${spotlightRect.left}px`,
    top: `${spotlightRect.top}px`,
    width: `${spotlightRect.width}px`,
    height: `${spotlightRect.height}px`,
  };

  return (
    <>
      {spotlightStyle && (
        <div
          aria-hidden="true"
          data-testid="onboarding-spotlight-dim"
          className="pointer-events-none fixed z-[60] rounded-lg"
          style={{
            ...spotlightStyle,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.12)',
          }}
        />
      )}
      <section
        ref={tooltipRef}
        role="region"
        aria-labelledby="onboarding-spotlight-title"
        aria-describedby="onboarding-spotlight-description"
        className="fixed z-[100] max-h-[calc(100dvh-24px)] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-[#cfe9f0] bg-white p-4 text-[#5F5F5F] shadow-[0_16px_40px_-16px_rgba(11,90,156,0.45)]"
        style={tooltipStyle || {
          right: '12px',
          bottom: 'calc(12px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1B8FC0]" aria-live="polite">
              Step {currentStep + 1} of {steps.length}
            </p>
            <h2 id="onboarding-spotlight-title" aria-live="polite" className="mt-1 text-sm font-extrabold text-[#0B5A9C]">
              {!target && waiting && current.optional
                ? 'This feature is not available right now'
                : !target
                  ? 'Finding this feature...'
                  : current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={skipTour}
            disabled={saving}
            aria-label="Skip tour"
            className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-[#5F5F5F] hover:bg-[#E6F5F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0B5A9C] disabled:opacity-60"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p id="onboarding-spotlight-description" className="mt-2 text-xs leading-5">
          {target
            ? current.description
            : waiting && current.optional
              ? 'This control depends on the available reports or assignments. You can continue without changing anything.'
              : 'Waiting for this part of the application to load. You can go back or skip the tour.'}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 0 || saving}
            className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-xs font-semibold text-[#5F5F5F] hover:bg-[#E6F5F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0B5A9C] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            onClick={advance}
            disabled={saving}
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-gradient-to-r from-[#38C6DC] to-[#0B5A9C] px-4 text-xs font-bold text-white transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5A9C] disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? 'Saving...' : currentStep === steps.length - 1 ? 'Finish' : current.nextLabel || 'Next'}
            {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </section>
    </>
  );
}
