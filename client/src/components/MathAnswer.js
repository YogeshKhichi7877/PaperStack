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

export default function MathAnswer({ children }) {
  return (
    <div className="ps-math-answer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, KATEX_OPTIONS]]}
        skipHtml
        components={{
          table: ({ node, ...props }) => (
            <div className="ps-table-scroll" tabIndex={0} aria-label="Scrollable answer table">
              <table {...props} />
            </div>
          ),
        }}
      >
        {normalizeAcademicMarkdown(children)}
      </ReactMarkdown>
    </div>
  );
}
