const PrivateStudyResourceChunk = require('../models/PrivateStudyResourceChunk');
const PrivateStudyResource = require('../models/PrivateStudyResource');
const Resource = require('../models/Resource');

const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'what', 'which', 'with']);

function tokens(value) {
  return [...new Set(String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((token) => token.length > 2 && !STOP_WORDS.has(token)))];
}

function relevance(text, queryTokens) {
  const normalized = String(text || '').toLowerCase();
  return queryTokens.reduce((score, token) => score + (normalized.includes(token) ? 1 : 0), 0);
}

async function retrieveLearningContext({ userId, subjectCode = '', query = '', topicKeys = [], maxPrivateChunks = 6, maxVerifiedResources = 3 }, dependencies = {}) {
  const ChunkModel = dependencies.ChunkModel || PrivateStudyResourceChunk;
  const PrivateResourceModel = dependencies.PrivateResourceModel || PrivateStudyResource;
  const ResourceModel = dependencies.ResourceModel || Resource;
  const normalizedCode = String(subjectCode || '').trim().toUpperCase();
  const queryTokens = tokens(query);
  const privateQuery = { userId };
  if (normalizedCode) privateQuery.subjectCode = normalizedCode;
  if (topicKeys.length) privateQuery.topicKeys = { $in: topicKeys.slice(0, 12) };

  const [chunkRows, verifiedRows] = await Promise.all([
    userId ? ChunkModel.find(privateQuery).sort({ createdAt: -1 }).limit(160).lean() : [],
    ResourceModel.find({
      status: 'active',
      ...(normalizedCode ? { subjectCode: normalizedCode } : {}),
      contentText: { $type: 'string', $ne: '' },
    }).sort({ updatedAt: -1 }).limit(40).select('_id title subjectCode subjectName kind contentText topics fileUrl').lean(),
  ]);

  const resourceIds = [...new Set(chunkRows.map((row) => String(row.resourceId)))];
  const privateResources = resourceIds.length
    ? await PrivateResourceModel.find({ _id: { $in: resourceIds }, userId, processingStatus: 'READY' }).select('_id title originalFileName').lean()
    : [];
  const privateById = new Map(privateResources.map((row) => [String(row._id), row]));

  const privateChunks = chunkRows
    .filter((row) => privateById.has(String(row.resourceId)))
    .map((row) => ({ ...row, score: relevance(`${row.heading} ${row.text}`, queryTokens) }))
    .filter((row) => !queryTokens.length || row.score > 0)
    .sort((a, b) => b.score - a.score || a.chunkIndex - b.chunkIndex)
    .slice(0, maxPrivateChunks)
    .map((row) => {
      const resource = privateById.get(String(row.resourceId));
      return {
        sourceType: 'PRIVATE_CLASS_MATERIAL', resourceId: String(row.resourceId),
        title: resource.title || resource.originalFileName || 'Class material',
        locatorType: row.locatorType, locatorNumber: row.locatorNumber,
        heading: row.heading || '', text: row.text, topicKeys: row.topicKeys || [],
      };
    });

  const verifiedResources = verifiedRows
    .map((row) => ({ ...row, score: relevance(`${row.title} ${(row.topics || []).join(' ')} ${row.contentText}`, queryTokens) }))
    .filter((row) => !queryTokens.length || row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxVerifiedResources)
    .map((row) => ({
      sourceType: 'PAPERSTACK_RESOURCE', resourceId: String(row._id), title: row.title,
      kind: row.kind, text: String(row.contentText || '').slice(0, 1800), fileUrl: row.fileUrl || '',
    }));

  return {
    privateChunks,
    verifiedResources,
    sources: [
      ...privateChunks.map((item) => ({ sourceType: item.sourceType, resourceId: item.resourceId, title: item.title, locatorType: item.locatorType, locatorNumber: item.locatorNumber })),
      ...verifiedResources.map((item) => ({ sourceType: item.sourceType, resourceId: item.resourceId, title: item.title, kind: item.kind, fileUrl: item.fileUrl })),
    ],
  };
}

function formatLearningContext(context = {}) {
  const privateText = (context.privateChunks || []).map((item, index) => [
    `Private class material ${index + 1}: ${item.title}`,
    `${item.locatorType === 'SLIDE' ? 'Slide' : item.locatorType === 'PAGE' ? 'Page' : 'Document'}${item.locatorNumber ? ` ${item.locatorNumber}` : ''}`,
    item.text,
  ].join('\n')).join('\n\n');
  const verifiedText = (context.verifiedResources || []).map((item, index) => [
    `Verified PaperStack resource ${index + 1}: ${item.title}`,
    item.text,
  ].join('\n')).join('\n\n');
  return { privateText, verifiedText };
}

module.exports = { formatLearningContext, relevance, retrieveLearningContext, tokens };
