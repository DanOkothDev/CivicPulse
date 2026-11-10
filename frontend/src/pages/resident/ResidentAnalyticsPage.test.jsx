import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import ResidentAnalyticsPage from './ResidentAnalyticsPage';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({ api: { analytics: { getLeaderboard: vi.fn(), getPublic: vi.fn() } } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('ResidentAnalyticsPage', () => {
  it('shows aggregate community stats, scoring rules and anonymized rankings', async () => {
    api.analytics.getLeaderboard.mockResolvedValue({
      scoring: '10 points per verified report.',
      entries: [{ rank: 1, display_name: 'A Civic Resident', verified_contributions: 2, points: 20, badges: [] }],
      my_stats: { rank: 1, verified_contributions: 2, points: 20 },
    });
    api.analytics.getPublic.mockResolvedValue({ scope: 'Nairobi', total_reports: 8, resolved_reports: 3, unresolved_reports: 5, by_category: [], trends: [] });
    render(<ResidentAnalyticsPage />);
    expect(await screen.findByText('A Civic Resident')).toBeTruthy();
    expect(await screen.findByText('8')).toBeTruthy();
    expect(screen.getByText('10 points per verified report.')).toBeTruthy();
    await waitFor(() => expect(api.analytics.getLeaderboard).toHaveBeenCalledWith('all_time'));
  });
});
