const UserRating = require('../models/UserRating');
const RatingEvent = require('../models/RatingEvent');

const TIER_RANGES = [
  [1900, 'Grand Scholar'], [1700, 'Master'], [1500, 'Expert'],
  [1300, 'Specialist'], [1100, 'Explorer'], [900, 'Learner'], [0, 'Starter'],
];

function tierForRating(rating) {
  return TIER_RANGES.find(([minimum]) => rating >= minimum)?.[1] || 'Starter';
}

function expectedScore(userRating, questionRating) {
  return 1 / (1 + (10 ** ((questionRating - userRating) / 400)));
}

function kFactor(ratedCount) {
  if (ratedCount < 30) return 32;
  if (ratedCount < 100) return 20;
  return 16;
}

function calculateRatingChange(userRating, questionRating, actualScore, ratedCount = 0) {
  const expected = expectedScore(userRating, questionRating);
  const delta = Math.round(kFactor(ratedCount) * (Math.max(0, Math.min(1, actualScore)) - expected));
  return { expectedScore: expected, delta, newRating: Math.max(500, userRating + delta) };
}

async function applyRating({ userId, question, session, attempt }, dependencies = {}, retryCount = 0) {
  const RatingModel = dependencies.RatingModel || UserRating;
  const EventModel = dependencies.EventModel || RatingEvent;
  if (!session.ratingEligible || !question.ratingEligible || !attempt.firstAttempt || attempt.timeSpentSeconds < 5) return null;
  if (!['verified', 'reviewed'].includes(question.status) || question.needsReview) return null;
  if (!['mcq', 'objective', 'numerical'].includes(String(question.questionType || '').toLowerCase())) return null;
  if (attempt.evaluationMode !== 'objective') return null;
  if (await EventModel.exists({ userId, questionId: question._id })) return null;

  const snapshot = await RatingModel.findOne({ userId }).lean() || { globalRating: 1000, ratedCount: 0, subjectRatings: [], public: false };
  const questionRating = Number(question.questionRating) || ({ easy: 900, hard: 1300 }[question.difficulty] || 1100);
  const global = calculateRatingChange(Number(snapshot.globalRating || 1000), questionRating, attempt.actualScore, Number(snapshot.ratedCount || 0));
  const subjects = [...(snapshot.subjectRatings || [])];
  const index = subjects.findIndex((item) => item.subjectCode === attempt.subjectCode);
  const oldSubject = index >= 0 ? subjects[index] : { subjectCode: attempt.subjectCode, rating: 1000, ratedCount: 0, weeklyDelta: 0 };
  const subjectChange = calculateRatingChange(oldSubject.rating, questionRating, attempt.actualScore, oldSubject.ratedCount);
  const nextSubject = { ...oldSubject, rating: subjectChange.newRating, ratedCount: oldSubject.ratedCount + 1, weeklyDelta: Number(oldSubject.weeklyDelta || 0) + subjectChange.delta };
  if (index >= 0) subjects[index] = nextSubject; else subjects.push(nextSubject);

  let event;
  try {
    event = await EventModel.create({
      userId, subjectCode: attempt.subjectCode, questionId: question._id, sessionId: session._id, attemptId: attempt._id,
      oldRating: Number(snapshot.globalRating || 1000), questionRating, expectedScore: global.expectedScore,
      actualScore: attempt.actualScore, delta: global.delta, newRating: global.newRating,
    });
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
  let next;
  try {
    const snapshotFilter = snapshot._id
      ? { _id: snapshot._id, ratedCount: Number(snapshot.ratedCount || 0) }
      : { userId, ratedCount: { $exists: false } };
    next = await RatingModel.findOneAndUpdate(snapshotFilter, { $set: {
      globalRating: global.newRating,
      ratedCount: Number(snapshot.ratedCount || 0) + 1,
      weeklyDelta: Number(snapshot.weeklyDelta || 0) + global.delta,
      provisional: Number(snapshot.ratedCount || 0) + 1 < 20,
      subjectRatings: subjects,
      lastRatedAt: new Date(),
    }, $setOnInsert: { userId, public: Boolean(snapshot.public) } }, { upsert: !snapshot._id, new: true, setDefaultsOnInsert: true }).lean();
    if (!next) {
      await EventModel.deleteOne({ _id: event._id });
      if (retryCount < 3) return applyRating({ userId, question, session, attempt }, dependencies, retryCount + 1);
      throw Object.assign(new Error('Rating changed concurrently. Please retry the answer update.'), { code: 'RATING_CONFLICT' });
    }
  } catch (error) {
    // Preserve consistency if the snapshot write fails after claiming the
    // immutable first-attempt event.
    await EventModel.deleteOne({ _id: event._id }).catch(() => {});
    if (error?.code === 11000 && retryCount < 3) return applyRating({ userId, question, session, attempt }, dependencies, retryCount + 1);
    throw error;
  }
  return { delta: global.delta, oldRating: Number(snapshot.globalRating || 1000), ...next, tier: tierForRating(next.globalRating) };
}

module.exports = { applyRating, calculateRatingChange, expectedScore, kFactor, tierForRating };
