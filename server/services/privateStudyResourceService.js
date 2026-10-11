const crypto = require('node:crypto');
const path = require('node:path');
const axios = require('axios');
const JSZip = require('jszip');

const PrivateStudyResource = require('../models/PrivateStudyResource');
const PrivateStudyResourceChunk = require('../models/PrivateStudyResourceChunk');
const DailyLearningCheckin = require('../models/DailyLearningCheckin');
const { cloudinary, folder } = require('../cloudConfig');
const { parsePdfBuffer, completeScannedPages } = require('./paperTextService');
const { mapLearningTopics } = require('./topicMappingService');
const { enqueueJob, getActiveJobByKey } = require('./backgroundJobService');

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PPTX_XML_BYTES = 6 * 1024 * 1024;
const MAX_ATTEMPTS = 3;
const PROCESSING_LEASE_MS = 3 * 60 * 1000;

const FILE_TYPES = Object.freeze({
  '.pdf': { resourceType: 'PDF', mimeTypes: ['application/pdf'] },
  '.pptx': { resourceType: 'PPTX', mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'] },
  '.ppt': { resourceType: 'PPT', mimeTypes: ['application/vnd.ms-powerpoint'] },
  '.txt': { resourceType: 'TEXT', mimeTypes: ['text/plain'] },
});

function serviceError(code, message, statusCode = 422, retryable = false) {
  return Object.assign(new Error(message), { code, statusCode, retryable });
}

function cleanFileName(value) {
  return path.basename(String(value || 'study-material')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 240);
}

function cleanTitle(value, fallback = 'Class material') {
  const result = String(value || fallback).replace(/\s+/g, ' ').trim().slice(0, 180);
  return result || fallback;
}

function extensionOf(filename) {
  return path.extname(String(filename || '')).toLowerCase();
}

function fileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function validatePrivateStudyFile(file, dependencies = {}) {
  if (!file?.buffer?.length) throw serviceError('FILE_REQUIRED', 'Choose a class material file.', 400);
  if (file.buffer.length > MAX_FILE_BYTES) throw serviceError('FILE_TOO_LARGE', 'Class material must be 20 MB or smaller.', 413);
  const extension = extensionOf(file.originalname);
  const type = FILE_TYPES[extension];
  if (!type) throw serviceError('FILE_TYPE', 'Use a PDF, PPT, PPTX, or plain-text notes file.', 400);
  if (!type.mimeTypes.includes(String(file.mimetype || '').toLowerCase())) {
    throw serviceError('MIME_MISMATCH', 'The file type does not match its extension.', 400);
  }
  if (extension === '.pdf' && !file.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
    throw serviceError('INVALID_PDF', 'This is not a valid PDF file.', 400);
  }
  if (extension === '.pptx') {
    if (file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b) throw serviceError('INVALID_PPTX', 'This is not a valid PPTX file.', 400);
    const zip = await (dependencies.loadZip || JSZip.loadAsync)(file.buffer).catch(() => null);
    if (!zip?.file?.('[Content_Types].xml') || !zip?.file?.('ppt/presentation.xml')) {
      throw serviceError('INVALID_PPTX', 'This PPTX file is malformed.', 400);
    }
  }
  return {
    extension,
    resourceType: type.resourceType,
    mimeType: file.mimetype,
    originalFileName: cleanFileName(file.originalname),
    fileSize: file.buffer.length,
    fileHash: fileHash(file.buffer),
  };
}

function decodeXmlText(value = '') {
  return String(value)
    .replace(/<a:br\s*\/?\s*>/gi, '\n')
    .replace(/<\/a:p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(parseInt(number, 16)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function numberedEntries(zip, expression) {
  return Object.keys(zip.files)
    .map((name) => ({ name, match: name.match(expression) }))
    .filter((item) => item.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));
}

async function safeZipText(entry, byteBudget) {
  const expected = Number(entry?._data?.uncompressedSize || 0);
  if (expected > byteBudget.remaining) throw serviceError('PPTX_TOO_COMPLEX', 'The presentation contains too much extracted text.', 422);
  const text = await entry.async('string');
  byteBudget.remaining -= Buffer.byteLength(text);
  if (byteBudget.remaining < 0) throw serviceError('PPTX_TOO_COMPLEX', 'The presentation contains too much extracted text.', 422);
  return text;
}

async function extractPptxUnits(buffer, dependencies = {}) {
  const zip = await (dependencies.loadZip || JSZip.loadAsync)(buffer).catch(() => null);
  if (!zip?.file?.('ppt/presentation.xml')) throw serviceError('INVALID_PPTX', 'The presentation could not be opened.', 422);
  const slides = numberedEntries(zip, /^ppt\/slides\/slide(\d+)\.xml$/i);
  if (!slides.length || slides.length > 300) throw serviceError('PPTX_SLIDE_LIMIT', 'The presentation must contain between 1 and 300 slides.', 422);
  const notesByNumber = new Map(numberedEntries(zip, /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/i).map((item) => [Number(item.match[1]), item.name]));
  const budget = { remaining: MAX_PPTX_XML_BYTES };
  const units = [];
  for (const slide of slides) {
    const slideNumber = Number(slide.match[1]);
    const slideText = decodeXmlText(await safeZipText(zip.file(slide.name), budget));
    let notes = '';
    const notesName = notesByNumber.get(slideNumber);
    if (notesName) notes = decodeXmlText(await safeZipText(zip.file(notesName), budget));
    const text = [slideText, notes && `Speaker notes:\n${notes}`].filter(Boolean).join('\n\n').trim();
    if (!text) continue;
    units.push({
      locatorType: 'SLIDE', locatorNumber: slideNumber,
      heading: slideText.split('\n').find(Boolean)?.slice(0, 200) || `Slide ${slideNumber}`,
      text, extractionMethod: 'NATIVE_TEXT',
    });
  }
  return { units, pageCount: slides.length, extractionStatus: 'NATIVE_TEXT' };
}

function splitText(value, maxLength = 1800, overlap = 160) {
  const text = String(value || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();
  if (!text) return [];
  const chunks = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + maxLength);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf('\n', end), text.lastIndexOf('. ', end));
      if (boundary > cursor + Math.floor(maxLength * 0.55)) end = boundary + 1;
    }
    const chunk = text.slice(cursor, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    cursor = Math.max(cursor + 1, end - overlap);
  }
  return chunks;
}

function buildChunkDocuments(resource, units) {
  let chunkIndex = 0;
  const documents = [];
  for (const unit of units) {
    for (const text of splitText(unit.text)) {
      documents.push({
        userId: resource.userId, resourceId: resource._id, subjectCode: resource.subjectCode,
        chunkIndex: chunkIndex++, locatorType: unit.locatorType, locatorNumber: unit.locatorNumber ?? null,
        heading: cleanTitle(unit.heading, ''), text, extractionMethod: unit.extractionMethod || 'NATIVE_TEXT',
        topicKeys: [], contentHash: fileHash(Buffer.from(text)),
      });
    }
  }
  return documents;
}

function topicTokens(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 2);
}

