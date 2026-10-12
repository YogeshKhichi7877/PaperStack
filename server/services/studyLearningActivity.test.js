const test = require('node:test');
const assert = require('node:assert/strict');
const { learningActivities } = require('./studyActivityService');
const { buildStreakSnapshot } = require('./streakService');

test('saved classes and submitted answers feed existing progress without double-counting active days', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const queries = [];
  const model = (rows) => ({ aggregate: async (pipeline) => { queries.push(pipeline); return rows; } });
  const activities = await learningActivities(userId, {
    Checkin: model([{ _id: '2026-10-11', eventCount: 2 }]),
    Attempt: model([{ _id: '2026-10-11', eventCount: 5 }, { _id: '2026-10-12', eventCount: 3 }]),
  });
  assert.equal(queries.length, 2);
  for (const query of queries) {
    assert.equal(String(query[0].$match.userId), userId);
    assert.equal(query[1].$group._id.$dateToString.timezone, 'Asia/Kolkata');
  }
  const snapshot = buildStreakSnapshot({ activities: [...activities, { dayKey: '2026-10-11', categories: ['questions'], eventCount: 1 }], todayKey: '2026-10-12' });
  assert.equal(snapshot.activeDays, 2);
  assert.equal(snapshot.currentStreak, 2);
  assert.equal(snapshot.categoryDayCounts.learn, 1);
  assert.equal(snapshot.categoryDayCounts.practice, 2);
});
