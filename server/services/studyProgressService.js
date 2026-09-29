const mongoose = require('mongoose');
const StudyProgress = require('../models/StudyProgress');

function clean(value, max = 240) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function recordStudyProgress(userId, input, dependencies = {}) {
  const Model = dependencies.Model || StudyProgress;
  const entityType = clean(input.entityType, 30).toLowerCase();
  const entityKey = clean(input.entityId || input.entityKey, 180);
  const route = clean(input.route);
  const title = clean(input.title || 'Continue studying');
  if (!StudyProgress.ENTITY_TYPES.includes(entityType) || !entityKey || !route.startsWith('/') || route.startsWith('//')) {
    const error = new Error('Invalid study progress'); error.statusCode = 400; throw error;
  }
  const entityId = mongoose.Types.ObjectId.isValid(entityKey) ? entityKey : null;
  const progress = Math.max(0, Math.min(100, Number(input.progress) || 0));
  return Model.findOneAndUpdate(
    { userId, entityType, entityKey },
    { $set: { entityId, title, route, subjectCode: clean(input.subjectCode, 40).toUpperCase(), status: ['opened', 'in_progress', 'completed'].includes(input.status) ? input.status : 'opened', progress, lastViewedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

async function listStudyProgress(userId, { limit = 12, Model = StudyProgress } = {}) {
  return Model.find({ userId }).sort({ lastViewedAt: -1 }).limit(Math.min(50, Math.max(1, Number(limit) || 12))).lean();
}

module.exports = { listStudyProgress, recordStudyProgress };
