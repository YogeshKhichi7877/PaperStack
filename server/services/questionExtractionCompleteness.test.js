const test = require('node:test');
const assert = require('node:assert/strict');
const { extractQuestionsFromText, PAGE_BREAK } = require('./questionExtractionRules');
const { chooseExtraction } = require('./questionExtractionService');
const { combineSubparts } = require('./questionGroupingService');
const { extractQuestionsWithAi, textChunks } = require('./freeAiQuestionService');
const { preservesSource } = require('./questionCoverageService');

test('short subparts, numeric rows and internal instructions survive as one source block', () => {
  const source = 'Q2. Answer all of the following. [6]\n(a) Why? [2]\n(b) Evaluate:\n7\n+\n3\n[2]\n(c) Answer any one example. [2]\nQ3. Explain indexing. [5]';
  const [q2, q3] = extractQuestionsFromText(source).questions;
  assert.equal(q2.questionKey, 'q2');
  assert.equal(q3.questionKey, 'q3');
  assert.match(q2.questionText, /\(a\) Why\?/);
  assert.match(q2.questionText, /7\n\+\n3/);
  assert.match(q2.questionText, /Answer any one example/);
  assert.equal(q2.marks, 6);
});
test('fully qualified nested labels retain parent and intermediate instructions across pages', () => {
  const source = `${PAGE_BREAK}\nQ2. Use x = 5 in the following. [6]\nQ2(a) First use this relation. [4]\nQ2(a)(i) Find x². [2]\n${PAGE_BREAK}\nQ2(a)(ii) Find x³. [2]\nQ2(b) Why? [2]\nQ3. Explain paging. [5]`;
  const [question] = extractQuestionsFromText(source).questions;
  assert.equal(question.marks, 6);
  assert.equal(question.pageEnd, 2);
  for (const text of ['Use x = 5', 'First use this relation', '(a)(i) Find x²', '(a)(ii) Find x³', '(b) Why?']) assert.ok(question.questionText.includes(text));
  assert.equal(question.needsReview, false);
});
test('numeric working steps and MCQ options are not promoted to main questions', () => {
  const { questions } = extractQuestionsFromText('Q1. Which steps describe the algorithm?\n1. Read the input\n2. Sort the input\n(A) Only step 1\n(B) Both steps\n[5]\nQ2. Explain the result. [5]');
  assert.deepEqual(questions.map(q => q.questionKey), ['q1', 'q2']);
  assert.match(questions[0].questionText, /2\. Sort the input/);
  assert.match(questions[0].questionText, /\(B\) Both steps/);
});
test('internal OR remains inside the parent while explicit main alternatives stay separate', () => {
  const { questions } = extractQuestionsFromText('Q2. Answer the following.\n(a) Explain paging. [5]\nOR\n(a) Explain segmentation. [5]\n(b) Define memory. [2]\nQ3. Explain files. [5]');
  assert.equal(questions.length, 2);
  assert.match(questions[0].questionText, /paging.*OR.*segmentation.*Define memory/s);
  assert.equal(questions[0].marks, null);
  assert.equal(questions[0].needsReview, true);
  const qualified = extractQuestionsFromText('Q2(a) Explain paging. [5]\nOR\nQ2(a) Explain segmentation. [5]\nQ2(b) Define memory. [2]');
  assert.equal(qualified.questions.length, 1);
  assert.match(qualified.questions[0].questionText, /paging.*OR.*segmentation.*Define memory/s);
});
test('same numbering in distinct sections is not deduplicated', () => {
  const { questions } = extractQuestionsFromText('Section A\nQ1. Explain virtual memory. [5]\nSection B\nQ1. Explain virtual memory. [5]');
  assert.equal(questions.length, 2);
  assert.notEqual(questions[0].questionKey, questions[1].questionKey);
  assert.equal(questions[1].section, 'Section B');
});
test('AI parent text is preserved even when children do not repeat the shared stem', () => {
  const items = [
    { part: '', questionText: 'Given x = 7, answer both parts.', marks: 4 },
    { part: 'i', questionText: 'Find x².', marks: 2 },
    { part: 'ii', questionText: 'Find x³.', marks: 2 },
  ].map(q => ({ ...q, questionNumber: '2', questionKey: `q2-${q.part}`, confidence: 96 }));
  const [question] = combineSubparts(items);
  assert.match(question.questionText, /Given x = 7/);
  assert.match(question.questionText, /\(ii\) Find x³/);
});
test('equally long AI text cannot hide a missing subpart or changed operand', () => {
  const local = { questionKey: 'q2', source: 'rule', confidence: 70, needsReview: true,
    questionText: '(i) Calculate 23 × 17.\n(ii) Explain why the function terminates for negative inputs.' };
  const ai = { ...local, source: 'ai', confidence: 99,
    questionText: '(i) Calculate 23 × 18 carefully using the standard multiplication method.\n(ii) Explain the result in detail.' };
  const selected = chooseExtraction({ localResult: { questions: [local], warnings: [], confidence: 70 }, aiResult: { questions: [ai], attempted: true }, allowAi: true });
  assert.equal(selected.questions[0].questionText, local.questionText);
  assert.equal(selected.engine, 'rules');
});
test('coverage accepts equivalent math operators but rejects missing values', () => {
  assert.equal(preservesSource('Calculate x² ≤ 25.', 'Calculate $x^{2} \\leq 25$.'), true);
  assert.equal(preservesSource('Calculate x² ≤ 25.', 'Calculate $x^{2} \\leq 24$.'), false);
  assert.equal(preservesSource('Calculate x + y = 25.', 'Calculate x - y = 25.'), false);
  assert.equal(preservesSource('Find the force on charge Q.', 'Find the force on charge q.'), false);
});
test('short readable AI requests stay text requests and never attach the whole PDF', async () => {
  let calls = 0;
  await extractQuestionsWithAi({ paper: { _id: 'short-text-routing-v4' }, buffer: Buffer.from('unused'), extractedText: 'Q1. Explain paging. [5]' }, {
    status: { enabled: true }, aiAvailable: () => true,
    generateForTask: async (task, prompt, options) => {
      calls++;
      assert.equal(task, 'QUESTION_EXTRACTION_TEXT');
      assert.equal(options.attachment, undefined);
      return JSON.stringify({ questions: [{ questionNumber: '1', questionText: 'Explain paging.', marks: 5, confidence: 96 }] });
    },
  });
  assert.equal(calls, 1);
});
test('AI batching and local parsing agree on nested numeric enumeration boundaries', () => {
  const source = 'Q1. Examine these steps:\n1. Read input.\n2. Sort input.\nQ2(a)(i) Evaluate x². [2]\nQ2(a)(ii) Evaluate y². [2]';
  const chunks = textChunks(source, 70);
  assert.equal(chunks.length, 2);
  assert.match(chunks[0], /Sort input/);
  assert.match(chunks[1], /Q2\(a\)\(i\).*Q2\(a\)\(ii\)/s);
});

