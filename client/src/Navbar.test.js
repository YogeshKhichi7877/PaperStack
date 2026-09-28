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
  const { container } = render(<Navbar user={null} setUser={() => {}} isAdmin={false} setIsAdmin={() => {}} toast={() => {}} />);
  const primary = container.querySelector('.psnav-primary');
  expect(within(primary).getByText('Archive')).toBeInTheDocument();
  expect(within(primary).getByText('Contribute')).toBeInTheDocument();
  expect(within(primary).queryByText('Dashboard')).not.toBeInTheDocument();
  expect(within(primary).queryByText('More')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /toggle theme|dark mode|light mode/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open site menu' })).toHaveAttribute('aria-controls', 'psnav-feature-menu');
});
