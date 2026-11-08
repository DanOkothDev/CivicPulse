import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import ResidentProfilePage from './ResidentProfilePage';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../services/api', () => ({
  api: {
    users: { updatePreferences: vi.fn() },
    reports: { list: vi.fn() },
    reference: { getAreas: vi.fn() },
  },
}));

const renderProfile = (role = 'resident') => {
  const refreshUser = vi.fn().mockResolvedValue(null);
  useAuth.mockReturnValue({
    user: {
      id: 7,
      name: 'Ada',
      email: 'ada@example.test',
      role,
      area_id: null,
      product_tour_enabled: true,
      feature_tips_enabled: true,
    },
    refreshUser,
  });
  return {
    refreshUser,
    ...render(
      <MemoryRouter>
        <ResidentProfilePage />
      </MemoryRouter>,
    ),
  };
};

describe('App Guide & Preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ error: vi.fn() });
    api.users.updatePreferences.mockResolvedValue({});
    api.reports.list.mockResolvedValue({ items: [] });
    api.reference.getAreas.mockResolvedValue([]);
  });

  it('shows a role-specific feature guide with usage instructions', async () => {
    const user = userEvent.setup();
    renderProfile('resident');
    await user.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByText('Report an issue')).toBeTruthy();
    expect(screen.getByText(/Choose Report from navigation/i)).toBeTruthy();
    expect(screen.getByText('Community map')).toBeTruthy();
    expect(screen.queryByText('User and role management')).toBeNull();
  });

  it('shows admin tools but keeps unavailable tools out of the authority guide', async () => {
    const user = userEvent.setup();
    const authority = renderProfile('authority');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByText('Assigned reports')).toBeTruthy();
    expect(screen.queryByText('Analytics and hotspots')).toBeNull();
    authority.unmount();

    renderProfile('admin');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByText('User and role management')).toBeTruthy();
    expect(screen.getByText('Report assignment')).toBeTruthy();
    expect(screen.getByText('Analytics and hotspots')).toBeTruthy();
  });

  it('serializes preference toggle requests and persists the setting', async () => {
    const user = userEvent.setup();
    let resolveUpdate;
    api.users.updatePreferences.mockImplementation(
      () => new Promise((resolve) => { resolveUpdate = resolve; }),
    );
    renderProfile();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const toggle = screen.getByRole('button', { name: 'Toggle product tour' });

    await user.click(toggle);
    expect(toggle.disabled).toBe(true);
    fireEvent.click(toggle);
    expect(api.users.updatePreferences).toHaveBeenCalledTimes(1);
    expect(api.users.updatePreferences).toHaveBeenCalledWith({ product_tour_enabled: false });

    resolveUpdate({});
    await waitFor(() => expect(toggle.disabled).toBe(false));
  });

  it('replay enables the product tour and resets completion before opening it', async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const openTour = vi.fn();
    window.addEventListener('civicpulse:open-onboarding', openTour);

    await user.click(screen.getByRole('button', { name: 'Replay User Journey' }));

    await waitFor(() => expect(api.users.updatePreferences).toHaveBeenCalledWith({
      product_tour_enabled: true,
      onboarding_completed: false,
    }));
    expect(openTour).toHaveBeenCalledOnce();
    window.removeEventListener('civicpulse:open-onboarding', openTour);
  });
});
