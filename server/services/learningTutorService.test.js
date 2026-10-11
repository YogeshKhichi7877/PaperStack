const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPrompt, parseTutorResponse, suggestedActions, tutorReply } = require('./learningTutorService');

test('tutor prompt prioritizes private material and compact student evidence', () => {
  const prompt = buildPrompt({
    subjectName: 'Operating System', subjectCode: 'CS301', topicName: 'Semaphore', mode: 'EXAMPLE', question: 'Show me wait and signal.',
    studentContext: { learningLevel: 'DEVELOPING', recentMistakes: [{ question: 'wait()', score: 0 }] },
    sourceContext: { privateChunks: [{ title: 'Lecture 5', locatorType: 'SLIDE', locatorNumber: 8, text: 'wait decrements the semaphore' }], verifiedResources: [] },
    previousMessages: [],
  });
  assert.match(prompt, /private class material first/i);
  assert.match(prompt, /DEVELOPING/);
  assert.match(prompt, /Lecture 5/);
  assert.match(prompt, /Never invent a professor statement/i);
});

test('tutor response parser rejects prose and limits structured fields', () => {
  assert.throws(() => parseTutorResponse('plain prose'), /invalid/);
  const parsed = parseTutorResponse(JSON.stringify({ title: 'Semaphore', explanation: 'A counter.', keyPoints: ['one'], suggestedActions: ['Practice now'] }));
  assert.equal(parsed.title, 'Semaphore');
  assert.deepEqual(parsed.keyPoints, ['one']);
  assert.deepEqual(parsed.suggestedActions, []);
});

test('tutor follow-up labels are deterministic and topic-aware', () => {
  assert.deepEqual(suggestedActions('SIMPLE', 'Semaphore'), ['Show an example', 'Go deeper', 'Compare with Mutex', 'Practice now']);
});

test('AI outage returns learning sources without changing mastery', async () => {
  const result = await tutorReply('user-1', {
    subjectCode: 'CS301', subjectName: 'Operating System', topicKey: 'CS301:semaphore', topicName: 'Semaphore', mode: 'SIMPLE',
  }, {
    env: { AI_ENABLED: 'true' },
    listTopics: async () => [{ topicKey: 'CS301:semaphore', name: 'Semaphore' }],
    buildContext: async () => ({ learningLevel: 'DEVELOPING', mastery: { score: 42, confidence: 0.3 } }),
    retrieveContext: async () => ({ privateChunks: [], verifiedResources: [], sources: [{ sourceType: 'PAPERSTACK_RESOURCE', resourceId: 'r1', title: 'OS notes' }] }),
  });
  assert.equal(result.available, false);
  assert.equal(result.fallback, true);
  assert.equal(result.studentContext.mastery.score, 42);
  assert.equal(result.sources[0].title, 'OS notes');
});
