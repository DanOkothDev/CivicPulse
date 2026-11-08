import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import ContextualTip from './ContextualTip';
import OnboardingTour from './OnboardingTour';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../services/api', () => ({
  api: { users: { updatePreferences: vi.fn() } },
}));

const originalGetClientRects = HTMLElement.prototype.getClientRects;
const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');

function TourPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState(false);

  if (pathname === '/dashboard') {
    return (
      <div>
        <Link data-tour="resident-report" to="/report/new">File a new issue</Link>
        <button data-tour="resident-my-reports" type="button">My reports</button>
        <button data-tour="resident-following" type="button">Following</button>
        <Link data-tour="resident-notifications" to="/notifications">Notifications</Link>
      </div>
    );
  }
  if (pathname === '/report/new') {
    return (
      <form onSubmit={(event) => {
        event.preventDefault();
        navigate('/reports/123');
      }}>
        <button data-tour="report-location" type="button">Use GPS</button>
        <select data-tour="report-category" aria-label="Category"><option>Road</option></select>
        <textarea data-tour="report-description" aria-label="Description" />
        <button data-tour="report-photo" type="button">Browse File</button>
        <button data-tour="report-submit" type="submit">Submit report</button>
      </form>
    );
  }
  if (pathname === '/my-reports') {
    return (
      <div>
        <h1>My Reports</h1>
        <Link data-tour="resident-report-link" to="/reports/123">Report details</Link>
        <span data-tour="resident-merged-count">+2 Merged</span>
        <Link data-tour="resident-notifications" to="/notifications">Notifications</Link>
      </div>
    );
  }
  if (/^\/reports\/[^/]+$/.test(pathname)) {
    return (
      <>
        <p>Report submitted</p>
        <button data-tour="report-follow" type="button">Follow Report</button>
        <Link data-tour="resident-notifications" to="/notifications">Notifications</Link>
      </>
    );
  }
  if (pathname === '/notifications') {
    return <h1 data-tour="resident-notifications-page">Notifications</h1>;
  }
  if (pathname === '/verifier/queue') {
    return (
      <div>
        <h1 data-tour="verifier-queue">Verifier Queue</h1>
        <button data-tour="verifier-report" type="button" onClick={() => setSelectedReport(true)}>Report</button>
        {selectedReport && (
          <>
            <button data-tour="verifier-reject" type="button">Reject Issue</button>
            <button data-tour="verifier-unmerge" type="button">Split / Unmerge</button>
          </>
        )}
      </div>
    );
  }
  if (pathname === '/authority/assigned') {
    return (
      <div>
        <h1 data-tour="authority-dashboard">Authority Field Dashboard</h1>
        <button data-tour="authority-start-work" type="button">Start Work</button>
        <button data-tour="authority-resolve" type="button">Mark Resolved</button>
      </div>
    );
  }
  return (
    <div>
      <button data-tour="admin-reports" type="button">Reports</button>
      <button data-tour="admin-users" type="button">Users</button>
      <button data-tour="admin-categories" type="button">Categories</button>
      <button data-tour="admin-areas" type="button">Wards</button>
      <button data-tour="admin-hotspots" type="button">Refresh hotspots</button>
    </div>
  );
}

const renderTour = (role = 'resident', onClose = vi.fn(), overrides = {}, path = '/dashboard') => {
  const refreshUser = vi.fn().mockResolvedValue(null);
  useAuth.mockReturnValue({
    user: {
      id: 1,
      role,
      onboarding_completed: false,
      product_tour_enabled: true,
      feature_tips_enabled: true,
    },
    refreshUser,
    ...overrides,
  });
  return {
    onClose,
    refreshUser,
    ...render(
      <MemoryRouter initialEntries={[path]}>
        <OnboardingTour open onClose={onClose} />
        <TourPage />
      </MemoryRouter>,
    ),
  };
};

