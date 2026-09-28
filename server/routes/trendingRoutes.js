const express = require('express');

const {
  getTrending,
} = require('../services/trendingService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    return res.json(
      await getTrending({
        period: req.query.period,
        branch: req.query.branch,
        semester: req.query.semester,
      })
    );
  } catch (error) {
    console.error(
      'Trending failed:',
      error
    );

    return res.status(500).json({
      error: 'Failed to load trending archive activity',
    });
  }
});

module.exports = router;
