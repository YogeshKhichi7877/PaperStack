import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import PaperStackHomePage from './PaperStackHomePage';
import { getLearningDashboard } from '../services/learningApi';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });

jest.mock('axios');
jest.mock('../services/contributorApi', () => ({ getContributorLeaderboard: () => Promise.resolve([]) }));
jest.mock('../services/learningApi', () => ({
  getLearningDashboard: jest.fn(() => Promise.resolve({
    dueReviews: [{ topicKey: 'os:semaphore' }],
    mastery: [{ topicKey: 'os:semaphore', topicName: 'Semaphore', masteryScore: 42 }],
  })),
}));

beforeEach(() => {
  axios.get.mockReset();
  getLearningDashboard.mockResolvedValue({
    dueReviews: [{ topicKey: 'os:semaphore' }, { topicKey: 'dbms:indexing' }],
    mastery: [{ topicKey: 'os:semaphore', topicName: 'Semaphore', masteryScore: 42 }],
  });
});
test('guest home preserves the original archive discovery experience', async () => {
  axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('analytics') ? {} : [] }));
  render(<PaperStackHomePage user={null} />);
  await screen.findByText('Open Archive');
  expect(screen.getByText('Global Views')).toBeInTheDocument();
  expect(screen.getByText('Global Downloads')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Find a paper/i })).toHaveAttribute('href', '/archive');
  expect(screen.queryByRole('heading', { name: 'Continue learning' })).not.toBeInTheDocument();
  expect(screen.queryByText('From the students')).not.toBeInTheDocument();
});
test('signed-in home adds a compact Continue learning section without replacing archive sections', async () => {
  axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('analytics') ? {} : [] }));
  render(<PaperStackHomePage user={{ name: 'Yogesh' }} />);
  expect(await screen.findByRole('heading', { name: 'Continue learning' })).toBeInTheDocument();
  expect(screen.getByText(/2 reviews due/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Log today’s learning/i })).toHaveAttribute('href', '/learn');
  expect(screen.getByText('Open Archive')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /All Semester Subjects/i })).toBeInTheDocument();
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
