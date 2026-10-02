import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import QuestionAssistantPanel from './QuestionAssistantPanel';
import {
  askSelectedQuestion,
  getQuestionAssistantContext,
} from '../services/questionAssistantApi';
import { trackProductEvent } from '../services/productAnalyticsApi';

jest.mock('../services/questionAssistantApi', () => ({
  askSelectedQuestion: jest.fn(),
  getQuestionAssistantContext: jest.fn(),
}));

jest.mock('../services/aiFeedbackApi', () => ({
  submitAiFeedback: jest.fn(),
}));

jest.mock('../services/productAnalyticsApi', () => ({
  trackProductEvent: jest.fn(() => Promise.resolve()),
}));

jest.mock('../services/questionBrowserApi', () => ({
  getMiniPractice: jest.fn(),
}));

jest.mock('./MathAnswer', () => function MockMathAnswer({ children }) {
  return <div data-testid="math-answer">{children}</div>;
});

jest.mock('./RelatedPyqs', () => function MockRelatedPyqs() {
  return <div data-testid="related-pyqs" />;
});

const question = {
  _id: '507f1f77bcf86cd799439011',
  questionText: 'Given R = {(1,2), (2,3), (3,4)}. Compute the transitive closure.',
};

function renderPanel() {
  return render(
    <QuestionAssistantPanel
      question={question}
      toast={jest.fn()}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  trackProductEvent.mockResolvedValue(undefined);
  getQuestionAssistantContext.mockResolvedValue({
    approvedSolutions: [],
    similarQuestions: [],
  });
});

test('renders the complete generated solution before secondary metadata', async () => {
  askSelectedQuestion.mockResolvedValue({
    answer: [
      'From $(1,2)$ and $(2,3)$, add $(1,3)$.',
      'From $(2,3)$ and $(3,4)$, add $(2,4)$.',
      'From $(1,3)$ and $(3,4)$, add $(1,4)$.',
      '**Final Answer:** $R^+ = \\{(1,2),(2,3),(3,4),(1,3),(2,4),(1,4)\\}$.',
    ].join('\n\n'),
    mode: 'ai',
    intent: 'solution',
    warnings: [],
    topics: ['Transitive Closure'],
    approvedSolutions: [],
    similarQuestions: [],
    practiceAnswer: true,
    verification: { status: 'not_applicable', details: [] },
    cache: { hit: false, matchType: 'generated' },
  });

  renderPanel();
  fireEvent.click(await screen.findByRole('button', { name: /solve/i }));

  expect(await screen.findByRole('heading', { name: 'Solution' })).toBeInTheDocument();
  expect(await screen.findByTestId('math-answer')).toHaveTextContent('(1,4)');
  expect(screen.getByText(/AI-generated practice answer/i)).toBeInTheDocument();
  expect(screen.queryByText(/Automatic numerical verification could not validate/i)).not.toBeInTheDocument();
});

test('rejects an empty successful response and offers a retry', async () => {
  askSelectedQuestion.mockResolvedValue({
    answer: '',
    mode: 'ai',
    intent: 'solution',
  });

  renderPanel();
  fireEvent.click(await screen.findByRole('button', { name: /solve/i }));

  expect(await screen.findByText(/couldn't generate the solution/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Solution' })).not.toBeInTheDocument();
});

test('shows a dedicated solving state while the request is pending', async () => {
  let resolveRequest;
  askSelectedQuestion.mockImplementation(() => new Promise((resolve) => {
    resolveRequest = resolve;
  }));

  renderPanel();
  fireEvent.click(await screen.findByRole('button', { name: /solve/i }));
  expect(await screen.findByText(/Solving this question/i)).toBeInTheDocument();

  resolveRequest({
    answer: 'A complete explanation with enough meaningful detail to render safely for the selected question.',
    mode: 'ai',
    intent: 'solution',
    warnings: [],
    topics: [],
    approvedSolutions: [],
    similarQuestions: [],
  });

  await waitFor(() => {
    expect(screen.queryByText(/Solving this question/i)).not.toBeInTheDocument();
  });
});
