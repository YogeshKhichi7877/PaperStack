const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Question = require('../models/Question');
const QuestionSolution = require('../models/QuestionSolution');
const GeneratedMock = require('../models/GeneratedMock');
const novel = require('../services/mockNovelService');

const bank = [
  { _id: '507f1f77bcf86cd799439011', questionText: 'Explain triangular membership functions for fuzzy temperature control.',
    marks: 4, subjectCode: 'CS-514', subject: 'Fuzzy Logic', primaryTopic: 'Membership functions', topics: ['Membership functions'], examType: 'End-Sem' },
  { _id: '507f1f77bcf86cd799439012', questionText: 'Compute the max-min composition of two fuzzy relation matrices.',
    marks: 6, subjectCode: 'CS-514', subject: 'Fuzzy Logic', primaryTopic: 'Fuzzy relations', topics: ['Fuzzy relations'], examType: 'End-Sem' },
];
const stored = new Map();
let lastFilter;
let lastOptions;
let lastTemplates;
Question.find = (filter) => {
  lastFilter = filter;
  const query = { sort: () => query, limit: () => query, populate: () => query,
    lean: async () => bank };
  return query;
};
Question.findById = (id) => ({ lean: async () => bank.find((item) => item._id === String(id)) });
QuestionSolution.aggregate = async () => [];
GeneratedMock.findOneAndUpdate = async (_filter, record) => { stored.set(record.mockId, record); };
GeneratedMock.findOne = async ({ mockId }) => {
  const record = stored.get(mockId);
  return record ? Object.assign(record, { markModified() {}, async save() {} }) : null;
};
novel.generateNovelQuestions = async (templates, _archive, options) => {
  lastOptions = options;
  lastTemplates = templates;
  return templates.map((source, index) => ({
    ...source, _id: require('node:crypto').randomBytes(12).toString('hex'),
    sourceQuestionId: String(source.archiveQuestionId || source._id), generationSlotId: String(source._id),
    source: 'generated', difficulty: options.difficulty === 'hard' ? 'hard' : 'easy',
    questionText: `Fresh ${source.primaryTopic} scenario ${index}: evaluate $\\mu_A(x)=\\frac{x}{10}$.`,
    expectedAnswer: 'Private server-only expected answer', keyPoints: ['Method', 'Conclusion'],
    markingScheme: [{ criterion: 'Correct work', marks: source.marks }], year: null,
  }));
};

test('generation API returns all AI slots, stores private rubrics, and replacements keep planned marks', async () => {
  process.env.AI_ENABLED = 'true';
  process.env.MOCK_AI_ENABLED = 'true';
  process.env.GROQ_API_KEY = 'local-test-key';
  const app = express();
  app.use(express.json());
  app.use('/api/mock-exams', require('./mockExamRoutes'));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const request = async (path, body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/mock-exams/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    const { status, data: mock } = await request('generate', {
      subjectCode: ' cs-514 ', examType: 'End-Sem', mockType: 'new', difficulty: 'hard',
      totalMarks: 25, durationMinutes: 20, strategy: 'broad-coverage', seed: 'route-test',
    });
    assert.equal(status, 200);
    assert.equal(lastFilter.subjectCode, 'CS-514');
    assert.equal(lastFilter.examType, 'End-Sem');
    assert.equal(mock.generatedMarks, 25);
    assert.equal(mock.durationMinutes, 20);
    assert.equal(mock.questions.length, 5);
    assert.ok(mock.questions.every((item) => item.aiGenerated && item.source === 'generated'));
    assert.ok(!JSON.stringify(mock).includes('Private server-only expected answer'));
    assert.equal(stored.get(mock.mockId).questions.length, 5);
    for (const direction of ['similar', 'easier', 'harder', 'replace']) {
      const current = stored.get(mock.mockId).questions[0];
      const { status: replacementStatus, data } = await request('regenerate-question', {
        mockId: mock.mockId, questionId: current._id, number: 1, direction,
      });
      assert.equal(replacementStatus, 200);
      assert.equal(data.question.marks, 5);
      assert.equal(data.question.aiGenerated, true);
      assert.equal(lastTemplates[0].marks, 5);
      assert.equal(lastOptions.direction, direction);
      assert.ok(!JSON.stringify(data).includes('Private server-only expected answer'));
    }
    const { status: pyqStatus, data: pyq } = await request('generate', {
      subjectCode: 'CS-514', mockType: 'pyq', totalMarks: 25,
    });
    assert.equal(pyqStatus, 200);
    assert.equal(pyq.generatedMarks, 10);
    assert.ok(pyq.warnings.length);
    assert.ok(pyq.questions.every((item) => !item.aiGenerated));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
