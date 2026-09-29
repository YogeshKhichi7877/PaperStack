const test = require('node:test');
const assert = require('node:assert/strict');
const cases = require('../test-fixtures/ai-regression-cases.json');
const { TASK_ROUTES } = require('./aiService');
const { evaluateExpression, equivalentValues } = require('./mathVerificationService');

test('permanent AI regression fixture covers core academic tasks', () => {
  const tasks = new Set(cases.map((item) => item.task));
  for (const task of ['QUESTION_TUTOR', 'NUMERICAL_REASONING', 'MOCK_GENERATION',
    'MOCK_EVALUATION', 'QUESTION_EXTRACTION_TEXT', 'METADATA_EXTRACTION_TEXT',
    'REVISION_CONTENT', 'WAR_ROOM_BRIEFING']) {
    assert.equal(tasks.has(task), true);
    assert.ok(TASK_ROUTES[task]);
  }
});

test('numeric regression fixtures remain deterministically correct', () => {
  for (const fixture of cases.filter((item) => item.expression)) {
    assert.equal(equivalentValues(evaluateExpression(fixture.expression), fixture.expected), true, fixture.id);
  }
});