async function mapResourceTopics(resource, chunks, dependencies = {}) {
  if (!chunks.length) return [];
  const representativeText = chunks.slice(0, 12).map((chunk) => chunk.text).join('\n').slice(0, 3000);
  try {
    const mapper = dependencies.mapTopics || mapLearningTopics;
    const mapped = await mapper({ text: representativeText, subjectCode: resource.subjectCode, subjectName: resource.subjectName });
    const topics = (mapped.topics || []).slice(0, 8);
    for (const chunk of chunks) {
      const normalized = chunk.text.toLowerCase();
      const direct = topics.filter((topic) => topicTokens(topic.name).some((token) => normalized.includes(token)));
      chunk.topicKeys = (direct.length ? direct : topics.slice(0, 3)).map((topic) => topic.topicKey);
    }
    return topics;
  } catch {
    return [];
  }
}

function uploadPrivateBuffer(file, userId, dependencies = {}) {
  const client = dependencies.cloudinary || cloudinary;
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream({
      folder: `${folder}/private-study/${userId}`,
      resource_type: 'raw', type: 'authenticated', unique_filename: true, use_filename: false,
    }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(file.buffer);
  });
}

function signedPrivateUrl(resource, dependencies = {}) {
  const client = dependencies.cloudinary || cloudinary;
  return client.url(resource.storagePublicId, {
    secure: true, sign_url: true, type: 'authenticated', resource_type: resource.storageResourceType || 'raw',
    version: resource.storageVersion || undefined,
  });
}

async function downloadPrivateBuffer(resource, dependencies = {}) {
  if (dependencies.buffer) return dependencies.buffer;
  const request = dependencies.http || axios;
  const response = await request.get(signedPrivateUrl(resource, dependencies), {
    responseType: 'arraybuffer', timeout: 30000,
    maxContentLength: MAX_FILE_BYTES, maxBodyLength: MAX_FILE_BYTES,
  });
  return Buffer.from(response.data);
}

