const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const createQuestionExtractionRouter = require('./questionExtractionRoutes');
const Paper = require('../models/Paper');
const processingQueue = require('../services/paperProcessingQueue');
const { enqueueJob } = require('../services/backgroundJobService');

test('question extraction status polling does not consume the extraction start budget', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/question-extraction', createQuestionExtractionRouter({
    authenticateAdmin: (req, res, next) => {
      req.admin = { _id: 'admin-test' };
      next();
    },
  }));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    for (let index = 0; index < 40; index += 1) {
      const response = await fetch(`${url}/api/admin/question-extraction/status`);
      assert.equal(response.status, 200);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('batch coordinator can await child extraction when worker concurrency is one', async (t) => {
  const paper = { _id: '6ac46f5cb2f599ba9a048e80', title: 'Synthetic batch paper' };
  t.mock.method(Paper, 'find', () => ({ sort(){return this;}, limit(){return this;}, select(){return this;}, lean: async () => [paper] }));
  t.mock.method(processingQueue, 'processQueuedPaper', async () => new Promise((resolve) => {
    enqueueJob('synthetic-child', () => {
      const result = { extractionStatus: 'complete', totalQuestionCount: 2, confidence: 98, engine: 'rules' };
      resolve(result); return result;
    }, { queue: 'question-extraction', concurrency: 1 });
  }));
  const app = express();
  app.use(express.json());
  app.use('/api/admin/question-extraction', createQuestionExtractionRouter({ authenticateAdmin: (req, res, next) => next() }));
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/admin/question-extraction`;
    const response = await fetch(`${base}/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 1, allowAi: false }) });
    assert.equal(response.status, 202);
    const { job } = await response.json();
    let finished;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const status = await (await fetch(`${base}/jobs/${job.id}`)).json();
      if (status.job.status === 'complete') { finished = status.job; break; }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(finished?.result.successful, 1);
    assert.equal(finished.result.results[0].questionCount, 2);
    assert.equal(finished.result.nextCursor, paper._id);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
