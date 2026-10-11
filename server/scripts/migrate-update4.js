require('dotenv').config();

const mongoose = require('mongoose');
const Question = require('../models/Question');
const User = require('../models/User');
const UserRating = require('../models/UserRating');
const { normalizeTopic, topicKey } = require('../services/topicCatalogService');

const APPLY = process.argv.includes('--apply');
const DB_NAME = process.env.MONGODB_DB_NAME || 'PaperStack';

function derivedTopicKeys(question) {
  return [...new Set([question.primaryTopic, ...(question.topics || [])]
    .map(normalizeTopic)
    .filter(Boolean)
    .map((name) => topicKey(question.subjectCode, name)))];
}

async function main() {
  const uri = String(process.env.MONGODB_URI_STANDARD || process.env.MONGODB_URI || '').trim();
  if (!uri) throw new Error('MONGODB_URI or MONGODB_URI_STANDARD is required.');
  await mongoose.connect(uri, {
    dbName: DB_NAME,
    serverSelectionTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 15000),
  });

  const summary = {
    mode: APPLY ? 'apply' : 'dry-run',
    questionsScanned: 0,
    questionsWithTopicsToBackfill: 0,
    ratingSnapshotsToCreate: 0,
  };
  const questionWrites = [];
  const cursor = Question.find({
    $or: [{ topicKeys: { $exists: false } }, { topicKeys: { $size: 0 } }],
    subjectCode: { $nin: [null, ''] },
  }).select('_id subjectCode primaryTopic topics').lean().cursor();

  for await (const question of cursor) {
    summary.questionsScanned += 1;
    const keys = derivedTopicKeys(question);
    if (!keys.length) continue;
    summary.questionsWithTopicsToBackfill += 1;
    questionWrites.push({ updateOne: { filter: { _id: question._id, $or: [{ topicKeys: { $exists: false } }, { topicKeys: { $size: 0 } }] }, update: { $set: { topicKeys: keys } } } });
    if (APPLY && questionWrites.length >= 500) {
      await Question.bulkWrite(questionWrites, { ordered: false });
      questionWrites.length = 0;
    }
  }
  if (APPLY && questionWrites.length) await Question.bulkWrite(questionWrites, { ordered: false });

  const usersWithoutRatings = await User.aggregate([
    { $lookup: { from: UserRating.collection.name, localField: '_id', foreignField: 'userId', as: 'rating' } },
    { $match: { rating: { $size: 0 } } },
    { $project: { _id: 1, academicProfilePublic: 1 } },
  ]);
  summary.ratingSnapshotsToCreate = usersWithoutRatings.length;
  if (APPLY && usersWithoutRatings.length) {
    await UserRating.bulkWrite(usersWithoutRatings.map((user) => ({
      updateOne: {
        filter: { userId: user._id },
        update: { $setOnInsert: { globalRating: 1000, ratedCount: 0, weeklyDelta: 0, subjectRatings: [], provisional: true, public: user.academicProfilePublic === true } },
        upsert: true,
      },
    })), { ordered: false });
  }

  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
