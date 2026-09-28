const express = require('express');

const {
  searchV2,
} = require('../services/searchV2Service');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    return res.json(
      await searchV2({
        q: req.query.q,
        type: req.query.type,
        branch: req.query.branch,
        semester: req.query.semester,
        year: req.query.year,
        examType: req.query.examType,
        kind: req.query.kind,
        limit: req.query.limit,
      })
    );
  } catch (error) {
    console.error(
      'Search V2 failed:',
      error
    );

    return res.status(500).json({
      error: 'Search failed',
    });
  }
});

module.exports = router;
