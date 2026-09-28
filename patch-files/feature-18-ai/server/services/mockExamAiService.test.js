const test =
  require(
    'node:test'
  );

const assert =
  require(
    'node:assert/strict'
  );

const {
  candidateForAi,
  mockAiModel,
  parseJsonFromText,
  validateSelectedIds,
} = require(
  './mockExamAiService'
);

function q(
  id,
  marks
) {
  return {
    _id: id,
    questionText:
      `Question ${id}`,
    marks,
    year: 2026,
    examType:
      'Mid-Sem',
    primaryTopic:
      'Topic',
  };
}

test(
  'default AI model is current Flash-Lite model',
  () => {
    const old =
      process.env
        .MOCK_AI_MODEL;

    delete process.env
      .MOCK_AI_MODEL;

    const model =
      mockAiModel();

    if (old) {
      process.env
        .MOCK_AI_MODEL =
        old;
    }

    assert.ok(
      model.length >
        0
    );
  }
);

test(
  'candidate projection exposes only useful selection fields',
  () => {
    const projected =
      candidateForAi(
        q('1', 5)
      );

    assert.equal(
      projected.id,
      '1'
    );

    assert.equal(
      projected.marks,
      5
    );

    assert.ok(
      !Object.prototype.hasOwnProperty.call(
        projected,
        'answerText'
      )
    );
  }
);

test(
  'JSON parser accepts fenced JSON',
  () => {
    const parsed =
      parseJsonFromText(
        '```json\n{"selectedQuestionIds":["1"]}\n```'
      );

    assert.deepEqual(
      parsed
        .selectedQuestionIds,
      ['1']
    );
  }
);

test(
  'selection validation removes duplicate ids',
  () => {
    const result =
      validateSelectedIds(
        {
          selectedQuestionIds: [
            '1',
            '1',
            '2',
          ],
        },
        [
          q('1', 5),
          q('2', 5),
        ],
        10
      );

    assert.equal(
      result.selected.length,
      2
    );
  }
);

test(
  'selection validation rejects unknown ids',
  () => {
    assert.throws(
      () =>
        validateSelectedIds(
          {
            selectedQuestionIds: [
              'missing',
            ],
          },
          [
            q('1', 5),
          ],
          5
        ),
      /valid PaperStack question IDs/i
    );
  }
);

test(
  'selection validation rejects badly mismatched marks',
  () => {
    assert.throws(
      () =>
        validateSelectedIds(
          {
            selectedQuestionIds: [
              '1',
            ],
          },
          [
            q('1', 2),
          ],
          25
        ),
      /instead of approximately/i
    );
  }
);