async function extractResource(resource, buffer, dependencies = {}) {
  if (resource.resourceType === 'PDF') {
    const parsed = await (dependencies.parsePdf || parsePdfBuffer)(buffer);
    const completed = await (dependencies.completePdf || completeScannedPages)({
      buffer, parsedPdf: parsed, paperId: `private-resource:${resource._id}`, allowAi: true,
      onStage: async () => {
        await (dependencies.ResourceModel || PrivateStudyResource).updateOne({ _id: resource._id }, { $set: { processingStatus: 'OCR', 'processing.stage': 'ocr' } });
      },
    });
    const units = completed.pageTexts.map((page) => ({
      locatorType: 'PAGE', locatorNumber: page.pageNumber, heading: `Page ${page.pageNumber}`,
      text: page.text, extractionMethod: page.method === 'ocr' ? 'OCR' : 'NATIVE_TEXT',
    })).filter((unit) => unit.text?.trim());
    const extractionStatus = completed.ocrPages.length
      ? (completed.ocrPages.length === units.length ? 'OCR' : 'MIXED') : 'NATIVE_TEXT';
    return { units, pageCount: completed.pages, extractionStatus };
  }
  if (resource.resourceType === 'PPTX') return extractPptxUnits(buffer, dependencies);
  if (resource.resourceType === 'TEXT') {
    const text = buffer.toString('utf8').replace(/\u0000/g, '').trim();
    return { units: [{ locatorType: 'DOCUMENT', locatorNumber: null, heading: resource.title, text, extractionMethod: 'NATIVE_TEXT' }], pageCount: 1, extractionStatus: 'NATIVE_TEXT' };
  }
  throw serviceError('PPT_UNSUPPORTED', 'Legacy .ppt files are stored privately but must be converted to .pptx for text extraction.', 422, false);
}

async function processPrivateStudyResource(resourceId, options = {}, dependencies = {}) {
  const ResourceModel = dependencies.ResourceModel || PrivateStudyResource;
  const ChunkModel = dependencies.ChunkModel || PrivateStudyResourceChunk;
  const resource = await ResourceModel.findOneAndUpdate(
    { _id: resourceId, processingStatus: 'QUEUED' },
    { $set: { processingStatus: 'EXTRACTING', 'processing.stage': 'extracting', 'processing.startedAt': new Date(), 'processing.leaseUntil': new Date(Date.now() + PROCESSING_LEASE_MS), 'processing.error': null }, $inc: { 'processing.attempts': 1 } },
    { new: true },
  ).lean();
  if (!resource) return { extractionStatus: 'failed', failureReason: 'Resource is not queued.' };
  try {
    const buffer = options.buffer || await downloadPrivateBuffer(resource, dependencies);
    const extracted = await extractResource(resource, buffer, dependencies);
    const chunks = buildChunkDocuments(resource, extracted.units);
    if (!chunks.length) throw serviceError('NO_READABLE_TEXT', 'No readable text was found in this material.', 422, false);
    await ResourceModel.updateOne({ _id: resource._id }, { $set: { processingStatus: 'MAPPING_TOPICS', extractionStatus: extracted.extractionStatus, 'processing.stage': 'mapping_topics', 'processing.leaseUntil': new Date(Date.now() + PROCESSING_LEASE_MS) } });
    const topics = await mapResourceTopics(resource, chunks, dependencies);
    if (typeof ResourceModel.exists === 'function' && !await ResourceModel.exists({ _id: resource._id, userId: resource.userId, processingStatus: 'MAPPING_TOPICS' })) {
      return { extractionStatus: 'failed', failureReason: 'Resource was deleted while processing.' };
    }
    await ChunkModel.deleteMany({ resourceId: resource._id, userId: resource.userId });
    await ChunkModel.insertMany(chunks, { ordered: true });
    const readyWrite = await ResourceModel.updateOne({ _id: resource._id, userId: resource.userId, processingStatus: 'MAPPING_TOPICS' }, { $set: {
      processingStatus: 'READY', extractionStatus: extracted.extractionStatus,
      linkedTopicIds: topics.map((topic) => topic.topicKey), linkedTopicNames: topics.map((topic) => topic.name),
      pageCount: extracted.pageCount || 0, chunkCount: chunks.length,
      'processing.stage': 'ready', 'processing.finishedAt': new Date(), 'processing.leaseUntil': null, 'processing.retryAt': null, 'processing.error': null,
    } });
    if (readyWrite?.matchedCount === 0) {
      await ChunkModel.deleteMany({ resourceId: resource._id, userId: resource.userId });
      return { extractionStatus: 'failed', failureReason: 'Resource was deleted while processing.' };
    }
    return { extractionStatus: 'complete', resourceId: String(resource._id), chunkCount: chunks.length, topics: topics.map((topic) => topic.name) };
  } catch (error) {
    const code = error.code || 'PROCESSING_FAILED';
    const retryable = Boolean(error.retryable || ['ECONNRESET', 'ETIMEDOUT', 'AI_TIMEOUT'].includes(code));
    await ResourceModel.updateOne({ _id: resource._id }, { $set: {
      processingStatus: 'FAILED', extractionStatus: code === 'PPT_UNSUPPORTED' ? 'UNSUPPORTED' : 'FAILED',
      'processing.stage': 'failed', 'processing.finishedAt': new Date(), 'processing.leaseUntil': null,
      'processing.error': { stage: resource.processing?.stage || 'extracting', code, message: String(error.message || 'Processing failed.').slice(0, 300), retryable },
    } });
    return { extractionStatus: 'failed', failureReason: String(error.message || 'Resource processing failed.'), error: { code, retryable } };
  }
}

