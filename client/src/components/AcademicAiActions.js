import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { trackProductEvent } from '../services/productAnalyticsApi';

export const ACADEMIC_AI_ACTIONS = [
  { key: 'explain', label: 'Explain', query: 'Explain what this question is asking in simple words and show an exam-ready approach.' },
  { key: 'solution', label: 'Solve', query: 'Solve this question step by step. Verify calculations and state the final answer clearly.' },
  { key: 'hint', label: 'Hint', query: 'Give me a progressive hint only. Do not reveal the full answer.' },
  { key: 'concepts', label: 'Concepts', query: 'What concepts and prerequisites should I revise before solving this?' },
  { key: 'formula', label: 'Formula', query: 'Show the relevant formulas, define every symbol, and explain when to use them.' },
  { key: 'similar', label: 'Similar PYQs', query: 'Show me similar or related PYQs from the archive.' },
  { key: 'practice', label: 'Practice 5', query: 'Create a focused mini-practice plan using five related PYQs.' },
  { key: 'revise', label: 'Revise', query: 'Give me a compact revision checklist for the concepts in this question.' },
];

export default function AcademicAiActions({ onAction, disabled = false, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const primary = ACADEMIC_AI_ACTIONS.slice(0, 3);
  const secondary = ACADEMIC_AI_ACTIONS.slice(3);
  const run = (action) => {
    trackProductEvent('ai_action', { routeKey: 'question_assistant', type: action.key }).catch(() => {});
    onAction?.(action);
  };
  return (
    <div className={`academic-ai-actions ${compact ? 'is-compact' : ''}`}>
      <div className="academic-ai-primary">
        {primary.map((action) => <button type="button" key={action.key} disabled={disabled} onClick={() => run(action)}><Sparkles size={13} />{action.label}</button>)}
        <button type="button" className="academic-ai-more" disabled={disabled} onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>More <ChevronDown size={13} /></button>
      </div>
      {expanded && <div className="academic-ai-secondary">{secondary.map((action) => <button type="button" key={action.key} disabled={disabled} onClick={() => run(action)}>{action.label}</button>)}</div>}
    </div>
  );
}
