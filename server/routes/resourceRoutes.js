const express = require('express');
const Resource = require('../models/Resource');
const Paper = require('../models/Paper');
const { RESOURCE_TYPES, isValidResourceType } = require('../data/resourceTypes');
const { resolveResourceSubjectKey } = require('../services/subjectPageService');

const router = express.Router();

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function publicResource(resource) {
  return resource;
}

router.get('/types', (req, res) => {
  res.json({ resourceTypes: RESOURCE_TYPES });
});

router.get('/subject/:subjectKey/summary', async (req, res) => {
  try {
    const subjectKey = resolveResourceSubjectKey(req.params.subjectKey);
    const resources = await Resource.find({ subjectKey, status: 'active' })
      .select('kind subjectKey subjectCode subjectShortCode subjectName branches semesters examType year views downloads updatedAt')
      .lean();

    if (!resources.length) {
      return res.status(404).json({ error: 'No resources found for this subject' });
    }

    const kindCounts = {};
    const examTypeCounts = {};
    const years = new Set();
    const branches = new Set();
    const semesters = new Set();
    let totalViews = 0;
    let totalDownloads = 0;

    resources.forEach((item) => {
      kindCounts[item.kind] = (kindCounts[item.kind] || 0) + 1;
      if (item.examType) examTypeCounts[item.examType] = (examTypeCounts[item.examType] || 0) + 1;
      if (item.year) years.add(item.year);
      (item.branches || []).forEach((branch) => branches.add(branch));
      (item.semesters || []).forEach((semester) => semesters.add(semester));
      totalViews += Number(item.views || 0);
      totalDownloads += Number(item.downloads || 0);
    });

    const first = resources[0];
    res.json({
      subjectKey,
      subjectCode: first.subjectCode || '',
      subjectShortCode: first.subjectShortCode || '',
      subjectName: first.subjectName,
      totalResources: resources.length,
      kindCounts,
      examTypeCounts,
      years: Array.from(years).sort((a, b) => b - a),
      branches: Array.from(branches).sort(),
      semesters: Array.from(semesters).sort((a, b) => a - b),
      totalViews,
      totalDownloads,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load subject resource summary' });
  }
});

router.get('/', async (req, res) => {
  try {
    const page = positiveInteger(req.query.page, 1);
    const limit = Math.min(positiveInteger(req.query.limit, 24), 100);
    const query = { status: 'active' };

    if (req.query.kind) {
      if (!isValidResourceType(req.query.kind)) {
        return res.status(400).json({ error: 'Invalid resource type' });
      }
      query.kind = req.query.kind;
    }
    if (req.query.subjectKey) query.subjectKey = resolveResourceSubjectKey(req.query.subjectKey);
    if (req.query.branch) query.branches = String(req.query.branch).trim().toUpperCase();
    if (req.query.semester) query.semesters = Number(req.query.semester);
    if (req.query.examType) query.examType = String(req.query.examType).trim();
    if (req.query.year) query.year = Number(req.query.year);

    const search = String(req.query.q || '').trim();
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { title: regex },
        { subjectName: regex },
        { subjectCode: regex },
        { subjectShortCode: regex },
        { tags: regex },
      ];
    }

    const [resources, total] = await Promise.all([
      Resource.find(query)
        .sort({ year: -1, updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Resource.countDocuments(query),
    ]);

    res.json({
      resources: resources.map(publicResource),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load resources' });
  }
});

async function incrementPublicResourceStat(req, res, field) {
  try {
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, status: 'active' },
      { $inc: { [field]: 1 } },
      { new: true }
    ).lean();

    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    if (resource.kind === 'question_paper' && resource.legacyPaperId) {
      await Paper.findByIdAndUpdate(resource.legacyPaperId, {
        $inc: { [field]: 1 },
        updatedAt: new Date(),
      });
    }

    return res.json({
      success: true,
      resourceId: resource._id,
      [field]: Number(resource[field] || 0),
    });
  } catch (error) {
    if (error?.name === 'CastError') return res.status(400).json({ error: 'Invalid resource id' });
    return res.status(500).json({ error: `Failed to record resource ${field}` });
  }
}

router.post('/:id/view', async (req, res) => {
  await incrementPublicResourceStat(req, res, 'views');
});

router.post('/:id/download', async (req, res) => {
  await incrementPublicResourceStat(req, res, 'downloads');
});

router.get('/:id', async (req, res) => {
  try {
    const resource = await Resource.findOne({ _id: req.params.id, status: 'active' }).lean();
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json(publicResource(resource));
  } catch (error) {
    res.status(400).json({ error: 'Invalid resource id' });
  }
});

module.exports = router;
