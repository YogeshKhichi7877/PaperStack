import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import PaperStackHomePage from './PaperStackHomePage';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });

jest.mock('axios');
jest.mock('../services/contributorApi', () => ({ getContributorLeaderboard: () => Promise.resolve([]) }));

test('home does not render student voices when there are no real testimonials', async () => {
  axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('analytics') ? {} : [] }));
  render(<PaperStackHomePage user={null} />);
  await screen.findByText('Open Archive');
  expect(screen.getByText('Global Views')).toBeInTheDocument();
  expect(screen.getByText('Global Downloads')).toBeInTheDocument();
  expect(screen.queryByText('From the students')).not.toBeInTheDocument();
});

test('home rotates the newest five reviews and refreshes when the tab regains focus', async () => {
  let reviews = Array.from({ length: 6 }, (_, index) => ({
    _id: String(index),
    displayName: `Student ${index}`,
    message: `Review message ${index}`,
    rating: 5 - (index % 5),
    createdAt: new Date(2026, 8, 28 - index).toISOString(),
  }));
  axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('testimonials') ? reviews : url.includes('analytics') ? {} : [] }));

  render(<PaperStackHomePage user={null} />);
  await screen.findByRole('heading', { name: 'Latest student stories' });
  expect(screen.getAllByRole('blockquote')).toHaveLength(5);
  expect(screen.queryByText('Review message 5')).not.toBeInTheDocument();
  expect(screen.getAllByRole('blockquote')[0]).toHaveTextContent('Review message 0');
  expect(screen.getAllByLabelText('5 out of 5 stars')).toHaveLength(1);

  fireEvent.click(screen.getByRole('button', { name: 'Next review' }));
  expect(screen.getAllByRole('blockquote')[0]).toHaveTextContent('Review message 1');

  reviews = [{ _id: 'new', displayName: 'New Student', message: 'A newly shared experience.', rating: 5, createdAt: new Date().toISOString() }, ...reviews];
  fireEvent.focus(window);
  await waitFor(() => expect(screen.getAllByRole('blockquote')[0]).toHaveTextContent('A newly shared experience.'));
  expect(screen.getAllByRole('blockquote')).toHaveLength(5);
});
