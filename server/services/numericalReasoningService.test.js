const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyQuestionKind,
  isNumericalQuestion,
} = require('./numericalReasoningService');

test('transitive closure is classified as relation reasoning, not numerical calculation', () => {
  const question = {
    questionText: 'Given R = {(1,2), (2,3), (3,4)} on A = {1,2,3,4}. Compute the transitive closure of relation R.',
  };

  assert.equal(classifyQuestionKind(question), 'relation');
  assert.equal(isNumericalQuestion(question), false);
});

test('classification separates common academic question types', () => {
  assert.equal(classifyQuestionKind({ questionText: 'Calculate the current when voltage is 12 V and resistance is 4 ohm.' }), 'numerical');
  assert.equal(classifyQuestionKind({ questionText: 'Define cloud computing and list its characteristics.' }), 'theory');
  assert.equal(classifyQuestionKind({ questionText: 'Explain the midpoint circle algorithm with pseudocode.' }), 'algorithm');
  assert.equal(classifyQuestionKind({ questionText: 'Prove that the relation is symmetric.' }), 'proof');
  assert.equal(classifyQuestionKind({ questionText: 'Write a C++ program to reverse a linked list.' }), 'programming');
  assert.equal(classifyQuestionKind({ questionText: 'Derive the expression for escape velocity.' }), 'derivation');
});
