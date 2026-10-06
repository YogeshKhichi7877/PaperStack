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
import { getImportBatches } from '../services/bulkPaperImportApi';

jest.mock('../services/questionExtractionApi', () => ({
  extractQuestionBatch: jest.fn(),
  extractQuestionsForPaper: jest.fn(),
  getQuestionExtractionPapers: jest.fn(),
  getQuestionExtractionJob: jest.fn(),
  getQuestionExtractionStatus: jest.fn(),
}));
jest.mock('../services/bulkPaperImportApi', () => ({ getImportBatches: jest.fn().mockResolvedValue({ batches: [] }) }));

beforeEach(() => {
  jest.clearAllMocks();
  getImportBatches.mockResolvedValue({ batches: [] });
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

test('suppresses a duplicate extraction click while the first request is active', async () => {
  let finishRequest;
  extractQuestionsForPaper.mockReturnValue(new Promise((resolve) => {
    finishRequest = resolve;
  }));
  render(<HelmetProvider><AdminQuestionExtractionPage toast={jest.fn()} /></HelmetProvider>);

  const button = await screen.findByRole('button', { name: 'Extract questions' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(extractQuestionsForPaper).toHaveBeenCalledTimes(1);

  finishRequest({ result: { extractionStatus: 'complete', totalQuestionCount: 2 } });
  await waitFor(() => expect(getQuestionExtractionPapers).toHaveBeenCalledTimes(2));
});

test('uses structured retry timing for an extraction limiter response', async () => {
  extractQuestionsForPaper.mockRejectedValue({ response: { data: {
    code: 'QUESTION_EXTRACTION_RATE_LIMITED',
    message: 'Question extraction is receiving too many new jobs.',
    retryAfterSeconds: 12,
  } } });
  const toast = jest.fn();
  render(<HelmetProvider><AdminQuestionExtractionPage toast={toast} /></HelmetProvider>);

  fireEvent.click(await screen.findByRole('button', { name: 'Extract questions' }));
  await waitFor(() => expect(toast).toHaveBeenCalledWith(
    'Question extraction is receiving too many new jobs. Retry in about 12 seconds.',
    'error'
  ));
});
