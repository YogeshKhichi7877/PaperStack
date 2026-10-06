const test = require('node:test');
const assert = require('node:assert/strict');
const { PAGE_BREAK, extractQuestionsFromText, extractMarks } = require('./questionExtractionRules');
test('combined numeric labels and nested Roman parts retain shared stems and math', () => {
  const r = extractQuestionsFromText(`Q1. Consider the following system x² + y₂ = 3.
(a) Use the given values to:
(i) Calculate the first output. [2]
(ii) Calculate the second output. [3]
(b) Explain the stability of the system. [5]
2(a) Explain the next model. [4]`);
  assert.deepEqual(r.questions.map(q => q.questionKey), ['q1-a-i', 'q1-a-ii', 'q1-b', 'q2-a']);
  assert.match(r.questions[0].questionText, /x² \+ y₂/);
  assert.match(r.questions[0].questionText, /Use the given values/);
  assert.doesNotMatch(r.questions[2].questionText, /Use the given values/);
});
test('standalone Roman and uppercase labels are supported', () => {
  assert.deepEqual(extractQuestionsFromText('Q1\n(i) Explain the first model. [2]\n(ii) Explain the second model. [3]').questions.map(q=>q.questionKey), ['q1-i','q1-ii']);
  assert.deepEqual(extractQuestionsFromText('A. Explain the first model. [2]\nB. Explain the second model. [3]').questions.map(q=>q.questionKey), ['qA','qB']);
});
test('OR alternatives survive and share a choice group with attempt instructions', () => {
  const r = extractQuestionsFromText('Attempt any 2 questions\nQ1. Explain virtualization. [5]\nOR\nQ1. Explain containers. [5]\nOR\nQ1. Explain memory segmentation. [5]\nQ2. Discuss memory paging. [5]');
  assert.equal(r.questions.length,4);
  assert.equal(r.questions[0].choiceGroup,r.questions[1].choiceGroup);
  assert.ok(r.questions[0].choiceGroup);
  assert.equal(r.questions[2].choiceGroup,r.questions[0].choiceGroup);
  assert.equal(r.questions[3].choiceGroup,'');
  assert.match(r.questions[3].choiceInstructions,/any 2/);
});
test('marks sums and annotations are extracted without guessing absent marks', () => {
  for (const a of ['[5]','[5 Marks]','(5 Marks)','5 marks','[2+3]','5M']) assert.equal(extractMarks(`Explain paging. ${a}`).marks,5);
  const q = extractQuestionsFromText('Q1. Calculate f(5)').questions[0];
  assert.equal(q.marks,null); assert.equal(q.needsReview,true);
});
test('multi-page questions preserve pages and math line breaks', () => {
  const r = extractQuestionsFromText(`${PAGE_BREAK}\nQ5. Consider the system\nx² + y² = 4\n${PAGE_BREAK}\nPage 2 of 2\ncalculate its output. [5]\nQ6. Explain stability. [2]`);
  assert.equal(r.questions[0].pageStart,1); assert.equal(r.questions[0].pageEnd,2);
  assert.match(r.questions[0].questionText,/system\nx²/);
  assert.match(r.questions[0].questionText,/calculate its output/);
  assert.doesNotMatch(r.questions[0].questionText,/Page 2/);
  assert.ok(r.questions[0].charEnd>r.questions[0].charStart);
});
test('duplicates, visual references and numbering gaps are handled safely', () => {
  const r = extractQuestionsFromText('Q1. Explain the first model. [5]\nQ2. Explain the first model. [5]\nQ4. Calculate the current in the circuit shown below. [5]');
  assert.equal(r.questions.length,2); assert.equal(r.questions[1].hasVisualContext,true); assert.equal(r.questions[1].needsReview,true);
});
