import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './MathAnswer.css';

export const KATEX_OPTIONS = Object.freeze({ trust: false, throwOnError: false });

function mapOutsideFences(value, transform) {
  const lines = String(value || '').replace(/\r\n?/g, '\n').split('\n');
  let fence = '';
  let buffer = [];
  const output = [];

  const flush = () => {
    if (!buffer.length) return;
    output.push(fence ? buffer.join('\n') : transform(buffer.join('\n')));
    buffer = [];
  };

  lines.forEach((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      const candidate = marker[1][0];
      if (!fence) {
        flush();
        fence = candidate;
        buffer.push(line);
        return;
      }
      buffer.push(line);
      if (fence === candidate) {
        flush();
        fence = '';
      }
      return;
    }
    buffer.push(line);
  });
  flush();
  return output.join('\n');
}

function mapOutsideInlineCode(value, transform) {
  return String(value || '')
    .split(/(`+[^`\n]*`+)/g)
    .map((part, index) => (index % 2 ? part : transform(part)))
    .join('');
}

function mapOutsideDollarMath(value, transform) {
  return String(value || '')
    .split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g)
    .map((part, index) => (index % 2 ? part : transform(part)))
    .join('');
}

export function normalizeMathDelimiters(value) {
  return mapOutsideFences(value, (block) => mapOutsideInlineCode(block, (text) => text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`)));
}

function tableCells(line) {
  const value = String(line || '').trim();
  if (!value.startsWith('|') || !value.endsWith('|')) return [];
  return value.slice(1, -1).split('|').map((cell) => cell.trim());
}

function normalizeTableSeparators(value) {
  const lines = value.split('\n');
  return lines.map((line, index) => {
    const cells = tableCells(line);
    const header = tableCells(lines[index - 1]);
    if (
      header.length < 2 ||
      cells.length < 2 ||
      !cells.some((cell) => /^:?-{3,}:?$/.test(cell)) ||
      !cells.every((cell) => !cell || /^:?-{3,}:?$/.test(cell))
    ) {
      return line;
    }

    const separators = header.map((_, cellIndex) => {
      const cell = cells[cellIndex] || '---';
      const left = cell.startsWith(':') ? ':' : '';
      const right = cell.endsWith(':') ? ':' : '';
      return `${left}---${right}`;
    });
    return `| ${separators.join(' | ')} |`;
  }).join('\n');
}

export function normalizeAcademicMarkdown(value) {
  const withBreaks = mapOutsideFences(value, (block) => mapOutsideInlineCode(block, (text) => text
    .replace(/(?:[ \t]*<br\s*\/?>(?:[ \t]*)){2,}/gi, '\n\n')
    .replace(/[ \t]*<br\s*\/?>[ \t]*/gi, '\n')));

  return mapOutsideFences(
    normalizeMathDelimiters(withBreaks),
    normalizeTableSeparators
  );
}

function normalizeScriptNotation(value) {
  return String(value || '')
    .replace(/\^\s*\(([^()\n]+)\)/g, '^{$1}')
    .replace(/_\s*\(([^()\n]+)\)/g, '_{$1}')
    .replace(/([_^])\s*([-+]?[A-Za-z0-9]+)/g, '$1{$2}');
}

