const express = require('express');

const {
  getBranchCompetition,
} = require('../services/branchCompetitionService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const period = ['7d', '30d', 'all'].includes(req.query.period)
      ? req.query.period
      : '30d';

    return res.json(
      await getBranchCompetition(period)
    );
  } catch (error) {
    console.error(
      'Branch competition failed:',
      error
    );

    return res.status(500).json({
      error: 'Failed to load branch competition',
    });
  }
});

module.exports = router;
