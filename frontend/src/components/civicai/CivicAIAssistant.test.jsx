import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CivicAIAssistant from './CivicAIAssistant';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../services/api', () => ({
  api: {
    civicai: { chat: vi.fn() },
    reference: { getCategories: vi.fn() },
    reports: { create: vi.fn(), updateStatus: vi.fn() },
    updateUserRole: vi.fn(),
  },
}));
vi.mock('../ui/ImageUploadComponent', () => ({ default: ({ onImageChange, image }) => (
  <button type="button" onClick={() => onImageChange({ file: new File(['photo'], 'issue.jpg', { type: 'image/jpeg' }), name: 'issue.jpg' })}>{image ? 'Photo attached' : 'Attach test photo'}</button>
)}));
vi.mock('../ui/MapComponent', () => ({ default: ({ onLocationPick }) => (
  <button type="button" onClick={() => onLocationPick({ lat: -1.28, lon: 36.82 })}>Set map pin</button>
)}));
const originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
const originalSpeechRecognition = Object.getOwnPropertyDescriptor(window, 'SpeechRecognition');
const originalWebkitSpeechRecognition = Object.getOwnPropertyDescriptor(window, 'webkitSpeechRecognition');

describe('CivicAIAssistant', () => {
  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    if (originalGeolocation) Object.defineProperty(navigator, 'geolocation', originalGeolocation);
    else delete navigator.geolocation;
    if (originalSpeechRecognition) Object.defineProperty(window, 'SpeechRecognition', originalSpeechRecognition);
    else delete window.SpeechRecognition;
    if (originalWebkitSpeechRecognition) Object.defineProperty(window, 'webkitSpeechRecognition', originalWebkitSpeechRecognition);
    else delete window.webkitSpeechRecognition;
  });

  it('sends the conversation to the authenticated API and shows its response', async () => {
    useAuth.mockReturnValue({ user: { id: 7, role: 'resident' } });
    api.civicai.chat.mockResolvedValue({ message: 'You have two reports.', actions: [] });
    render(<MemoryRouter><CivicAIAssistant /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Open CivicAI assistant' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message CivicAI' }), {
      target: { value: 'Show my reports' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await screen.findByText('You have two reports.');
    expect(api.civicai.chat).toHaveBeenCalledWith([
      expect.objectContaining({ role: 'assistant' }),
      { role: 'user', content: 'Show my reports' },
    ]);
  });

  it('transcribes a spoken command into the message field and waits for Send', async () => {
    useAuth.mockReturnValue({ user: { id: 11, role: 'resident' } });
    api.civicai.chat.mockResolvedValue({ message: 'I can help with your pothole report.', actions: [] });
    let recognition;
    class MockSpeechRecognition {
      start = vi.fn();
      stop = vi.fn();
      constructor() { recognition = this; }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: MockSpeechRecognition });
    render(<CivicAIAssistant />);

    fireEvent.click(screen.getByRole('button', { name: 'Open CivicAI assistant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));
    expect(recognition.start).toHaveBeenCalledOnce();
    expect(api.civicai.chat).not.toHaveBeenCalled();

    act(() => recognition.onresult({
      resultIndex: 0,
      results: [{ 0: { transcript: 'Report a pothole near the market' }, isFinal: true }],
    }));
    expect(screen.getByRole('textbox', { name: 'Message CivicAI' }).value).toBe('Report a pothole near the market');
    expect(api.civicai.chat).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByText('I can help with your pothole report.');
    expect(api.civicai.chat).toHaveBeenCalledOnce();
  });

  it('starts the actual application tour when the backend requests it', async () => {
    useAuth.mockReturnValue({ user: { id: 8, role: 'resident' } });
    api.civicai.chat.mockResolvedValue({
      message: 'I will guide you through reporting.',
      actions: [{ type: 'start_guided_tour', tour: 'report' }],
    });
    const onTour = vi.fn();
    window.addEventListener('civicpulse:start-guided-tour', onTour);
    render(<CivicAIAssistant />);

    fireEvent.click(screen.getByRole('button', { name: 'Open CivicAI assistant' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message CivicAI' }), {
      target: { value: 'How do I report an issue?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(onTour).toHaveBeenCalledOnce());
    expect(onTour.mock.calls[0][0].detail).toEqual({ tour: 'report' });
    window.removeEventListener('civicpulse:start-guided-tour', onTour);
  });

  it('collects report data and only requests device location after a resident clicks consent', async () => {
    useAuth.mockReturnValue({ user: { id: 9, role: 'resident' } });
    api.reference.getCategories.mockResolvedValue([{ id: 3, name: 'Pothole' }]);
    api.reports.create.mockResolvedValue({ id: 141, status: 'reported' });
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    render(<MemoryRouter><CivicAIAssistant /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Open CivicAI assistant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start report' }));
    await screen.findByRole('combobox', { name: 'Issue category' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Issue category' }), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Report description' }), { target: { value: 'Deep pothole near the bus stop' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Attach test photo' }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Share precise location/ }));
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Set map pin' }));
    fireEvent.click(screen.getByRole('button', { name: /Review/ }));
    await screen.findByText(/Everything look right/);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, submit report' }));

    await screen.findByText('Report #141 was submitted successfully. Its current status is reported.');
    expect(api.reports.create).toHaveBeenCalledWith(expect.any(FormData), { idempotencyKey: expect.any(String) });
  });

  it('requires explicit confirmation before applying a prepared staff status change', async () => {
    useAuth.mockReturnValue({ user: { id: 10, role: 'verifier' } });
    api.civicai.chat.mockResolvedValue({ message: 'I can verify that report.', actions: [{
      type: 'confirm_status_change', report_id: 51, category: 'Pothole', status: 'verified', note: null,
    }] });
    api.reports.updateStatus.mockResolvedValue({ id: 51, status: 'verified' });
    render(<CivicAIAssistant />);
    fireEvent.click(screen.getByRole('button', { name: 'Open CivicAI assistant' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message CivicAI' }), { target: { value: 'Verify report 51' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await screen.findByText(/Change report #51/);
    expect(api.reports.updateStatus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm status change' }));
    await screen.findByText('Report #51 is now verified.');
    expect(api.reports.updateStatus).toHaveBeenCalledWith(51, { status: 'verified', note: null });
  });

  it('requires explicit confirmation before changing a resident role', async () => {
    useAuth.mockReturnValue({ user: { id: 11, role: 'admin' } });
    api.civicai.chat.mockResolvedValue({ message: 'I can prepare that role change.', actions: [{
      type: 'confirm_user_role_change', user_id: 34, user_name: 'Jane Resident',
      current_role: 'resident', role: 'verifier',
    }] });
    api.updateUserRole.mockResolvedValue({ id: 34, name: 'Jane Resident', role: 'verifier' });
    render(<CivicAIAssistant />);
    fireEvent.click(screen.getByRole('button', { name: 'Open CivicAI assistant' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message CivicAI' }), {
      target: { value: 'Change Jane Resident to verifier' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await screen.findByText(/Change Jane Resident's role from resident to verifier/);
    expect(api.updateUserRole).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm role change' }));
    await screen.findByText("Jane Resident's role is now verifier.");
    expect(api.updateUserRole).toHaveBeenCalledWith(34, 'verifier');
  });
});