function persistedResourceJob(resource) {
  const status = resource.processingStatus === 'READY' ? 'complete'
    : resource.processingStatus === 'FAILED' ? 'failed'
      : String(resource.processingStatus || 'QUEUED').toLowerCase();
  return { id: resource.processing?.jobId, type: 'private-study-resource', status,
    createdAt: resource.createdAt, updatedAt: resource.updatedAt,
    result: status === 'complete' ? { resourceId: String(resource._id), chunkCount: resource.chunkCount, topics: resource.linkedTopicNames } : null,
    error: status === 'failed' ? resource.processing?.error?.message || 'Resource processing failed.' : '',
  };
}

function dispatchPrivateResource(resource, options = {}, dependencies = {}) {
  const key = `private-study-resource:${resource._id}`;
  const existing = getActiveJobByKey(key);
  if (existing) return existing;
  return enqueueJob('private-study-resource', async () => {
    const result = await processPrivateStudyResource(resource._id, options, dependencies);
    if (result.error?.retryable) {
      const ResourceModel = dependencies.ResourceModel || PrivateStudyResource;
      const latest = await ResourceModel.findById(resource._id).lean();
      if (Number(latest?.processing?.attempts || 0) < MAX_ATTEMPTS) {
        await ResourceModel.updateOne({ _id: resource._id, processingStatus: 'FAILED' }, { $set: {
          processingStatus: 'QUEUED', 'processing.stage': 'queued',
          'processing.retryAt': new Date(Date.now() + 30000 * (2 ** Number(latest?.processing?.attempts || 0))),
        } });
      }
    }
    return result;
  }, { jobId: resource.processing?.jobId, queue: 'private-study-resource', concurrency: 2, dedupeKey: key });
}

async function queuePrivateStudyResource(resourceId, options = {}, dependencies = {}) {
  const ResourceModel = dependencies.ResourceModel || PrivateStudyResource;
  const existing = getActiveJobByKey(`private-study-resource:${resourceId}`);
  if (existing) return existing;
  let resource = await ResourceModel.findById(resourceId).lean();
  if (!resource) throw serviceError('NOT_FOUND', 'Private study resource not found.', 404);
  if (resource.processingStatus === 'READY' && !options.force) return persistedResourceJob(resource);
  if (resource.processingStatus !== 'QUEUED') {
    resource = await ResourceModel.findOneAndUpdate({ _id: resourceId, processingStatus: { $nin: ['EXTRACTING', 'OCR', 'MAPPING_TOPICS'] } }, { $set: {
      processingStatus: 'QUEUED', extractionStatus: 'PENDING',
      'processing.jobId': crypto.randomUUID(), 'processing.stage': 'queued', 'processing.attempts': options.force ? 0 : resource.processing?.attempts || 0,
      'processing.retryAt': null, 'processing.error': null,
    } }, { new: true }).lean() || resource;
  }
  if (resource.processingStatus === 'QUEUED' && (!resource.processing?.retryAt || resource.processing.retryAt <= new Date())) {
    return dispatchPrivateResource(resource, { buffer: options.buffer }, dependencies);
  }
  return persistedResourceJob(resource);
}

