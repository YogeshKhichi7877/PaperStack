import { act, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import axios from 'axios';
import App from './App';

jest.mock('axios', () => {
  const request = jest.fn(() => Promise.resolve({ data: [] }));
  const client = {
    get: request,
    post: request,
    put: request,
    delete: request,
    interceptors: { response: { use: jest.fn(), eject: jest.fn() } },
  };
  return { __esModule: true, ...client, default: client };
});

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ path, element }) => path === '/' ? <div>{element}</div> : null,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
}), { virtual: true });

jest.mock('recharts', () => ({
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: ({ children }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Cell: () => null,
}), { virtual: true });

test('renders PaperStack shell', async () => {
  axios.get.mockImplementation(() => Promise.resolve({ data: [] }));
  await act(async () => {
    render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    );
  });

  expect(screen.getAllByText(/PaperStack/i).length).toBeGreaterThan(0);
});
