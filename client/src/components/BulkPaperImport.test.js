import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BulkPaperImport from './BulkPaperImport';
import { getBulkImportConfig, importPaperFiles } from '../services/bulkPaperImportApi';
jest.mock('../services/bulkPaperImportApi', () => ({ getBulkImportConfig: jest.fn(), importPaperFiles: jest.fn() }));
jest.mock('./BulkImportProgress', () => ({ __esModule: true, default: ({ batchId }) => <div>Progress for {batchId}</div> }));
jest.mock('react-router-dom', () => ({ Link: ({ children, to }) => <a href={to}>{children}</a> }));
beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear(); getBulkImportConfig.mockResolvedValue({ maxFiles: 30, maxFileMb: 30, maxBatchMb: 150 }); });
const file = (name = 'paper.pdf') => new File(['%PDF-1.4'], name, { type: 'application/pdf' });
const show = () => render(<BulkPaperImport toast={jest.fn()} />);
test('imports selected PDFs with one click and no CSV controls', async () => {
  importPaperFiles.mockResolvedValue({ batchId: 'batch-123', queued: 2, skipped: 0, failed: 0 });
  show(); await screen.findByText(/30 files maximum/);
  expect(screen.queryByText(/CSV/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Select paper PDFs'), { target: { files: [file(), file('second.pdf')] } });
  fireEvent.click(screen.getByRole('button', { name: 'Import 2 Papers' }));
  await waitFor(() => expect(importPaperFiles).toHaveBeenCalledTimes(1));
  expect(importPaperFiles.mock.calls[0][0]).toHaveLength(2); expect(importPaperFiles.mock.calls[0][1]).toEqual([]);
  expect(await screen.findByText('Progress for batch-123')).toBeInTheDocument();
  expect(sessionStorage.getItem('lastPaperImportBatch')).toBe('batch-123');
});
test('rejects oversized batches and non-PDF files before upload', async () => {
  show(); await screen.findByText(/30 files maximum/);
  fireEvent.change(screen.getByLabelText('Select paper PDFs'), { target: { files: Array.from({ length: 31 }, (_, index) => file(`${index}.pdf`)) } });
  expect(screen.getByRole('alert')).toHaveTextContent('up to 30');
  fireEvent.change(screen.getByLabelText('Select paper PDFs'), { target: { files: [new File(['x'], 'x.csv', { type: 'text/csv' })] } });
  expect(screen.getByRole('alert')).toHaveTextContent('PDF files only'); expect(importPaperFiles).not.toHaveBeenCalled();
});
test('drag/drop merges PDFs and removal works', async () => {
  show(); await screen.findByText(/30 files maximum/);
  fireEvent.drop(screen.getByText('Drop PDFs here').closest('div'), { dataTransfer: { files: [file(), file('second.pdf')] } });
  expect(screen.getByText('2 / 30 papers selected')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Remove paper.pdf'));
  expect(screen.getByText('1 / 30 papers selected')).toBeInTheDocument();
});
test('failed uploads retain selection so they can be retried', async () => {
  importPaperFiles.mockRejectedValue({ response: { data: { message: 'Storage unavailable' } } });
  show(); await screen.findByText(/30 files maximum/);
  fireEvent.change(screen.getByLabelText('Select paper PDFs'), { target: { files: [file()] } });
  fireEvent.click(screen.getByRole('button', { name: 'Import 1 Papers' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable');
  expect(screen.getByRole('button', { name: 'Import 1 Papers' })).toBeEnabled();
});