let recovering = false;
let recoveryTimer;
async function recoverPrivateStudyResources(dependencies = {}) {
  const ResourceModel = dependencies.ResourceModel || PrivateStudyResource;
  if (recovering || ResourceModel.db?.readyState !== 1) return;
  recovering = true;
  try {
    const now = new Date();
    const resources = await ResourceModel.find({ $or: [
      { processingStatus: 'QUEUED', $or: [{ 'processing.retryAt': null }, { 'processing.retryAt': { $lte: now } }] },
      { processingStatus: { $in: ['EXTRACTING', 'OCR', 'MAPPING_TOPICS'] }, 'processing.leaseUntil': { $lt: now } },
    ] }).sort({ 'processing.retryAt': 1, _id: 1 }).limit(10).lean();
    for (const resource of resources) {
      if (Number(resource.processing?.attempts || 0) >= MAX_ATTEMPTS) {
        await ResourceModel.updateOne({ _id: resource._id }, { $set: { processingStatus: 'FAILED', extractionStatus: 'FAILED', 'processing.stage': 'failed', 'processing.error': { stage: resource.processing?.stage, code: 'RETRY_LIMIT', message: 'Resource processing failed after three attempts.', retryable: false } } });
        continue;
      }
      if (resource.processingStatus !== 'QUEUED') {
        await ResourceModel.updateOne({ _id: resource._id }, { $set: { processingStatus: 'QUEUED', 'processing.stage': 'queued', 'processing.retryAt': null } });
        resource.processingStatus = 'QUEUED';
      }
      dispatchPrivateResource(resource, {}, dependencies);
    }
  } catch {
    console.error('Private study resource recovery failed; the next pass will retry.');
  } finally { recovering = false; }
}

function startPrivateStudyResourceRecovery() {
  if (recoveryTimer) return;
  recoverPrivateStudyResources();
  recoveryTimer = setInterval(recoverPrivateStudyResources, 20000);
  recoveryTimer.unref();
}

async function destroyPrivateStorage(resource, dependencies = {}) {
  const client = dependencies.cloudinary || cloudinary;
  if (!resource?.storagePublicId) return;
  await client.uploader.destroy(resource.storagePublicId, { resource_type: resource.storageResourceType || 'raw', type: 'authenticated', invalidate: true });
}

async function linkResourceToCheckin(resource, checkinId, userId, dependencies = {}) {
  if (!checkinId) return null;
  const CheckinModel = dependencies.CheckinModel || DailyLearningCheckin;
  const checkin = await CheckinModel.findOneAndUpdate({ _id: checkinId, userId }, { $addToSet: { resourceIds: resource._id } }, { new: true });
  if (!checkin) throw serviceError('CHECKIN_NOT_FOUND', 'Learning check-in not found.', 404);
  await (dependencies.ResourceModel || PrivateStudyResource).updateOne({ _id: resource._id, userId }, { $set: { linkedCheckinId: checkin._id } });
  return checkin;
}

function publicPrivateResource(resource) {
  return {
    _id: String(resource._id), subjectCode: resource.subjectCode, subjectName: resource.subjectName,
    linkedCheckinId: resource.linkedCheckinId ? String(resource.linkedCheckinId) : null,
    title: resource.title, originalFileName: resource.originalFileName, mimeType: resource.mimeType,
    resourceType: resource.resourceType, fileSize: resource.fileSize,
    processingStatus: resource.processingStatus, extractionStatus: resource.extractionStatus,
    linkedTopicIds: resource.linkedTopicIds || [], linkedTopicNames: resource.linkedTopicNames || [],
    pageCount: resource.pageCount || 0, chunkCount: resource.chunkCount || 0,
    processingError: resource.processing?.error ? { code: resource.processing.error.code, message: resource.processing.error.message, retryable: resource.processing.error.retryable } : null,
    createdAt: resource.createdAt, updatedAt: resource.updatedAt,
    private: true,
  };
}

module.exports = {
  MAX_FILE_BYTES, buildChunkDocuments, cleanFileName, cleanTitle, decodeXmlText,
  destroyPrivateStorage, dispatchPrivateResource, downloadPrivateBuffer, extractPptxUnits,
  extractResource, fileHash, linkResourceToCheckin, mapResourceTopics, processPrivateStudyResource,
  publicPrivateResource, queuePrivateStudyResource, recoverPrivateStudyResources, signedPrivateUrl,
  splitText, startPrivateStudyResourceRecovery, uploadPrivateBuffer, validatePrivateStudyFile,
};
