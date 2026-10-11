const test = require('node:test');
const assert = require('node:assert/strict');
const { localTopicMatches, normalizeTopic, topicKey } = require('./topicCatalogService');

test('topic aliases produce one stable canonical key', () => {
  assert.equal(normalizeTopic('Semaphores'), 'semaphore');
  assert.equal(topicKey('CS301', 'Semaphores'), topicKey('CS301', 'Semaphore'));
});

test('local topic mapping prefers explicit phrases', () => {
  const topics = [
    { topicKey: 'CS301:process-synchronization', name: 'Process Synchronization', questionCount: 5 },
    { topicKey: 'CS301:paging', name: 'Paging', questionCount: 5 },
  ];
  const matches = localTopicMatches('Today we covered process synchronization with semaphores.', topics);
  assert.equal(matches[0].topicKey, 'CS301:process-synchronization');
  assert.equal(matches[0].confidence, 0.98);
});
