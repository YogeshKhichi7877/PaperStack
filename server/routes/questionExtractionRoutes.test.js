const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const createQuestionExtractionRouter = require('./questionExtractionRoutes');

test('question extraction status polling does not consume the extraction start budget', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/question-extraction', createQuestionExtractionRouter({
    authenticateAdmin: (req, res, next) => {
      req.admin = { _id: 'admin-test' };
      next();
    },
  }));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    for (let index = 0; index < 40; index += 1) {
      const response = await fetch(`${url}/api/admin/question-extraction/status`);
      assert.equal(response.status, 200);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
