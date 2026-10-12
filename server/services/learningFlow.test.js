const test = require('node:test');
const assert = require('node:assert/strict');
const { createPracticeSession, evaluateAnswer } = require('./practiceService');
const { publicQuestion } = require('./questionService');
const { tutorReply } = require('./learningTutorService');

const topic = { topicKey: 'CS302:sql', name: 'SQL' };
const question = { _id: 'q1', subjectCode: 'CS302', questionText: 'Which is not a numeric SQL type?', questionType: 'mcq', answerKey: 'CHARACTER', answerExplanation: 'CHARACTER stores text. INTEGER, FLOAT and DECIMAL store numeric values.', options: ['INTEGER', 'FLOAT', 'CHARACTER', 'DECIMAL'], marks: 2, difficulty: 'easy', status: 'reviewed', topicKeys: [topic.topicKey] };
function query(value) { return { select() { return this; }, sort() { return this; }, limit() { return this; }, lean: async () => value }; }

test('MCQ marking returns the correct choice and short explanation only after submission', async () => {
  const result = await evaluateAnswer(question, 'DECIMAL');
  assert.equal(result.correct, false);
  assert.equal(result.correctAnswer, 'CHARACTER');
  assert.match(result.explanation, /stores text/);
  assert.equal(publicQuestion(question).answerKey, undefined);
  assert.equal(publicQuestion(question).answerExplanation, undefined);
  assert.equal((await evaluateAnswer(question, 'CHARACTER')).actualScore, 1);
});

test('an explanation outage does not fail objective marking', async () => {
  const result = await evaluateAnswer({ ...question, answerExplanation: '' }, 'CHARACTER', {
    env: { AI_ENABLED: 'true', GROQ_API_KEY: 'fixture-key' },
    generateExplanation: async () => { throw new Error('Provider unavailable'); },
  });
  assert.equal(result.correct, true);
  assert.equal(result.correctAnswer, 'CHARACTER');
  assert.equal(result.explanation, '');
});

test('an empty topic bank generates inventory before selecting a session', async () => {
  let inventory = [];
  let generated = 0;
  const result = await createPracticeSession('student', { subjectCode: 'CS302', topics: [topic], mode: 'TOPIC', count: 3 }, {
    listTopics: async () => [topic],
    QuestionModel: { find: () => query(inventory) },
    AttemptModel: { find: () => query([]) },
    MasteryModel: { find: () => query([]) },
    generateInventory: async () => { generated++; inventory = [question]; },
    SessionModel: { create: async (data) => ({ _id: 's1', toObject: () => ({ ...data, _id: 's1' }) }) },
  });
  assert.equal(generated, 1);
  assert.equal(result.questions[0]._id, 'q1');
  assert.equal(result.questions[0].answerKey, undefined);
});

test('saved class resumes its unfinished practice without generating a new session', async () => {
  let filter;
  const result = await createPracticeSession('student', { checkinId: 'c1' }, {
    CheckinModel: { findOne: (value) => { filter = value; return query({ _id: 'c1', practiceSessionId: 's1' }); } },
    SessionModel: { findOne: () => query({ _id: 's1', userId: 'student', completedAt: null }) },
  });
  assert.deepEqual(filter, { _id: 'c1', userId: 'student' });
  assert.equal(result.session._id, 's1');
  assert.equal(result.resumed, true);
});

test('another user cannot start practice from a private class', async () => {
  await assert.rejects(createPracticeSession('other-student', { checkinId: 'private-class' }, {
    CheckinModel: { findOne: () => query(null) },
  }), (error) => error.statusCode === 404);
});

test('saved tutor reply resumes without an AI call even with AI disabled', async () => {
  let filter;
  const saved = { _id: 't1', lastMode: 'EXAMPLE', sources: [], messages: [{ role: 'tutor', content: JSON.stringify({ title: 'SQL types', explanation: 'CHARACTER stores text.' }) }] };
  const result = await tutorReply('student', { subjectCode: 'CS302', topicKey: topic.topicKey, topicName: topic.name, resume: true }, {
    env: { AI_ENABLED: 'false' }, listTopics: async () => [topic],
    SessionModel: { findOne: (value) => { filter = value; return { sort: async () => saved }; } },
    buildContext: async () => { throw new Error('Should not need a fresh context'); },
  });
  assert.equal(filter.userId, 'student');
  assert.equal(result.resumed, true);
  assert.equal(result.reply.explanation, 'CHARACTER stores text.');
});
