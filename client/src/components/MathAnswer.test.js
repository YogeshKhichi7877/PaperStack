import React from 'react';
import { render } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import MathAnswer from './MathAnswer';

jest.mock('react-markdown', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: jest.fn(({ children }) => React.createElement('div', { 'data-testid': 'markdown' }, children)),
  };
});
jest.mock('remark-math', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('rehype-katex', () => ({ __esModule: true, default: jest.fn() }));

test('normalizes both math delimiter styles for Markdown rendering', () => {
  render(<MathAnswer>{'\\(x^2\\) and \\[\\begin{bmatrix}1 & 2\\\\3 & 4\\end{bmatrix}\\]'}</MathAnswer>);
  const markdown = ReactMarkdown.mock.calls[0][0].children;

  expect(markdown).toContain('$x^2$');
  expect(markdown).toContain('$$\n\\begin{bmatrix}1 & 2\\\\3 & 4\\end{bmatrix}\n$$');
});

test('disables trusted links and HTML in KaTeX rendering', () => {
  render(<MathAnswer>{'$\\href{javascript:alert(1)}{click}$'}</MathAnswer>);
  const props = ReactMarkdown.mock.calls[0][0];
  expect(props.rehypePlugins[0][1]).toMatchObject({ trust: false, throwOnError: false });
});
