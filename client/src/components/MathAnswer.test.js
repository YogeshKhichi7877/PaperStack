import React from 'react';
import { render } from '@testing-library/react';
import MathAnswer, { KATEX_OPTIONS, normalizeMathDelimiters } from './MathAnswer';

jest.mock('react-markdown', () => {
  const ReactRuntime = require('react');
  return {
    __esModule: true,
    default: ({ children }) => ReactRuntime.createElement('div', { className: 'markdown-test' }, children),
  };
});
jest.mock('remark-math', () => ({ __esModule: true, default: () => {} }));
jest.mock('rehype-katex', () => ({ __esModule: true, default: () => {} }));

test('normalizes both math delimiter styles for Markdown rendering', () => {
  const markdown = normalizeMathDelimiters(
    '\\(x^2\\) and \\[\\begin{bmatrix}1 & 2\\\\3 & 4\\end{bmatrix}\\]'
  );

  expect(markdown).toContain('$x^2$');
  expect(markdown).toContain('$$\n\\begin{bmatrix}1 & 2\\\\3 & 4\\end{bmatrix}\n$$');
});

test('disables trusted links and HTML in KaTeX rendering', () => {
  const { container } = render(<MathAnswer>{'$x^2$'}</MathAnswer>);
  expect(container.querySelector('.ps-math-answer')).toHaveTextContent('$x^2$');
  expect(KATEX_OPTIONS).toMatchObject({ trust: false, throwOnError: false });
});
