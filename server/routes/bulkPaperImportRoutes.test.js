const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Paper = require('../models/Paper');
const Question = require('../models/Question');
const Batch = require('../models/PaperImportBatch');
const createRouter = require('./bulkPaperImportRoutes');

async function serve(t, authenticateAdmin, importer) {
  const app = express(); app.use(express.json()); app.use('/bulk', createRouter({ authenticateAdmin, importer, jwtSecret: 'synthetic-test-secret' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/bulk`;
}
const admin = (req, res, next) => { req.admin = { role: 'admin', tokenType: 'admin' }; next(); };
const form = (field = 'papers', count = 1) => { const data = new FormData(); for (let index = 0; index < count; index++) data.append(field, new Blob(['%PDF-test'], { type: 'application/pdf' }), `${index}.pdf`); return data; };
test('HTTP importer accepts PDFs alone, returns 202 and rejects old CSV fields', async t => {
  const url = await serve(t, admin, async ({ papers }) => ({ success: true, queued: papers.length, batchId: 'batch' }));
  const response = await fetch(url, { method: 'POST', body: form('papers', 30) });
  assert.equal(response.status, 202); assert.equal((await response.json()).queued, 30);
  assert.equal((await fetch(url, { method: 'POST', body: form('csv') })).status, 400);
  assert.equal((await fetch(url, { method: 'POST', body: form('papers', 31) })).status, 400);
  assert.equal((await fetch(url, { method: 'POST', body: new FormData() })).status, 400);
});
test('admin gate rejects unauthenticated imports before the files are buffered', async t => {
  const url = await serve(t, (req, res) => res.status(403).json({ message: 'Admin required' }), async () => { throw new Error('Must not run'); });
  assert.equal((await fetch(url, { method: 'POST', body: form() })).status, 403);
});
test('authenticated uploader comes from signed identity plus DB, not multipart email', async t => {
  const user = { _id: '507f1f77bcf86cd799439011', email: 'yogeshkhinchi2005@gmail.com' };
  t.mock.method(User, 'findById', () => ({ select() { return this; }, lean: async () => user }));
  const token = jwt.sign({ _id: user._id, email: 'forged@example.com' }, 'synthetic-test-secret');
  const req = { admin: {}, header: () => `Bearer ${token}` };
  assert.equal((await createRouter.authenticatedUploader(req, 'synthetic-test-secret')).email, user.email);
  await assert.rejects(() => createRouter.authenticatedUploader({ ...req, header: () => 'not-signed' }, 'synthetic-test-secret'));
});
test('aggregate memory limit rejects excessive streamed bytes early', async () => {
  const { PassThrough } = require('node:stream'); const storage = createRouter.boundedMemoryStorage(5), req = {};
  const stream = new PassThrough(); const result = new Promise((resolve) => storage._handleFile(req, { stream }, (error) => resolve(error)));
  stream.end(Buffer.alloc(6)); assert.match((await result).message, /smaller batches/);
});
function query(value) { return { select() { return this; }, sort() { return this; }, limit() { return this; }, lean: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) }; }
test('batch progress is read from durable batch and Paper records', async t => {
  const id = '507f1f77bcf86cd799439011';
  t.mock.method(Batch, 'findById', () => query({ _id: id, totalFiles: 1, ingestionComplete: true, results: [{ paperId: id, fileName: 'exam.pdf', status: 'queued' }] }));
  t.mock.method(Paper, 'find', () => query([{ _id: id, questionExtractionStatus: 'complete', questionCount: 12 }]));
  const url = await serve(t, admin, async () => {});
  const response = await fetch(`${url}/batches/${id}`); assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.questions, 12); assert.equal(result.completed, 1); assert.equal(result.status, 'finished');
});
test('metadata review corrects question provenance before publishing the paper', async t => {
  const id = '507f1f77bcf86cd799439011';
  const paper = new Paper({ _id: id, title: 'Detecting', branch: '', importBatchId: id, questionExtractionStatus: 'partial', reviewStatus: 'needs_review', processing: { metadata: { missing: ['branch'] } } });
  const states = []; paper.save = async () => { states.push(paper.reviewStatus); return paper; };
  t.mock.method(Paper, 'findById', () => query(paper));
  let provenance;
  t.mock.method(Question, 'updateMany', async (filter, update) => { provenance = update.$set; assert.equal(paper.reviewStatus, 'needs_review'); });
  t.mock.method(require('../services/questionExtractionService'), 'syncPaperQuestionReview', async () => {});
  const url = await serve(t, admin, async () => {});
  const response = await fetch(`${url}/papers/${id}/metadata`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: 'Cloud Computing', subjectCode: 'CS504', branch: 'CSE', semester: 5, year: 2025, examType: 'End-Sem' }) });
  assert.equal(response.status, 200); assert.deepEqual(states, ['needs_review', 'approved']);
  assert.equal(provenance.subjectKey, 'CS504'); assert.equal(provenance.semester, 5); assert.equal(paper.processing.metadata.missing.length, 0);
});
test('metadata review cannot race a running worker', async t => {
  const id = '507f1f77bcf86cd799439011';
  t.mock.method(Paper, 'findById', () => query({ questionExtractionStatus: 'processing' }));
  const url = await serve(t, admin, async () => {});
  assert.equal((await fetch(`${url}/papers/${id}/metadata`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 409);
});
