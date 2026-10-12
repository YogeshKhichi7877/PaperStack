import { act, fireEvent, render } from '@testing-library/react';
import PresenceTracker from './PresenceTracker';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/practice', search: '?sessionId=secret&subjectCode=CS302' }) }), { virtual: true });

beforeEach(() => {
  jest.useFakeTimers(); localStorage.clear(); sessionStorage.clear();
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => 'fixture-1234567890123456' } });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  global.fetch = jest.fn().mockResolvedValue({ status: 204 });
});
afterEach(() => { jest.useRealTimers(); delete global.fetch; });
const tick = async (ms) => { await act(async () => { jest.advanceTimersByTime(ms); await Promise.resolve(); }); };
test('heartbeats pause when hidden or idle, resume on interaction, and clean up', async () => {
  const view = render(<PresenceTracker user={null} isAdmin={false} />);
  await tick(0);
  expect(fetch).toHaveBeenCalledTimes(1);
  const payload = JSON.parse(fetch.mock.calls[0][1].body);
  expect(payload.route).toBe('/practice'); expect(payload).not.toHaveProperty('userId');
  expect(JSON.stringify(payload)).not.toContain('secret');
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  await tick(90000); expect(fetch).toHaveBeenCalledTimes(1);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  await act(async () => fireEvent(document, new Event('visibilitychange')));
  expect(fetch).toHaveBeenCalledTimes(2);
  await tick(300000);
  const idleCount = fetch.mock.calls.length;
  await tick(120000); expect(fetch).toHaveBeenCalledTimes(idleCount);
  await act(async () => fireEvent.pointerDown(window));
  expect(fetch).toHaveBeenCalledTimes(idleCount + 1);
  view.unmount(); await tick(90000); expect(fetch).toHaveBeenCalledTimes(idleCount + 1);
});
test('auth transitions reuse session identity and admin requests use existing admin token', async () => {
  const view = render(<PresenceTracker user={null} isAdmin={false} />); await tick(0);
  const session = JSON.parse(fetch.mock.calls[0][1].body).sessionId;
  localStorage.setItem('token', 'student-token');
  view.rerender(<PresenceTracker user={{ _id: 'u1' }} isAdmin={false} />); await tick(0);
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer student-token');
  expect(JSON.parse(fetch.mock.calls[1][1].body).sessionId).toBe(session);
  sessionStorage.setItem('adminToken', 'admin-token');
  view.rerender(<PresenceTracker user={{ _id: 'u1' }} isAdmin />); await tick(0);
  expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer admin-token');
  expect(fetch.mock.calls[2][1].headers['X-Presence-Admin']).toBe('1');
});
