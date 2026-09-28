const test = require('node:test');
const assert = require('node:assert/strict');

const {
  aggregateSubjectTrends,
  aggregateTopicTrends,
  paperTrendScore,
  startDayKey,
  uniqueTopics,
} = require('./trendingMetrics');

test('downloads have stronger weight than views', () => {
  assert.equal(
    paperTrendScore({
      views: 10,
      downloads: 2,
    }),
    16
  );
});

test('seven day window includes current day', () => {
  assert.equal(
    startDayKey(
      '7d',
      new Date('2026-09-26T10:00:00Z')
    ),
    '2026-09-20'
  );
});

test('topic extraction removes duplicates', () => {
  assert.deepEqual(
    uniqueTopics({
      primaryTopic: 'Regression',
      topics: ['Regression', 'MLE'],
    }),
    ['Regression', 'MLE']
  );
});

test('subject trends aggregate paper scores', () => {
  const result = aggregateSubjectTrends([
    {
      subjectCode: 'CS501',
      subject: 'Data Science',
      trendScore: 10,
      recentViews: 7,
      recentDownloads: 1,
    },
    {
      subjectCode: 'CS501',
      subject: 'Data Science',
      trendScore: 15,
      recentViews: 9,
      recentDownloads: 2,
    },
  ]);

  assert.equal(result[0].score, 25);
  assert.equal(result[0].papers, 2);
});

test('topic receives a paper score only once per paper', () => {
  const result = aggregateTopicTrends({
    papers: [
      {
        _id: 'p1',
        trendScore: 20,
      },
    ],
    questions: [
      {
        paperId: 'p1',
        primaryTopic: 'Projection',
        topics: ['Projection'],
      },
      {
        paperId: 'p1',
        topics: ['Projection'],
      },
    ],
  });

  assert.equal(result[0].score, 20);
  assert.equal(result[0].papers, 1);
});
