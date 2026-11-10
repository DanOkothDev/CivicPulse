import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminAnalyticsDashboard from './AdminAnalyticsDashboard';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({ api: { analytics: { getSummary: vi.fn(), getTrends: vi.fn(), getQuarterlyDigests: vi.fn(), sendQuarterlyDigests: vi.fn() } } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'admin', county_id: null } }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const summary = {
  total_reports: 15, resolved_reports: 9, open_reports: 6, avg_days_to_resolve: 4.2,
  awaiting_verification: 2, awaiting_assignment: 1, overdue_reports: 1,
  by_category: { Pothole: 8, Drainage: 7 },
  by_department: [{ department_id: 2, department: 'Public Works', county: 'Nairobi', total_reports: 10, open_reports: 3 }],
  by_county: [
    { county_id: 1, county_name: 'Nairobi', total_reports: 10, resolved_reports: 7, resolution_rate: 70, open_reports: 3, overdue_reports: 1, avg_days_to_resolve: 4 },
    { county_id: 2, county_name: 'Kisumu', total_reports: 5, resolved_reports: 2, resolution_rate: 40, open_reports: 3, overdue_reports: 0, avg_days_to_resolve: 5 },
  ],
};

describe('AdminAnalyticsDashboard', () => {
  it('compares county performance and exposes a selectable trend period', async () => {
    api.analytics.getSummary.mockResolvedValue(summary);
    api.analytics.getTrends.mockImplementation(async (days) => ({ days, daily_reports: [{ date: '2026-11-10', count: 2 }] }));
    api.analytics.getQuarterlyDigests.mockResolvedValue([]);
    render(<AdminAnalyticsDashboard />);
    expect(await screen.findByText('County performance comparison')).toBeTruthy();
    expect(within(screen.getAllByRole('table')[0]).getByRole('columnheader', { name: 'Nairobi' })).toBeTruthy();
    expect(within(screen.getAllByRole('table')[0]).getByRole('columnheader', { name: 'Kisumu' })).toBeTruthy();
    expect(screen.getByText('70.0%')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Trend period'), { target: { value: '365' } });
    await waitFor(() => expect(api.analytics.getTrends).toHaveBeenLastCalledWith(365));
  });

  it('lets a national admin send the previous quarter once from the admin analytics view', async () => {
    api.analytics.getSummary.mockResolvedValue(summary);
    api.analytics.getTrends.mockResolvedValue({ daily_reports: [] });
    api.analytics.getQuarterlyDigests.mockResolvedValue([]);
    api.analytics.sendQuarterlyDigests.mockResolvedValue({ recipient_count: 2 });
    render(<AdminAnalyticsDashboard />);
    const button = await screen.findByRole('button', { name: 'Send last quarter' });
    fireEvent.click(button);
    expect((await screen.findByRole('status')).textContent).toContain('sent in CivicPulse to 2 admins');
    await waitFor(() => expect(api.analytics.sendQuarterlyDigests).toHaveBeenCalledOnce());
  });

  it('surfaces county standing, national benchmarks and category movement in delivered briefs', async () => {
    api.analytics.getSummary.mockResolvedValue(summary);
    api.analytics.getTrends.mockResolvedValue({ daily_reports: [] });
    api.analytics.getQuarterlyDigests.mockResolvedValue([{
      id: 4, period_start: '2026-07-01', period_end: '2026-09-30', sent_at: '2026-10-02T12:00:00Z', sent_by: 'National Admin',
      snapshot: {
        scope: 'Nairobi', total_reports: 12, resolution_rate: 75, resolved_reports: 9,
        open_reports: 2, rejected_reports: 1, avg_days_to_resolve: 3.5,
        county_rank: 2, ranked_counties: 47, national_median_resolution_rate: 61,
        national_resolution_rate: 64, ranking_basis: 'Resolution rate from quarterly submissions.',
        insights: ['Nairobi ranked #2 of 47 counties by resolution rate.'],
        category_changes: [{ category: 'Pothole', change: 4 }],
        national_leaders: [{ county_id: 1, county: 'Nairobi', rank: 2, resolution_rate: 75, total_reports: 12 }],
        quarter_over_quarter: { reports_change_percent: 8, reports_change: 1, resolution_rate_change_points: 5, avg_days_to_resolve_change: -1 },
      },
    }]);
    render(<AdminAnalyticsDashboard />);
    expect(await screen.findByText('County leaders')).toBeTruthy();
    expect(screen.getByText('Fastest-growing issue categories')).toBeTruthy();
    expect(screen.getByText('Nairobi ranked #2 of 47 counties by resolution rate.')).toBeTruthy();
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
  });
});
