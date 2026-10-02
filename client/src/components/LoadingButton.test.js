import React from 'react';
import { render, screen } from '@testing-library/react';

import LoadingButton from './LoadingButton';

test('exposes an accessible, width-preserving loading state', () => {
  render(
    <LoadingButton loading loadingText="Generating answer…">
      Ask PaperStack
    </LoadingButton>
  );

  const button = screen.getByRole('button', { name: /generating answer/i });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByText('Ask PaperStack')).toHaveClass('is-hidden');
});
