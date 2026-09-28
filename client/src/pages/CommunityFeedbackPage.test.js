import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { TestimonialsPage } from './CommunityFeedbackPage';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  MemoryRouter: ({ children }) => <>{children}</>,
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
const review = { _id: 'one', displayName: 'A student', message: 'Useful papers for exam preparation.', rating: 4, createdAt: '2026-09-01' };
beforeEach(() => { jest.clearAllMocks(); axios.get.mockResolvedValue({ data: { items: [review], hasMore: false, page: 1 } }); });

test('shows saved ratings and submits the selected stars', async () => {
  axios.post.mockResolvedValue({ data: {} });
  render(<MemoryRouter><TestimonialsPage user={{ name: 'Student' }} /></MemoryRouter>);
  expect(await screen.findByLabelText('4 out of 5 stars')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: '3 stars' }));
  expect(screen.getByRole('radio', { name: '3 stars' })).toBeChecked();
  fireEvent.change(screen.getByLabelText('Your experience'), { target: { value: 'Finding past papers is so much easier now.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Share experience' }));
  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/testimonials'), expect.objectContaining({ rating: 3 }), expect.any(Object)));
  expect(await screen.findByText('Thank you. Your experience is now visible.')).toBeInTheDocument();
});

test('loads older reviews and does not invent ratings for legacy reviews', async () => {
  axios.get.mockResolvedValueOnce({ data: { items: [review], hasMore: true, page: 1 } }).mockResolvedValueOnce({ data: { items: [{ ...review, _id: 'two', displayName: 'Earlier student', rating: null }], hasMore: false, page: 2 } });
  render(<MemoryRouter><TestimonialsPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Load more reviews' }));
  expect(await screen.findByText('Earlier student')).toBeInTheDocument();
  expect(screen.getByText('Not rated')).toBeInTheDocument();
  expect(axios.get).toHaveBeenLastCalledWith(expect.stringContaining('page=2'));
});

test('offers retry when reviews fail to load', async () => {
  axios.get.mockRejectedValueOnce(new Error('Offline'));
  render(<MemoryRouter><TestimonialsPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('A student')).toBeInTheDocument();
});
