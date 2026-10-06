const test = require('node:test');
const assert = require('node:assert/strict');
const { syntheticPdf } = require('../testFixtures/pdf');
const { parsePdfBuffer, completeScannedPages, needsOcr } = require('./paperTextService');

const textPage = ['Subject CS504 End Semester 2025', 'Q1. Explain virtualization and resource allocation. [5]', 'Q2. Compare virtual machines and containers in detail. [5]'];
test('text PDF keeps physical pages and avoids OCR', async () => {
  const buffer = syntheticPdf([textPage, textPage]);
  const parsed = await parsePdfBuffer(buffer);
  assert.equal(parsed.pages, 2);
  assert.deepEqual(parsed.pageTexts.map((p) => p.pageNumber), [1, 2]);
  const completed = await completeScannedPages({ buffer, parsedPdf: parsed, allowAi: true, readPage: () => { throw new Error('Unexpected OCR'); } });
  assert.deepEqual(completed.ocrPages, []);
});
test('mixed PDF OCR renders only the scanned page and retains its physical number', async () => {
  const buffer = syntheticPdf([textPage, [], textPage]);
  const parsed = await parsePdfBuffer(buffer);
  assert.equal(parsed.pageTexts.length, 3);
  const calls = [];
  const result = await completeScannedPages({ buffer, parsedPdf: parsed, allowAi: true,
    readPage: async (image, page) => { calls.push(page); assert.ok(image.length > 100); return { text: 'Q3. Explain memory allocation. [5]', confidence: 98 }; } });
  assert.deepEqual(calls, [2]);
  assert.deepEqual(result.ocrPages, [2]);
  assert.equal(result.pageTexts[1].pageNumber, 2);
  assert.match(result.text, /Q3/);
});
test('scanned PDF uses OCR and records unreadable pages without inventing text', async () => {
  const buffer = syntheticPdf([[], []]);
  const parsed = await parsePdfBuffer(buffer);
  const result = await completeScannedPages({ buffer, parsedPdf: parsed, allowAi: true,
    readPage: async (_, page) => page === 1 ? { text: 'Q1. Explain paging. [5]', confidence: 95 } : { text: '', confidence: 0 } });
  assert.deepEqual(result.ocrPages, [1, 2]);
  assert.deepEqual(result.unreadablePages, [2]);
});
test('scan detection treats tiny selectable headers as insufficient', () => {
  assert.equal(needsOcr('CS504 End Sem 2025'), true);
  assert.equal(needsOcr(textPage.join('\n')), false);
});
test('OCR failure is reviewable and preserves text pages', async () => {
  const buffer = syntheticPdf([textPage, []]);
  const parsed = await parsePdfBuffer(buffer);
  const result = await completeScannedPages({ buffer, parsedPdf: parsed, allowAi: true,
    readPage: async () => { throw new Error('secret provider error'); } });
  assert.deepEqual(result.unreadablePages, [2]);
  assert.match(result.text, /virtualization/);
  assert.doesNotMatch(result.warnings.join(' '), /secret/);
});
test('invalid and corrupt PDFs fail with safe diagnostic codes', async () => {
  await assert.rejects(parsePdfBuffer(Buffer.from('not pdf')), { code: 'INVALID_PDF' });
  await assert.rejects(parsePdfBuffer(Buffer.from('%PDF-1.4\nbroken')), { code: 'PDF_CORRUPT' });
});
