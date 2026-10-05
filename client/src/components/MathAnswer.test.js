import React from 'react';
import { render } from '@testing-library/react';
import MathAnswer, {
  KATEX_OPTIONS,
  normalizeAcademicMarkdown,
  normalizeMathDelimiters,
  normalizeQuestionMath,
} from './MathAnswer';

jest.mock('react-markdown', () => {
  const ReactRuntime = require('react');
  return {
    __esModule: true,
    default: ({ children, components = {} }) => {
      const table = String(children).includes('| --- |') && components.table
        ? components.table({
            children: ReactRuntime.createElement(
              'tbody',
              null,
              ReactRuntime.createElement('tr', null, ReactRuntime.createElement('td', null, 'table content'))
            ),
          })
        : null;
      return ReactRuntime.createElement('div', { className: 'markdown-test' }, children, table);
    },
  };
});
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }));
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

test('preserves standard headings, emphasis, bullet lists, and ordered lists', () => {
  const normalized = normalizeAcademicMarkdown(
    '## What to Remember\n\n**Core idea**\n\n- Political\n- Economic\n\n1. Scan\n2. Prioritize'
  );

  expect(normalized).toContain('## What to Remember');
  expect(normalized).toContain('**Core idea**');
  expect(normalized).toContain('- Political\n- Economic');
  expect(normalized).toContain('1. Scan\n2. Prioritize');
});

test('repairs mixed break tags and a malformed GFM separator in a revision checklist', () => {
  const fixture = [
    '## Compact Revision Checklist – PESTLE<br>',
    '| # | What to remember | Quick-recall item |<br>',
    '||---|---|<br/>',
    '| 1 | Political factors | Policy and stability |<br>',
    '| 2 | Economic factors | Inflation and growth |',
  ].join('');
  const normalized = normalizeAcademicMarkdown(fixture);
  const { container } = render(<MathAnswer>{fixture}</MathAnswer>);

  expect(normalized).toContain('## Compact Revision Checklist – PESTLE\n| # | What to remember | Quick-recall item |');
  expect(normalized).toContain('| --- | --- | --- |');
  expect(normalized).toContain('| 1 | Political factors | Policy and stability |');
  expect(container.querySelectorAll('table')).toHaveLength(1);
  expect(container.querySelector('.ps-table-scroll')).toHaveAttribute('tabindex', '0');
  expect(normalized).not.toContain('||---|---|');
});

test('does not corrupt ordinary pipes, inline code, or fenced examples', () => {
  const source = 'Probability P(A | B) and `<br> \\(x\\)` remain text.\n\n```html\n<br>\n```';
  const normalized = normalizeAcademicMarkdown(source);
  const { container } = render(<MathAnswer>{source}</MathAnswer>);

  expect(normalized).toContain('P(A | B)');
  expect(normalized).toContain('`<br> \\(x\\)`');
  expect(normalized).toContain('```html\n<br>\n```');
  expect(container.querySelector('table')).not.toBeInTheDocument();
  expect(container.querySelector('.markdown-test')).toHaveTextContent('<br>');
});

test('passes explicit raw-HTML blocking to the renderer', () => {
  const { container } = render(<MathAnswer>{'Before <script>alert(1)</script> after'}</MathAnswer>);

  expect(container.querySelector('img')).not.toBeInTheDocument();
  expect(container.querySelector('script')).not.toBeInTheDocument();
  expect(container.querySelector('.markdown-test')).toHaveTextContent('Before <script>alert(1)</script> after');
});

test('upgrades extracted powers, subscripts, roots, and algebraic fractions', () => {
  const normalized = normalizeQuestionMath(
    'Find x^2, f_c, sqrt(a+b), and (x+1)/(x-1).'
  );

  expect(normalized).toContain('$x^{2}$');
  expect(normalized).toContain('$f_{c}$');
  expect(normalized).toContain('$\\sqrt{a+b}$');
  expect(normalized).toContain('$\\frac{x+1}{x-1}$');
});

test('preserves explicit math, inline code, fenced code, and ordinary prose', () => {
  const source = [
    'Use `$raw^2$` and keep $y^3$ as authored.',
    '',
    '```text',
    'x^4',
    '```',
    '',
    'The archive/year label stays plain.',
  ].join('\n');
  const normalized = normalizeQuestionMath(source);

  expect(normalized).toContain('`$raw^2$`');
  expect(normalized).toContain('$y^3$');
  expect(normalized).toContain('```text\nx^4\n```');
  expect(normalized).toContain('The archive/year label stays plain.');
});

test('normalizing roots with powers never nests dollar delimiters', () => {
  expect(normalizeQuestionMath('Calculate sqrt(x^2+y^2).')).toBe('Calculate $\\sqrt{x^2+y^2}$.');
  expect(normalizeQuestionMath('Use \\frac{x^2}{4}.')).toBe('Use $\\frac{x^2}{4}$.');
});
