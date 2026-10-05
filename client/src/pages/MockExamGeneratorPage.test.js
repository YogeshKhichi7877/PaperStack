import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MockExamGeneratorPage from './MockExamGeneratorPage';
import { generateMockExam, getMockExamSubjects, regenerateMockQuestion } from '../services/mockExamApi';

jest.mock('../services/mockExamApi', () => ({
  generateMockExam: jest.fn(), getMockExamSubjects: jest.fn(), regenerateMockQuestion: jest.fn(),
}));
jest.mock('../context/StudentProfileContext', () => ({ useStudentProfile: () => ({ semester: 5 }) }));
jest.mock('react-helmet-async', () => ({ Helmet: ({ children }) => <>{children}</> }));
jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => jest.fn(), useSearchParams: () => [new URLSearchParams()],
}));
jest.mock('../components/MathAnswer', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));

const generatedQuestion = {
  _id: 'ai-1', number: 1, questionLabel: 'Q1', marks: 25, source: 'generated',
  questionText: 'Compute the membership grade for the supplied fuzzy set.', difficulty: 'hard',
};
const mock = {
  mockId: 'test-mock', subject: { subjectCode: 'CS-514', subject: 'Fuzzy Logic' },
  generatedMarks: 25, targetMarks: 25, exactMarks: true, durationMinutes: 20,
  questions: [generatedQuestion], sections: [{ key: 'long', title: 'Section C', marks: 25, questions: [generatedQuestion] }],
  instructions: ['Attempt all questions.'], generationMode: 'ai', summary: { totalQuestions: 1, generatedCount: 1 },
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  getMockExamSubjects.mockResolvedValue({ aiAvailable: true,
    subjects: [{ subjectCode: 'CS-514', subject: 'Fuzzy Logic', semester: 5, totalQuestions: 10, examTypes: ['End-Sem'] }] });
});

test('all setup controls reach generation and the animation replaces the empty preview while pending', async () => {
  let finish;
  generateMockExam.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  render(<MockExamGeneratorPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Generate Mock' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Fresh Only' }));
  fireEvent.click(screen.getByRole('button', { name: 'Challenging' }));
  fireEvent.click(screen.getByRole('button', { name: '20 min' }));
  fireEvent.change(screen.getByLabelText('Exam scope'), { target: { value: 'End-Sem' } });
  fireEvent.change(screen.getByLabelText('Paper strategy'), { target: { value: 'broad-coverage' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Mock' }));
  expect(generateMockExam).toHaveBeenCalledWith(expect.objectContaining({
    mockType: 'new', difficulty: 'hard', durationMinutes: 20, totalMarks: 25,
    subjectCode: 'CS-514', examType: 'End-Sem', strategy: 'broad-coverage',
  }));
  expect(screen.getByRole('region', { name: 'Mock paper generation' })).toBeInTheDocument();
  expect(screen.queryByText(/Your mock paper will appear/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Fresh Only' })).toBeDisabled();
  expect(screen.getByLabelText('Marks')).toBeDisabled();
  await act(async () => finish(mock));
  expect(screen.queryByRole('region', { name: 'Mock paper generation' })).not.toBeInTheDocument();
  expect(screen.getByText('AI-generated')).toBeInTheDocument();
  expect(screen.getByText(generatedQuestion.questionText)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Fresh Only' })).toBeEnabled();
  expect(JSON.parse(localStorage.getItem('paperstack_last_mock')).mockId).toBe('test-mock');

  regenerateMockQuestion.mockResolvedValue({ question: { ...generatedQuestion, _id: 'ai-2', questionText: 'An easier complete question.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Easier' }));
  await waitFor(() => expect(screen.getByText('An easier complete question.')).toBeInTheDocument());
  expect(regenerateMockQuestion).toHaveBeenCalledWith(expect.objectContaining({ direction: 'easier', mockId: 'test-mock', questionId: 'ai-1' }));
});

test('a failed regeneration restores the existing paper and stops the animation', async () => {
  generateMockExam.mockResolvedValueOnce(mock);
  render(<MockExamGeneratorPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Generate Mock' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Generate Mock' }));
  await screen.findByText('AI-generated');
  let fail;
  generateMockExam.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
  fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
  expect(screen.getByRole('region', { name: 'Mock paper generation' })).toBeInTheDocument();
  await act(async () => fail({ response: { data: { error: 'AI is temporarily unavailable.' } } }));
  expect(screen.getByRole('alert')).toHaveTextContent('AI is temporarily unavailable.');
  expect(screen.getByText(generatedQuestion.questionText)).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Mock paper generation' })).not.toBeInTheDocument();
});
