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
  expect(within(primary).queryByText('Questions')).not.toBeInTheDocument();
  expect(within(primary).getByText('Mock Exams')).toBeInTheDocument();
  expect(within(primary).getByText('Practice')).toBeInTheDocument();
  expect(within(primary).getByText('Exams')).toBeInTheDocument();
  expect(within(primary).getByText('Learn')).toBeInTheDocument();
  expect(within(primary).queryByText('Search')).not.toBeInTheDocument();
  expect(within(primary).queryByText('Dashboard')).not.toBeInTheDocument();
  expect(within(primary).queryByText('More')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /toggle theme|dark mode|light mode/i })).not.toBeInTheDocument();
  expect(screen.getAllByRole('searchbox', { name: 'Search PaperStack' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Open site menu' })).toHaveAttribute('aria-controls', 'psnav-feature-menu');

  expect(screen.queryByText('Search All Content')).not.toBeInTheDocument();
  const groups = document.querySelector('.psnav-mobile-groups');
  expect(within(groups).queryByText('Mock Exams')).not.toBeInTheDocument();
  const mainPaths = [...primary.querySelectorAll('a')].map((link) => link.getAttribute('href'));
  expect([...groups.querySelectorAll('a')].some((link) => mainPaths.includes(link.getAttribute('href')))).toBe(false);
  expect(screen.queryByText('My Progress')).not.toBeInTheDocument();
  expect(screen.queryByText('Report Issue')).not.toBeInTheDocument();
  for (const label of [
    'ZIP download',
    'Repeated topics',
    'Top Exam Topics',
    'Revision Notes',
    'Ask PaperStack',
    'Question Library',
    'Upload Notes & Resources',
    'Verify Papers',
    'Branch Rankings',
    'Trending Papers',
    'Student Stories',
  ]) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
});

test('account navigation keeps profile and semester editing inside Dashboard', () => {
  render(<Navbar user={{ name: 'Yogesh Khinchi' }} setUser={() => {}} isAdmin={false} setIsAdmin={() => {}} toast={() => {}} />);

  expect(screen.getAllByText('My Dashboard').length).toBeGreaterThan(0);
  expect(screen.queryByText('Academic preferences')).not.toBeInTheDocument();
  expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /semester|change preferences/i })).not.toBeInTheDocument();
});
