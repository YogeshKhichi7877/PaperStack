const crypto = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');

const PrivateStudyResource = require('../models/PrivateStudyResource');
const PrivateStudyResourceChunk = require('../models/PrivateStudyResourceChunk');
const DailyLearningCheckin = require('../models/DailyLearningCheckin');
const PracticeSession = require('../models/PracticeSession');
const { createPracticeSession } = require('../services/practiceService');
const {
  MAX_FILE_BYTES,
  cleanTitle,
  downloadPrivateBuffer,
  destroyPrivateStorage,
  linkResourceToCheckin,
  publicPrivateResource,
  queuePrivateStudyResource,
  uploadPrivateBuffer,
  validatePrivateStudyFile,
} = require('../services/privateStudyResourceService');

const acceptedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    const allowed = acceptedMimeTypes.has(String(file.mimetype || '').toLowerCase());
    callback(allowed ? null : new Error('Use a PDF, PPT, PPTX, or plain-text notes file.'), allowed);
  },
});

function validId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ''));
}

function clean(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function createPrivateStudyResourceRoutes({ authenticate }) {
  if (typeof authenticate !== 'function') throw new Error('Private resource routes require authentication.');
  const router = express.Router();
  router.use(authenticate);

  router.post('/', (req, res) => {
    upload.single('file')(req, res, async (uploadError) => {
      if (uploadError) {
        const tooLarge = uploadError.code === 'LIMIT_FILE_SIZE';
        return res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'Class material must be 20 MB or smaller.' : uploadError.message });
      }
      let uploaded = null;
      try {
        const subjectCode = clean(req.body?.subjectCode, 30).toUpperCase();
        const subjectName = clean(req.body?.subjectName, 160);
        const linkedCheckinId = clean(req.body?.linkedCheckinId, 40);
        if (!subjectCode || !subjectName) return res.status(400).json({ error: 'Subject is required for class material.' });
        if (linkedCheckinId && !validId(linkedCheckinId)) return res.status(400).json({ error: 'Invalid learning check-in id.' });
        if (linkedCheckinId && !await DailyLearningCheckin.exists({ _id: linkedCheckinId, userId: req.user._id })) {
          return res.status(404).json({ error: 'Learning check-in not found.' });
        }
        const metadata = await validatePrivateStudyFile(req.file);
        let resource = await PrivateStudyResource.findOne({ userId: req.user._id, fileHash: metadata.fileHash });
        if (resource) {
          if (linkedCheckinId) await linkResourceToCheckin(resource, linkedCheckinId, req.user._id);
          const job = resource.processingStatus === 'FAILED'
            ? await queuePrivateStudyResource(resource._id, { force: true }) : null;
          resource = await PrivateStudyResource.findById(resource._id).lean();
          return res.status(200).json({ resource: publicPrivateResource(resource), job, duplicate: true });
        }

        uploaded = await uploadPrivateBuffer(req.file, req.user._id);
        const fallbackTitle = metadata.originalFileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
        resource = await PrivateStudyResource.create({
          userId: req.user._id, subjectCode, subjectName,
          linkedCheckinId: linkedCheckinId || null,
          title: cleanTitle(req.body?.title, fallbackTitle),
          ...metadata,
          storagePublicId: uploaded.public_id,
          storageResourceType: uploaded.resource_type || 'raw',
          storageVersion: uploaded.version || null,
          processingStatus: 'QUEUED', extractionStatus: 'PENDING', private: true,
          processing: { jobId: crypto.randomUUID(), attempts: 0, stage: 'queued' },
        });
        if (linkedCheckinId) await DailyLearningCheckin.updateOne(
          { _id: linkedCheckinId, userId: req.user._id }, { $addToSet: { resourceIds: resource._id } },
        );
        const job = await queuePrivateStudyResource(resource._id, { buffer: req.file.buffer });
        return res.status(201).json({ resource: publicPrivateResource(resource.toObject()), job, duplicate: false });
      } catch (error) {
        if (uploaded?.public_id) {
          await destroyPrivateStorage({ storagePublicId: uploaded.public_id, storageResourceType: uploaded.resource_type || 'raw' }).catch(() => {});
        }
        if (error?.code === 11000) {
          const existing = await PrivateStudyResource.findOne({ userId: req.user._id, fileHash: req.file?.buffer ? require('../services/privateStudyResourceService').fileHash(req.file.buffer) : '' }).lean();
          if (existing) return res.status(200).json({ resource: publicPrivateResource(existing), duplicate: true });
        }
        console.error('Private study upload failed', { code: error.code || error.name || 'UPLOAD_FAILED' });
        return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Could not store private class material.' });
      }
    });
  });

  router.get('/', async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
      const query = { userId: req.user._id };
      if (req.query.subjectCode) query.subjectCode = clean(req.query.subjectCode, 30).toUpperCase();
      const resources = await PrivateStudyResource.find(query).sort({ createdAt: -1 }).limit(limit).lean();
      return res.json({ resources: resources.map(publicPrivateResource) });
    } catch { return res.status(500).json({ error: 'Could not load private class material.' }); }
  });

  router.get('/:id', async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid resource id.' });
    const resource = await PrivateStudyResource.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!resource) return res.status(404).json({ error: 'Private study resource not found.' });
    const chunks = resource.processingStatus === 'READY'
      ? await PrivateStudyResourceChunk.find({ resourceId: resource._id, userId: req.user._id }).sort({ chunkIndex: 1 }).limit(200).select('chunkIndex locatorType locatorNumber heading text extractionMethod topicKeys').lean()
      : [];
    return res.json({ resource: publicPrivateResource(resource), chunks });
  });

  router.get('/:id/download', async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid resource id.' });
    const resource = await PrivateStudyResource.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!resource) return res.status(404).json({ error: 'Private study resource not found.' });
    try {
      const buffer = await downloadPrivateBuffer(resource);
      res.set('Cache-Control', 'private, no-store');
      res.set('Content-Type', resource.mimeType || 'application/octet-stream');
      res.attachment(resource.originalFileName || 'class-material');
      return res.send(buffer);
    } catch {
      return res.status(503).json({ error: 'Could not download this private file. Please retry.' });
    }
  });

  router.post('/:id/retry', async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid resource id.' });
    const resource = await PrivateStudyResource.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resource) return res.status(404).json({ error: 'Private study resource not found.' });
    if (!['FAILED', 'READY'].includes(resource.processingStatus)) return res.status(409).json({ error: 'This resource is already processing.' });
    const job = await queuePrivateStudyResource(resource._id, { force: true });
    return res.status(202).json({ job, resource: publicPrivateResource(await PrivateStudyResource.findById(resource._id).lean()) });
  });

  router.post('/:id/practice', async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid resource id.' });
    const resource = await PrivateStudyResource.findOne({ _id: req.params.id, userId: req.user._id, processingStatus: 'READY' }).lean();
    if (!resource) return res.status(404).json({ error: 'Ready private study resource not found.' });
    if (!resource.linkedTopicIds?.length) return res.status(409).json({ error: 'No practice topics were detected in this material.' });
    try {
      const result = await createPracticeSession(req.user._id, {
        subjectCode: resource.subjectCode, subjectName: resource.subjectName,
        topics: resource.linkedTopicIds.map((topicKey, index) => ({ topicKey, name: resource.linkedTopicNames[index] || topicKey })),
        mode: 'TOPIC', count: req.body?.count || 5,
      });
      await PracticeSession.updateOne({ _id: result.session._id, userId: req.user._id }, { $set: { privateResourceId: resource._id } });
      result.session.privateResourceId = resource._id;
      return res.status(201).json(result);
    } catch (error) { return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Could not prepare practice from this material.' }); }
  });

  router.delete('/:id', async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid resource id.' });
    const resource = await PrivateStudyResource.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!resource) return res.status(404).json({ error: 'Private study resource not found.' });
    try {
      await destroyPrivateStorage(resource);
      await Promise.all([
        PrivateStudyResourceChunk.deleteMany({ resourceId: resource._id, userId: req.user._id }),
        PrivateStudyResource.deleteOne({ _id: resource._id, userId: req.user._id }),
        DailyLearningCheckin.updateMany({ userId: req.user._id, resourceIds: resource._id }, { $pull: { resourceIds: resource._id } }),
      ]);
      return res.json({ success: true });
    } catch { return res.status(503).json({ error: 'Could not delete the stored file. Please retry.' }); }
  });

  return router;
}

module.exports = { acceptedMimeTypes, createPrivateStudyResourceRoutes };
