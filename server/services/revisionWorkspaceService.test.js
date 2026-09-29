const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRevisionWorkspace,
  compactAcademicText,
  parseRevisionAi,
} = require('./revisionWorkspaceService');

test('revision workspace only includes formulas and answers from approved source text', () => {
  const sheet = {
    priorityTopics: [{ topic: 'Clipping', occurrences: 3, years: [2024, 2025] }],
    mustPracticeQuestions: [{ _id: 'q1', questionText: 'Define clipping.', matchedTopic: 'Clipping' }],
  };
  const workspace = buildRevisionWorkspace(sheet, {
    questions: [{ _id: 'q1' }],
    solutions: [{ questionId: 'q1', answerText: 'Clipping removes invisible portions. $x+y=1$' }],
    resources: [{ _id: 'r1', title: 'Notes', contentText: 'Formula: $a=b$', fileUrl: '/notes.pdf' }],
  });
  assert.equal(workspace.mustRevise[0].questionId, 'q1');
  assert.deepEqual(workspace.formulas.map((item) => item.latex), ['x+y=1', 'a=b']);
  assert.equal(workspace.definitions[0].answer.includes('Clipping removes'), true);
  assert.equal(workspace.rapidRecall[0].questionId, 'q1');
  assert.equal(workspace.resources[0].url, '/notes.pdf');
});

test('AI recall notes reject unknown source ids and invalid JSON', () => {
  const parsed = parseRevisionAi(JSON.stringify({
    briefing: 'Review clipping.',
    notes: [{ sourceId: 'q1', text: 'Source-backed' }, { sourceId: 'missing', text: 'Unsupported' }],
    mistakes: [{ sourceId: 'missing', text: 'Invented' }],
  }), new Set(['q1']));
  assert.deepEqual(parsed.notes, [{ sourceId: 'q1', text: 'Source-backed' }]);
  assert.deepEqual(parsed.mistakes, []);
  assert.deepEqual(parseRevisionAi('not json', new Set(['q1'])).notes, []);
});

test('AI formula cards require an exact expression in an approved answer', () => {
  const parsed = parseRevisionAi(JSON.stringify({ formulas: [
    { sourceId: 'q1', sourceExpression: 'E=mc^2', latex: 'E=mc^{2}' },
    { sourceId: 'q1', sourceExpression: 'invented', latex: 'x=10' },
  ] }), new Set(['q1']), new Map([['q1', 'Use E=mc^2 here.']]));
  assert.equal(parsed.formulas.length, 1);
  assert.equal(parsed.formulas[0].latex, 'E=mc^{2}');
});

test('resource-backed AI formulas retain the resource link', () => {
  const parsed = parseRevisionAi(JSON.stringify({ formulas: [
    { sourceId: 'r1', sourceExpression: 'x^2+y^2', latex: 'x^{2}+y^{2}' },
  ] }), new Set(), new Map([['r1', 'Use x^2+y^2']]), new Map([['r1', '/notes.pdf']]));
  assert.equal(parsed.formulas[0].resourceId, 'r1');
  assert.equal(parsed.formulas[0].url, '/notes.pdf');
});

test('academic text compaction preserves Markdown structure and removes excess blank lines', () => {
  const text = compactAcademicText('## Heading\r\n\r\n\r\n- First\r\n- Second   ', 200);
  assert.equal(text, '## Heading\n\n- First\n- Second');
});

test('revision answers and AI notes retain headings, lists, and table rows', () => {
  const sheet = {
    priorityTopics: [{ topic: 'PESTLE', occurrences: 2 }],
    mustPracticeQuestions: [{ _id: 'q1', questionText: 'Explain PESTLE.', matchedTopic: 'PESTLE' }],
  };
  const answer = '## Checklist\n\n- Political\n- Economic\n\n| Factor | Recall |\n| --- | --- |\n| P | Policy |';
  const workspace = buildRevisionWorkspace(sheet, {
    questions: [{ _id: 'q1' }],
    solutions: [{ questionId: 'q1', answerText: answer }],
  });
  const parsed = parseRevisionAi(JSON.stringify({
    briefing: '## Focus\n\n- Review factors',
    notes: [{ sourceId: 'q1', text: '**PESTLE**\n\n1. Political\n2. Economic' }],
  }), new Set(['q1']));

  assert.equal(workspace.rapidRecall[0].answer.includes('\n- Political'), true);
  assert.equal(workspace.rapidRecall[0].answer.includes('\n| --- | --- |'), true);
  assert.equal(parsed.briefing, '## Focus\n\n- Review factors');
  assert.equal(parsed.notes[0].text.includes('\n1. Political'), true);
});
