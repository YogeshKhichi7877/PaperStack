import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AcademicAiActions from './AcademicAiActions';

jest.mock('../services/productAnalyticsApi', () => ({ trackProductEvent: () => Promise.resolve() }));

test('offers compact primary actions and expands secondary study actions', () => {
  const onAction = jest.fn();
  render(<AcademicAiActions onAction={onAction} />);
  fireEvent.click(screen.getByRole('button', { name: /Explain/i }));
  expect(onAction.mock.calls[0][0].key).toBe('explain');
  fireEvent.click(screen.getByRole('button', { name: /More/i }));
  expect(screen.getByRole('button', { name: /Practice 5/i })).toBeInTheDocument();
});
