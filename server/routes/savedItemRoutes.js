const express = require('express');
const SavedItem = require('../models/SavedItem');
const User = require('../models/User');
const { listSavedItems, saveItem } = require('../services/savedItemService');

function createSavedItemRoutes({ authenticate }) {
  const router = express.Router();
  router.get('/', authenticate, async (req, res) => {
    try { return res.json({ items: await listSavedItems(req.user._id || req.user.id, { limit: req.query.limit }) }); }
    catch { return res.status(500).json({ error: 'Failed to load saved items' }); }
  });
  router.post('/', authenticate, async (req, res) => {
    try { return res.status(201).json({ item: await saveItem(req.user._id || req.user.id, req.body || {}) }); }
    catch (error) { return res.status(Number(error.statusCode || 500)).json({ error: error.statusCode ? error.message : 'Failed to save item' }); }
  });
  router.delete('/:entityType/:entityKey', authenticate, async (req, res) => {
    try {
      await SavedItem.deleteOne({ userId: req.user._id || req.user.id, entityType: req.params.entityType, entityKey: req.params.entityKey });
      if (req.params.entityType === 'paper') await User.updateOne({ _id: req.user._id || req.user.id }, { $pull: { bookmarks: req.params.entityKey } });
      return res.json({ success: true });
    } catch { return res.status(500).json({ error: 'Failed to remove saved item' }); }
  });
  return router;
}

module.exports = { createSavedItemRoutes };
