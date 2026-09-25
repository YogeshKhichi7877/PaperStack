const Resource = require('../models/Resource');
const {
  buildQuestionPaperResource,
  buildSolutionResource,
  toIdString,
} = require('./resourceMapper');

async function upsertMappedResource(mapped) {
  if (!mapped || !mapped.legacySourceKey) return null;
  return Resource.findOneAndUpdate(
    { legacySourceKey: mapped.legacySourceKey },
    { $set: mapped },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
}

async function syncResourceFromPaper(paper) {
  if (!paper || !paper._id) return { paperResource: null, solutionResource: null };

  const paperResource = await upsertMappedResource(buildQuestionPaperResource(paper));
  const solutionMapped = buildSolutionResource(paper, paperResource?._id || null);
  let solutionResource = null;

  if (solutionMapped) {
    solutionResource = await upsertMappedResource(solutionMapped);
  } else {
    await Resource.deleteOne({ legacySourceKey: `paper:${toIdString(paper._id)}:solution` });
  }

  return { paperResource, solutionResource };
}

async function removeResourcesForPaper(paperId) {
  if (!paperId) return;
  await Resource.deleteMany({ legacyPaperId: paperId });
}

async function incrementResourceStatForPaper(paperId, field) {
  if (!paperId || !['views', 'downloads'].includes(field)) return;
  await Resource.updateOne(
    { legacySourceKey: `paper:${toIdString(paperId)}:question_paper` },
    { $inc: { [field]: 1 } }
  );
}

module.exports = {
  incrementResourceStatForPaper,
  removeResourcesForPaper,
  syncResourceFromPaper,
  upsertMappedResource,
};
