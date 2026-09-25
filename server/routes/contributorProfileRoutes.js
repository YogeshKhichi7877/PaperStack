const express = require('express');
const {
  getContributorsLeaderboard,
  getContributorProfile,
  getOwnContributorProfile,
  getXpRules,
} = require('../services/contributorProfileService');

function createContributorProfileRoutes({ authenticate }) {
  if (typeof authenticate !== 'function') {
    throw new Error('Contributor profile routes require authenticate middleware');
  }

  const router = express.Router();

  router.get('/leaderboard', async (req, res) => {
    try {
      res.json(await getContributorsLeaderboard());
    } catch (error) {
      console.error('Contributor leaderboard failed:', error.message);
      res.status(500).json({ error: 'Failed to load contributor leaderboard' });
    }
  });

  router.get('/rules', (req, res) => {
    res.json(getXpRules());
  });

  router.get('/me/profile', authenticate, async (req, res) => {
    try {
      const profile = await getOwnContributorProfile(req.user._id || req.user.id);
      if (!profile) return res.status(404).json({ error: 'User not found' });
      return res.json(profile);
    } catch (error) {
      console.error('Own contributor profile failed:', error.message);
      return res.status(500).json({ error: 'Failed to load your contributor profile' });
    }
  });

  router.get('/:contributorId/profile', async (req, res) => {
    try {
      const profile = await getContributorProfile(req.params.contributorId);
      if (!profile) return res.status(404).json({ error: 'Contributor profile not found' });
      return res.json(profile);
    } catch (error) {
      console.error('Contributor profile failed:', error.message);
      return res.status(500).json({ error: 'Failed to load contributor profile' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      res.json(await getContributorsLeaderboard());
    } catch (error) {
      console.error('Contributors list failed:', error.message);
      res.status(500).json({ error: 'Failed to load contributors' });
    }
  });

  return router;
}

module.exports = { createContributorProfileRoutes };