describe('OnboardingTour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ error: vi.fn() });
    api.users.updatePreferences.mockResolvedValue({});
    Object.defineProperty(HTMLElement.prototype, 'getClientRects', {
      configurable: true,
      value: () => [{}],
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(HTMLElement.prototype, 'getClientRects', {
      configurable: true,
      value: originalGetClientRects,
    });
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: originalGetBoundingClientRect,
    });
    Object.defineProperty(window, 'innerWidth', originalInnerWidth);
    Object.defineProperty(window, 'innerHeight', originalInnerHeight);
    if (originalScrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: originalScrollIntoView,
      });
    } else {
      delete HTMLElement.prototype.scrollIntoView;
    }
  });

  it('uses the real report link and follows the resident workflow across routes', async () => {
    const user = userEvent.setup();
    renderTour();

    expect(await screen.findByRole('heading', { name: 'Report a problem' })).toBeTruthy();
    const reportLink = screen.getByRole('link', { name: 'File a new issue' });
    await user.click(reportLink);
    expect(await screen.findByRole('heading', { name: 'Use your location' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Use GPS' }).style.outline).toContain('solid');
    const dimmer = await screen.findByTestId('onboarding-spotlight-dim');
    expect(dimmer.style.boxShadow).toContain('rgba(15, 23, 42, 0.12)');
    expect(dimmer.className).toContain('pointer-events-none');
    expect(dimmer.style.width).not.toBe('100vw');

    for (const title of [
      'Choose a category',
      'Describe the problem',
      'Add a photo',
      'Submit your report',
    ]) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(await screen.findByRole('heading', { name: title })).toBeTruthy();
    }
    expect(screen.getByText(/without submitting a report/i)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Go to My Reports' }));
    expect(await screen.findByRole('heading', { name: 'Track your reports' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'My reports' })).toBeTruthy();
  });

  it('keeps the tooltip within a narrow viewport when its target is near the bottom edge', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 640 });
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value() {
        if (this.matches?.('[data-tour="resident-report"]')) {
          return { left: 320, top: 570, right: 350, bottom: 600, width: 30, height: 30 };
        }
        return { left: 0, top: 0, right: 320, bottom: 180, width: 320, height: 180 };
      },
    });
    renderTour();

    const tooltip = await screen.findByRole('region', { name: 'Report a problem' });
    await waitFor(() => {
      expect(tooltip.style.left).toBe('28px');
      expect(tooltip.style.top).toBe('378px');
    });
  });

  it('lets a resident complete the tour by using the highlighted My Reports control', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderTour('resident', onClose);

    await user.click(screen.getByRole('link', { name: 'File a new issue' }));
    for (let index = 0; index < 4; index += 1) {
      await user.click(await screen.findByRole('button', { name: 'Next' }));
    }
    await user.click(await screen.findByRole('button', { name: 'Go to My Reports' }));
    await user.click(await screen.findByRole('button', { name: 'My reports' }));

    expect(await screen.findByRole('heading', { name: 'Follow incidents' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Open My Reports' }));
    await user.click(await screen.findByRole('link', { name: 'Report details' }));
    expect(await screen.findByRole('heading', { name: 'Follow report updates' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'See report summaries' }));
    expect(await screen.findByRole('heading', { name: 'Recognize related reports' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('link', { name: 'Notifications' }));
    expect(await screen.findByRole('heading', { name: 'Read report updates' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Finish' }));

    await waitFor(() => expect(api.users.updatePreferences).toHaveBeenCalledWith({
      onboarding_completed: true,
    }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('continues to My Reports after an actual report submission', async () => {
    const user = userEvent.setup();
    renderTour();

    await user.click(screen.getByRole('link', { name: 'File a new issue' }));
    for (let index = 0; index < 4; index += 1) {
      await user.click(await screen.findByRole('button', { name: 'Next' }));
    }
    expect(await screen.findByRole('heading', { name: 'Submit your report' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByRole('heading', { name: 'Track your reports' })).toBeTruthy();
  });

  it('highlights verifier actions only after a report is selected', async () => {
    const user = userEvent.setup();
    renderTour('verifier', vi.fn(), {}, '/verifier/queue');
    expect(await screen.findByRole('heading', { name: 'Verifier queue' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: 'Select a report' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Report' }));
    expect(await screen.findByRole('heading', { name: 'Reject a report' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reject Issue' }).style.outline).toContain('solid');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: 'Reverse a duplicate merge' })).toBeTruthy();
  });

  it('uses role-specific authority and admin controls', async () => {
    const user = userEvent.setup();
    const authorityView = renderTour('authority', vi.fn(), {}, '/authority/assigned');
    expect(await screen.findByRole('heading', { name: 'Assigned incidents' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: 'Start assigned work' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start Work' }).style.outline).toContain('solid');

    expect(authorityView.getByRole('button', { name: 'Mark Resolved' })).toBeTruthy();
    authorityView.unmount();

    const adminView = renderTour('admin', vi.fn(), {}, '/admin');
    expect(await screen.findByRole('heading', { name: 'Manage reports' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: 'Manage users' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Users' }));
    expect(await screen.findByRole('heading', { name: 'Manage categories' })).toBeTruthy();
    adminView.unmount();
  });

  it('reports preference-save errors and keeps the tour open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const toast = { error: vi.fn() };
    useToast.mockReturnValue(toast);
    api.users.updatePreferences.mockRejectedValue(new Error('offline'));
    renderTour('resident', onClose);

    await user.click(screen.getByRole('button', { name: 'Skip tour' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Could not save your onboarding settings: offline',
    ));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Report a problem' })).toBeTruthy();
  });

  it('does not close when saving tour completion fails', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const toast = { error: vi.fn() };
    useToast.mockReturnValue(toast);
    api.users.updatePreferences.mockRejectedValue(new Error('offline'));
    renderTour('resident', onClose);

    await user.click(screen.getByRole('link', { name: 'File a new issue' }));
    for (let index = 0; index < 4; index += 1) {
      await user.click(await screen.findByRole('button', { name: 'Next' }));
    }
    await user.click(await screen.findByRole('button', { name: 'Go to My Reports' }));
    await user.click(await screen.findByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Open My Reports' }));
    await user.click(await screen.findByRole('link', { name: 'Report details' }));
    await user.click(await screen.findByRole('button', { name: 'See report summaries' }));
    await user.click(await screen.findByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('link', { name: 'Notifications' }));
    await user.click(await screen.findByRole('button', { name: 'Finish' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Could not save your onboarding settings: offline',
    ));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Read report updates' })).toBeTruthy();
  });

  it('saves skip without marking onboarding complete', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderTour('resident', onClose);

    await user.click(screen.getByRole('button', { name: 'Skip tour' }));

    expect(api.users.updatePreferences).toHaveBeenCalledWith({
      onboarding_completed: false,
      product_tour_enabled: false,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('uses non-modal semantics and handles Escape through the skip preference', async () => {
    renderTour();
    expect(await screen.findByRole('region', { name: 'Report a problem' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(api.users.updatePreferences).toHaveBeenCalledWith({
      onboarding_completed: false,
      product_tour_enabled: false,
    }));
  });

  describe('ContextualTip', () => {
    it('respects the contextual tips preference and role-specific access', () => {
      sessionStorage.clear();
      useAuth.mockReturnValue({
        user: { role: 'resident', feature_tips_enabled: true },
      });
      const { rerender } = render(
        <MemoryRouter initialEntries={['/community-map']}>
          <ContextualTip />
        </MemoryRouter>,
      );
      expect(screen.getByRole('note')).toBeTruthy();
      expect(screen.getByText(/hotspot analytics are available to authority and admin/i)).toBeTruthy();

      useAuth.mockReturnValue({
        user: { role: 'resident', feature_tips_enabled: false },
      });
      rerender(
        <MemoryRouter initialEntries={['/community-map']}>
          <ContextualTip />
        </MemoryRouter>,
      );
      expect(screen.queryByRole('note')).toBeNull();
    });
  });
});
