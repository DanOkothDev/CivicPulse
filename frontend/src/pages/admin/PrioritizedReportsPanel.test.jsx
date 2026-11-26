import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../../services/api';
import PrioritizedReportsPanel from './PrioritizedReportsPanel';

vi.mock('../../services/api', () => ({ api: { prioritization: { list: vi.fn() } } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const item = (id, level = 'High', score = 76) => ({
  id,
  status: 'reported',
  category: { name: 'Pothole' },
  description: `Pothole #${id}`,
  address: 'Main Street',
  recommendation: {
    level, score, days_open: 20, confirmed_report_count: 3,
    age_contribution: 40, frequency_contribution: 20,
    explanations: ['Open for 20.0 days, contributing 40.0 of 60 age points.',
      '3 confirmed reports in this issue, contributing 20.0 of 40 frequency points.'],
    limitations: [],
  },
});

const response = (items = [item(8)], overrides = {}) => ({
  items, page: 1, per_page: 10, total: items.length, pages: 1,
  summary: { High: 2, Medium: 1, Low: 0 }, ...overrides,
});

function renderPanel() {
  return render(<MemoryRouter><PrioritizedReportsPanel /></MemoryRouter>);
}

describe('PrioritizedReportsPanel', () => {
  it('shows loading, scores, explanations, summary and existing report links', async () => {
    let resolve;
    api.prioritization.list.mockReturnValue(new Promise((done) => { resolve = done; }));
    renderPanel();
    expect(screen.getByRole('status').textContent).toContain('Loading');
    resolve(response([item(8, 'High', 76)]));
    expect(await screen.findByText('High · 76/100')).toBeTruthy();
    expect(screen.getByText(/Open for 20.0 days/)).toBeTruthy();
    expect(screen.getByText(/3 confirmed reports in this issue/)).toBeTruthy();
    expect(screen.getByLabelText('High recommendation count').textContent).toBe('2');
    expect(screen.getByRole('link', { name: /View and manage/ }).getAttribute('href')).toBe('/reports/8');
    expect(screen.getByText(/severity and location impact are not currently measured/i)).toBeTruthy();
  });

  it('shows empty results and displays an error with retry', async () => {
    api.prioritization.list.mockResolvedValueOnce(response([]));
    renderPanel();
    expect(await screen.findByText('No matching open reports')).toBeTruthy();

    cleanup();
    api.prioritization.list.mockRejectedValueOnce(new Error('Access denied'));
    renderPanel();
    expect((await screen.findByRole('alert')).textContent).toContain('Access denied');
    api.prioritization.list.mockResolvedValueOnce(response([]));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(api.prioritization.list).toHaveBeenCalledTimes(3));
  });

  it('sends priority and status filters and supports paging', async () => {
    api.prioritization.list.mockResolvedValue(response([item(8)], { total: 11, pages: 2 }));
    renderPanel();
    await screen.findByText('High · 76/100');
    fireEvent.change(screen.getByLabelText('Filter by priority level'), { target: { value: 'Medium' } });
    await waitFor(() => expect(api.prioritization.list).toHaveBeenLastCalledWith({
      page: 1, per_page: 10, level: 'Medium', status: '',
    }));
    fireEvent.change(screen.getByLabelText('Filter by report status'), { target: { value: 'assigned' } });
    await waitFor(() => expect(api.prioritization.list).toHaveBeenLastCalledWith({
      page: 1, per_page: 10, level: 'Medium', status: 'assigned',
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(api.prioritization.list).toHaveBeenLastCalledWith({
      page: 2, per_page: 10, level: 'Medium', status: 'assigned',
    }));
  });
});
