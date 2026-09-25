const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsvLine } = require('./csv');

test('parseCsvLine handles normal CSV values', () => {
  assert.deepEqual(parseCsvLine('a,b,c'), ['a', 'b', 'c']);
});

test('parseCsvLine keeps commas inside quoted values', () => {
  assert.deepEqual(
    parseCsvLine('"Data Science, Intro",CS501,2026'),
    ['Data Science, Intro', 'CS501', '2026']
  );
});

test('parseCsvLine handles escaped quotes', () => {
  assert.deepEqual(parseCsvLine('"A ""quoted"" value",x'), ['A "quoted" value', 'x']);
});
