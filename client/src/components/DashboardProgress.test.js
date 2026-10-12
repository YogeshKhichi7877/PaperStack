import { fireEvent, render, screen } from '@testing-library/react';
import DashboardProgress from './DashboardProgress';
jest.mock('../pages/StreaksBadgesPage', () => ({ __esModule: true, default: ({ embedded }) => <div>Activity calendar {embedded ? 'inside dashboard' : 'standalone'}</div> }));
jest.mock('../pages/LearningDashboardPage', () => ({ __esModule: true, default: ({ user, embedded }) => <div>Mastery for {user.name} {embedded ? 'inside dashboard' : 'standalone'}</div> }));

test('dashboard includes the existing progress view and switches to learning without navigation', async () => {
  render(<DashboardProgress user={{ name: 'Student' }} />);
  expect(await screen.findByText('Activity calendar inside dashboard')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Mastery & reviews' }));
  expect(await screen.findByText('Mastery for Student inside dashboard')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Mastery & reviews' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Mastery & reviews' }), { key: 'ArrowLeft' });
  expect(await screen.findByText('Activity calendar inside dashboard')).toBeInTheDocument();
});
