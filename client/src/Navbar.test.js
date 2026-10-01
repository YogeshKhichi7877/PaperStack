import { render, screen, within } from '@testing-library/react';
import { Navbar } from './App';

jest.mock('react-router-dom', () => ({
  MemoryRouter: ({ children }) => <div>{children}</div>,
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => <div>{element}</div>,
}), { virtual: true });

jest.mock('./components/ProductAnalyticsTracker', () => () => null);
jest.mock('./components/StudyActivityTracker', () => () => null);
jest.mock('./components/NotificationNavButton', () => () => null);

test('primary navigation has no Dashboard, More, or theme toggle', () => {
  render(<Navbar user={null} setUser={() => {}} isAdmin={false} setIsAdmin={() => {}} toast={() => {}} />);
  const primary = screen.getByLabelText('Primary navigation');
  expect(within(primary).getByText('Archive')).toBeInTheDocument();
  expect(within(primary).getByText('Ask PaperStack')).toBeInTheDocument();
  expect(within(primary).queryByText('Search')).not.toBeInTheDocument();
  expect(within(primary).getByText('Contribute')).toBeInTheDocument();
  expect(within(primary).queryByText('Dashboard')).not.toBeInTheDocument();
  expect(within(primary).queryByText('More')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /toggle theme|dark mode|light mode/i })).not.toBeInTheDocument();
  expect(screen.getAllByRole('searchbox', { name: 'Search PaperStack' })).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Open site menu' })).toHaveAttribute('aria-controls', 'psnav-feature-menu');
});

test('account navigation keeps profile and semester editing inside Dashboard', () => {
  render(<Navbar user={{ name: 'Yogesh Khinchi' }} setUser={() => {}} isAdmin={false} setIsAdmin={() => {}} toast={() => {}} />);

  expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
  expect(screen.queryByText('Academic preferences')).not.toBeInTheDocument();
  expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /semester|change preferences/i })).not.toBeInTheDocument();
});
