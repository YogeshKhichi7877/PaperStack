import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './MathAnswer.css';

function normalizeMathDelimiters(value) {
  return String(value || '')
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);
}

export default function MathAnswer({ children }) {
  return (
    <div className="ps-math-answer">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, throwOnError: false }]]}>
        {normalizeMathDelimiters(children)}
      </ReactMarkdown>
    </div>
  );
}
