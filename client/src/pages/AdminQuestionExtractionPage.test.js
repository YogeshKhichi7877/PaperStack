import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import AdminQuestionExtractionPage from './AdminQuestionExtractionPage';
import {
  extractQuestionsForPaper,
  getQuestionExtractionJob,
  getQuestionExtractionPapers,
  getQuestionExtractionStatus,
} from '../services/questionExtractionApi';

jest.mock('../services/questionExtractionApi', () => ({
  extractQuestionBatch: jest.fn(),
  extractQuestionsForPaper: jest.fn(),
  getQuestionExtractionPapers: jest.fn(),
  getQuestionExtractionJob: jest.fn(),
  getQuestionExtractionStatus: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  getQuestionExtractionStatus.mockResolvedValue({ ai: { configured: true }, minimumConfidence: 72 });
  getQuestionExtractionPapers.mockResolvedValue({ papers: [{
    _id: 'paper-1', title: 'Example exam', hasPdf: true, questionExtractionStatus: 'not_started',
  }] });
  getQuestionExtractionJob.mockResolvedValue({ job: { status: 'complete', result: {
    extractionStatus: 'complete', totalQuestionCount: 2, detectedQuestions: 2,
  } } });
});

test('uses configured AI fallback on the first extraction click', async () => {
  extractQuestionsForPaper.mockResolvedValue({ result: {
    extractionStatus: 'complete', totalQuestionCount: 2, detectedQuestions: 2,
  } });
  render(<HelmetProvider><AdminQuestionExtractionPage toast={jest.fn()} /></HelmetProvider>);

  const button = await screen.findByRole('button', { name: 'Extract questions' });
  expect(screen.getByRole('checkbox')).toBeChecked();
  fireEvent.click(button);

  await waitFor(() => expect(extractQuestionsForPaper).toHaveBeenCalledWith('paper-1', {
    force: false, allowAi: true, background: true,
  }));
});

test('shows the reason returned for a zero-question extraction', async () => {
  const reason = 'No selectable question text was found in this PDF.';
  extractQuestionsForPaper.mockRejectedValue({ response: { data: {
    error: reason, result: { extractionStatus: 'failed', detectedQuestions: 0, failureReason: reason },
  } } });
  const toast = jest.fn();
  render(<HelmetProvider><AdminQuestionExtractionPage toast={toast} /></HelmetProvider>);

  fireEvent.click(await screen.findByRole('button', { name: 'Extract questions' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(reason);
  expect(toast).toHaveBeenCalledWith(reason, 'error');
});