function wrapDetectedQuestionMath(value) {
  // Wrap raw LaTeX before looking for plain powers so expressions such as
  // \frac{x^2}{\sqrt{4}} stay in one math span, including nested braces.
  let output = mapOutsideDollarMath(value, (text) => {
    const commands = /\\(?:frac|sqrt|sum|prod|int|lim|theta|alpha|beta|gamma|delta|lambda|mu|sigma|pi|infty|partial|nabla|times|cdot|leq|geq|neq|subset|cup|cap)\b/g;
    let result = '';
    let cursor = 0;
    let match;
    while ((match = commands.exec(text))) {
      let end = commands.lastIndex;
      while (end < text.length) {
        const next = text.slice(end).match(/^\s*(?:\{|[_^])/);
        if (!next) break;
        let start = end + next[0].length - 1;
        if (text[start] === '_' || text[start] === '^') {
          start += 1;
          while (/\s/.test(text[start] || '') && start < text.length) start += 1;
          if (text[start] !== '{') {
            const script = text.slice(start).match(/^[+-]?[A-Za-z0-9]+/);
            if (!script) break;
            end = start + script[0].length;
            continue;
          }
        }
        let depth = 1;
        let position = start + 1;
        for (; position < text.length && depth; position += 1) {
          if (text[position] === '{') depth += 1;
          if (text[position] === '}') depth -= 1;
        }
        if (depth) break;
        end = position;
      }
      result += `${text.slice(cursor, match.index)}$${text.slice(match.index, end)}$`;
      cursor = end;
      commands.lastIndex = end;
    }
    return result + text.slice(cursor);
  });

  // Preserve authored prose while upgrading the high-confidence notation that
  // commonly survives PDF extraction as plain text.
  output = mapOutsideDollarMath(output, (text) => text.replace(
    /(^|[^\w$\\])((?:sqrt\s*\([^()\n]+\)|√\s*(?:\([^()\n]+\)|[A-Za-z0-9]+)))/gi,
    (match, prefix, expression) => {
      const normalized = expression
        .replace(/^sqrt\s*\(([^()\n]+)\)$/i, '\\sqrt{$1}')
        .replace(/^√\s*\(([^()\n]+)\)$/, '\\sqrt{$1}')
        .replace(/^√\s*([A-Za-z0-9]+)$/, '\\sqrt{$1}');
      return `${prefix}$${normalized}$`;
    }
  ));

  output = mapOutsideDollarMath(output, (text) => text.replace(
    /(^|[^\w$\\])((?:[A-Za-z][A-Za-z0-9]*|\d+(?:\.\d+)?)(?:\s*[\^_]\s*(?:\([^()\n]+\)|\{[^{}\n]+\}|[-+]?[A-Za-z0-9]+))+)/g,
    (match, prefix, expression) => `${prefix}$${normalizeScriptNotation(expression)}$`
  ));

  output = mapOutsideDollarMath(output, (text) => text.replace(
    /(^|[^\w$\\])(\([^()\n]{1,48}\)|[A-Za-z])\s*\/\s*(\([^()\n]{1,48}\)|[A-Za-z])(?=$|[^\w])/g,
    (match, prefix, numerator, denominator) => {
      const unwrap = (part) => part.startsWith('(') && part.endsWith(')')
        ? part.slice(1, -1)
        : part;
      return `${prefix}$\\frac{${unwrap(numerator)}}{${unwrap(denominator)}}$`;
    }
  ));

  return output;
}

export function normalizeQuestionMath(value) {
  const normalized = normalizeAcademicMarkdown(value);
  return mapOutsideFences(normalized, (block) => mapOutsideInlineCode(
    block,
    (text) => mapOutsideDollarMath(text, wrapDetectedQuestionMath)
  ));
}

export default function MathAnswer({
  children,
  className = '',
  inline = false,
  normalizePlainMath = false,
}) {
  const classes = ['ps-math-answer', className].filter(Boolean).join(' ');
  const Wrapper = inline ? 'span' : 'div';
  return (
    <Wrapper className={classes}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, KATEX_OPTIONS]]}
        skipHtml
        components={{
          ...(inline
            ? { p: ({ children: paragraphChildren }) => <>{paragraphChildren}</> }
            : {}),
          table: ({ node, ...props }) => (
            <div className="ps-table-scroll" tabIndex={0} aria-label="Scrollable answer table">
              <table {...props} />
            </div>
          ),
        }}
      >
        {normalizePlainMath
          ? normalizeQuestionMath(children)
          : normalizeAcademicMarkdown(children)}
      </ReactMarkdown>
    </Wrapper>
  );
}
