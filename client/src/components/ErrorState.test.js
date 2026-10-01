import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary, { ErrorState } from './ErrorState';

test('404 offers working destinations', () => {
  render(<ErrorState notFound />);
  expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Browse archive' })).toHaveAttribute('href', '/archive');
});

test('render failures show a recovery screen', () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  function BrokenPage() { throw new Error('Test render failure'); }
  try {
    render(<ErrorBoundary><BrokenPage /></ErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'Something went wrong.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  } finally { log.mockRestore(); }
});

test('recovery screen retries and links to support', () => {
  const onRetry = jest.fn();
  render(<ErrorState onRetry={onRetry} />);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('link', { name: 'Report Issue' })).toHaveAttribute('href', '/report');
});
