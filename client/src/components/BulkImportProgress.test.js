import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BulkImportProgress from './BulkImportProgress';
import { getImportBatch, getImportReview, saveImportMetadata, approveImportQuestion } from '../services/bulkPaperImportApi';
import { extractQuestionsForPaper } from '../services/questionExtractionApi';
jest.mock('../services/bulkPaperImportApi', () => ({ getImportBatch: jest.fn(), getImportReview: jest.fn(), saveImportMetadata: jest.fn(), approveImportQuestion: jest.fn(), attachImportSolution: jest.fn() }));
jest.mock('../services/questionExtractionApi', () => ({ extractQuestionsForPaper: jest.fn() }));
jest.mock('./QuestionText', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
beforeEach(() => { jest.clearAllMocks(); getImportBatch.mockResolvedValue({ batchId: '12345678', totalFiles: 2, status: 'finished', completed: 1, failed: 1, questions: 12, results: [
  { fileHash: '1', fileName: 'ready.pdf', paperId: 'paper-1', status: 'completed', paper: { subjectCode: 'CS504', questionCount: 12, processing: { stage: 'completed' } } },
  { fileHash: '2', fileName: 'failed.pdf', paperId: 'paper-2', status: 'failed' }], solutions: [] }); });
test('renders durable batch counts and queues retries', async () => {
  extractQuestionsForPaper.mockResolvedValue({ queued: true });
  render(<BulkImportProgress batchId="12345678" />);
  expect(await screen.findByText('Questions extracted: 12')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(extractQuestionsForPaper).toHaveBeenCalledWith('paper-2', { force: false, allowAi: true }));
});
test('review displays already extracted questions and permits corrections', async () => {
  getImportReview.mockResolvedValue({ paper: { _id: 'paper-1', subject: 'Cloud Computing', subjectCode: 'CS504', branch: 'CSE', semester: 5, year: 2025, examType: 'End-Sem', filePath: 'https://example.com/paper.pdf' }, questions: [{ _id: 'q1', questionLabel: 'Q1', questionText: 'Explain cloud computing.', marks: 5, needsReview: true }] });
  approveImportQuestion.mockResolvedValue({ success: true }); saveImportMetadata.mockResolvedValue({ success: true });
  render(<BulkImportProgress batchId="12345678" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
  expect(await screen.findByText('1 questions already extracted')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Approve question' }));
  await waitFor(() => expect(approveImportQuestion).toHaveBeenCalledWith('q1', { status: 'reviewed' }));
});
