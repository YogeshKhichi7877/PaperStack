const {
  removeResourcesForPaper,
  syncResourceFromPaper,
} = require('../services/resourceService');

function logSyncWarning(action, error) {
  console.warn(`[PaperStack Resource Sync] ${action} failed:`, error?.message || error);
}

module.exports = function paperResourceSyncPlugin(schema) {
  schema.post('save', function syncSavedPaper(doc, next) {
    syncResourceFromPaper(doc)
      .catch((error) => logSyncWarning('paper sync', error))
      .finally(() => next());
  });

  schema.post('findOneAndDelete', function syncDeletedPaper(doc, next) {
    if (!doc?._id) return next();
    removeResourcesForPaper(doc._id)
      .catch((error) => logSyncWarning('paper cleanup', error))
      .finally(() => next());
  });
};
