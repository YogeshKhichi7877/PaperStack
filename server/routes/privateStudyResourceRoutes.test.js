const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');

const PrivateStudyResource = require('../models/PrivateStudyResource');
const PrivateStudyResourceChunk = require('../models/PrivateStudyResourceChunk');
const { createPrivateStudyResourceRoutes } = require('./privateStudyResourceRoutes');

function query(value) {
  return { lean: async () => value, sort() { return this; }, limit() { return this; }, select() { return this; } };
}

async function start() {
  const app = express();
  app.use(express.json());
  const authenticate = (req, res, next) => {
    const id = req.get('x-test-user');
    if (!id) return res.status(401).json({ error: 'Authentication required' });
    req.user = { _id: id };
    return next();
  };
  app.use('/resources', createPrivateStudyResourceRoutes({ authenticate }));
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('resource detail and extracted chunks reject cross-user ID access', async (t) => {
  const ownerId = new mongoose.Types.ObjectId().toString();
  const otherId = new mongoose.Types.ObjectId().toString();
  const resourceId = new mongoose.Types.ObjectId().toString();
  const resource = {
    _id: resourceId, userId: ownerId, subjectCode: 'CS301', subjectName: 'Operating Systems',
    title: 'Lecture 5', originalFileName: 'lecture.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    resourceType: 'PPTX', fileSize: 1200, processingStatus: 'READY', extractionStatus: 'NATIVE_TEXT',
    storagePublicId: 'paperstack/private-study/owner/secret-file', storageVersion: 17,
    linkedTopicIds: ['cs301:deadlock'], linkedTopicNames: ['Deadlock'], pageCount: 1, chunkCount: 1,
    processing: {}, createdAt: new Date(), updatedAt: new Date(),
  };
  t.mock.method(PrivateStudyResource, 'findOne', (filter) => query(String(filter.userId) === ownerId ? resource : null));
  t.mock.method(PrivateStudyResourceChunk, 'find', (filter) => query(String(filter.userId) === ownerId ? [{ text: 'private lecture text', resourceId }] : []));
  const server = await start();
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const owner = await fetch(`${base}/resources/${resourceId}`, { headers: { 'x-test-user': ownerId } });
  assert.equal(owner.status, 200);
  const ownerBody = JSON.stringify(await owner.json());
  assert.match(ownerBody, /private lecture text/);
  assert.doesNotMatch(ownerBody, /storagePublicId|secret-file|storageVersion/);

  const attacker = await fetch(`${base}/resources/${resourceId}`, { headers: { 'x-test-user': otherId } });
  assert.equal(attacker.status, 404);
  assert.doesNotMatch(JSON.stringify(await attacker.json()), /private lecture text/);

  const attackerDownload = await fetch(`${base}/resources/${resourceId}/download`, { headers: { 'x-test-user': otherId } });
  assert.equal(attackerDownload.status, 404);
});

test('resource endpoints require authentication', async (t) => {
  const server = await start();
  t.after(() => server.close());
  const response = await fetch(`http://127.0.0.1:${server.address().port}/resources`);
  assert.equal(response.status, 401);
});