test('real scan label styles ignore numbered instructions and preserve wrapped marks', () => {
  const source = `${PAGE_BREAK}\n\\textbf{Instructions:}\n1. \\textbf{Attempt any six questions out of seven.}\n2. Attempt all parts of a question at one place.\n3. Each question carries 5 marks.\n1. (a) Explain the first process. [2 marks]\n[Figure: see original PDF]\n(b) Explain why the second process [2 marks]\nis different from the first.\n(c) State its application. [1 mark]\n2. Explain the next concept. [5 marks]`;
  const result = extractQuestionsFromText(source);
  assert.deepEqual(result.questions.map(q => q.questionKey), ['q1', 'q2']);
  assert.equal(result.questions[0].marks, 5);
  assert.deepEqual(result.questions[0].mergedPartKeys, ['q1-a', 'q1-b', 'q1-c']);
  assert.equal(result.expectedQuestionCount, 7);
  assert.equal(result.incomplete, true);
  assert.match(result.warnings.join(' '), /missing pages/);
  assert.match(result.questions[0].questionText, /is different from the first/);
});
test('hyphenated Q labels and figure placeholders preserve marks without creating extra questions', () => {
  const result = extractQuestionsFromText('Note: 1. All questions are compulsory.\n2. Assume suitable data wherever necessary.\nQ-1 Determine the current. [4 marks]\n[Figure: see original PDF]\nQ-2 Derive the expression across the [3 marks]\ncapacitor. Also define its time constant.\n***All the Best****');
  assert.deepEqual(result.questions.map(q => q.marks), [4, 3]);
  assert.equal(result.questions[0].hasVisualContext, true);
  assert.doesNotMatch(result.questions[1].questionText, /All the Best/);
});
test('c and d stay alphabetic while Roman i and ii nest under d', () => {
  const result = extractQuestionsFromText('Q1\n(a) First part. [1]\n(b) Second part. [1]\n(c) Third part. [1]\n(d) Last part.\n(i) First task. [1]\n(ii) Second task. [1]');
  assert.equal(result.questions[0].marks, 5);
  assert.deepEqual(result.questions[0].mergedPartKeys, ['q1-a', 'q1-b', 'q1-c', 'q1-d', 'q1-d-i', 'q1-d-ii']);
});
test('a total marks header does not become an expected question count', () => {
  const result = extractQuestionsFromText('Total 30 Marks\nQ1. Explain paging. [5]');
  assert.equal(result.expectedQuestionCount, null);
  assert.equal(result.incomplete, false);
});

test('AI section numbering cannot overwrite the same number from another section', () => {
  const questions = ['Section A', 'Section B'].map((section, index) => ({
    questionKey: index ? 'q1-section-b' : 'q1', questionNumber: '1', section,
    questionText: index ? 'Explain virtual memory.' : 'Explain cache memory.', confidence: 75, source: 'rule', needsReview: true,
  }));
  const ai = { ...questions[1], questionKey: 'q1', source: 'ai', confidence: 98 };
  const result = chooseExtraction({ localResult: { questions, confidence: 75, warnings: [] }, aiResult: { attempted: true, questions: [ai] }, allowAi: true });
  assert.equal(result.questions[0].questionText, 'Explain cache memory.');
  assert.equal(result.questions[1].questionKey, 'q1-section-b');
  assert.equal(result.questions[1].source, 'ai');
});
