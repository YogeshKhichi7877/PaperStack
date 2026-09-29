const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PAGE_BREAK,
  classifyQuestionType,
  extractMarks,
  extractQuestionsFromText,
} = require('./questionExtractionRules');

test('extracts numbered and sub-part questions with marks', () => {
  const text = `
Institute header
SECTION A
Q1. Define raster scan display. [2 Marks]
Q2(a) Explain DDA line drawing algorithm. (3 Marks)
(b) Compare DDA and Bresenham algorithms. [2]
Q3) Draw the architecture of a raster display system. 5 Marks
`;

  const result = extractQuestionsFromText(text);

  assert.equal(result.questions.length, 4);
  assert.equal(result.questions[0].questionKey, 'q1');
  assert.equal(result.questions[0].marks, 2);
  assert.equal(result.questions[1].questionKey, 'q2-a');
  assert.equal(result.questions[2].questionKey, 'q2-b');
  assert.equal(result.questions[3].questionKey, 'q3');
  assert.equal(result.questions[3].questionType, 'diagram');
  assert.ok(result.confidence >= 70);
});

test('supports simple 1. 2. 3. paper numbering without matching year headers', () => {
  const text = `
2026
Computer Graphics
1. Explain composite transformation.
2. Calculate the transformed coordinate of point (2, 3).
3. Define perspective projection.
`;

  const result = extractQuestionsFromText(text);

  assert.deepEqual(
    result.questions.map((item) => item.questionKey),
    ['q1', 'q2', 'q3']
  );
});

test('tracks page markers when provided by the PDF renderer', () => {
  const text = `
${PAGE_BREAK}
Q1. Define clipping.
${PAGE_BREAK}
Q2. Explain Cohen Sutherland line clipping.
`;

  const result = extractQuestionsFromText(text);

  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].pageNumber, 1);
  assert.equal(result.questions[1].pageNumber, 2);
});

test('low-information text produces low confidence instead of invented questions', () => {
  const result = extractQuestionsFromText('IIIT Surat Mid Semester Examination 2026');
  assert.equal(result.questions.length, 0);
  assert.equal(result.confidence, 0);
});

test('page markers alone do not count as searchable text', () => {
  const result = extractQuestionsFromText(Array(12).fill(PAGE_BREAK).join('\n'));
  assert.equal(result.questions.length, 0);
  assert.equal(result.textLength, 0);
  assert.match(result.warnings.join(' '), /scanned/);
});

test('extractMarks removes common trailing mark annotations', () => {
  assert.deepEqual(
    extractMarks('Explain boundary fill algorithm. [5 Marks]'),
    { text: 'Explain boundary fill algorithm.', marks: 5 }
  );
  assert.equal(extractMarks('Define pixel. (2)').marks, 2);
});

test('question type classifier handles common exam prompts', () => {
  assert.equal(classifyQuestionType('Draw a diagram of the display pipeline.'), 'diagram');
  assert.equal(classifyQuestionType('Derive the transformation matrix.'), 'derivation');
  assert.equal(classifyQuestionType('Write a C program to implement the algorithm.'), 'coding');
  assert.equal(classifyQuestionType('Explain the midpoint circle algorithm.'), 'theory');
});
