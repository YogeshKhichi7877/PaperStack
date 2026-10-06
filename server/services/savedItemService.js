const mongoose = require('mongoose');
const SavedItem = require('../models/SavedItem');
const Paper = require('../models/Paper');
const Question = require('../models/Question');
const Resource = require('../models/Resource');
const User = require('../models/User');

const MODELS = { paper: Paper, question: Question, resource: Resource };

function cleanText(value, max = 240) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function verifyEntity(entityType, entityKey) {
  if (entityType === 'revision') return { _id: null };
  if (!mongoose.Types.ObjectId.isValid(entityKey)) return null;
  const Model = MODELS[entityType];
  if (!Model) return null;
  const filter = { _id: entityKey };
  if (entityType === 'question') { filter.status = { $ne: 'rejected' }; filter.needsReview = { $ne: true }; }
  if (entityType === 'resource') filter.status = 'active';
  return Model.findOne(filter).select('_id title questionText subject subjectName subjectCode').lean();
}

function defaultRoute(entityType, entityKey) {
  if (entityType === 'question') return `/questions/${encodeURIComponent(entityKey)}`;
  if (entityType === 'paper') return `/paper/${encodeURIComponent(entityKey)}`;
  if (entityType === 'resource') return `/resources/${encodeURIComponent(entityKey)}`;
  return '/revision-sheets';
}

async function saveItem(userId, input, dependencies = {}) {
  const Model = dependencies.Model || SavedItem;
  const entityType = cleanText(input.entityType, 30).toLowerCase();
  const entityKey = cleanText(input.entityId || input.entityKey, 180);
  if (!SavedItem.ENTITY_TYPES.includes(entityType) || !entityKey) {
    const error = new Error('Invalid saved item'); error.statusCode = 400; throw error;
  }
  const entity = await (dependencies.verifyEntity || verifyEntity)(entityType, entityKey);
  if (!entity) { const error = new Error('Item not found'); error.statusCode = 404; throw error; }
  const title = cleanText(input.title || entity.title || entity.questionText || entity.subjectName || entity.subject || 'Saved item');
  const requestedRoute = cleanText(input.route || '', 240);
  const safeRoute = requestedRoute.startsWith('/') && !requestedRoute.startsWith('//')
    ? requestedRoute
    : defaultRoute(entityType, entityKey);
  const saved = await Model.findOneAndUpdate(
    { userId, entityType, entityKey },
    { $set: { entityId: entity._id || null, title, route: safeRoute, subjectCode: cleanText(input.subjectCode || entity.subjectCode, 40).toUpperCase() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  if (entityType === 'paper' && entity._id) await User.updateOne({ _id: userId }, { $addToSet: { bookmarks: entity._id } });
  return saved;
}

async function listSavedItems(userId, { limit = 100, Model = SavedItem } = {}) {
  return Model.find({ userId }).sort({ updatedAt: -1 }).limit(Math.min(200, Math.max(1, Number(limit) || 100))).lean();
}

module.exports = { defaultRoute, listSavedItems, saveItem, verifyEntity };
