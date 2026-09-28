const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMockExam,
  createSeededRandom,
  questionFingerprint,
  sectionForMarks,
  selectQuestions,
} = require('./mockExamService');

function q(
  id,
  text,
  options = {}
) {
  return {
    _id: id,
    questionLabel:
      options.questionLabel ||
      `Q${id}`,
    questionText:
      text,
    subject:
      'Computer Graphics',
    subjectCode:
      'CS502',
    year:
      options.year ||
      2026,
    examType:
      options.examType ||
      'Mid-Sem',
    marks:
      options.marks ??
      5,
    primaryTopic:
      options.primaryTopic ||
      '',
    topics:
      options.topics ||
      [],
    repeatCount:
      options.repeatCount ||
      0,
    topicScore:
      options.topicScore ||
      0,
    approvedSolutionCount:
      options.approvedSolutionCount ||
      0,
    status:
      'extracted',
    paperId: {
      _id:
        `paper-${id}`,
      title:
        'Paper',
      filePath:
        '/paper.pdf',
    },
  };
}

const BANK = [
  q(
    '1',
    'Define raster scan display.',
    {
      marks: 2,
      year: 2026,
      primaryTopic:
        'Raster Scan',
    }
  ),
  q(
    '2',
    'Explain midpoint circle algorithm with steps.',
    {
      marks: 5,
      year: 2026,
      primaryTopic:
        'Midpoint Circle',
      repeatCount: 3,
      topicScore: 90,
    }
  ),
  q(
    '3',
    'Explain perspective projection with diagram.',
    {
      marks: 5,
      year: 2025,
      primaryTopic:
        'Perspective Projection',
      topicScore: 80,
    }
  ),
  q(
    '4',
    'Solve composite transformation for the given triangle.',
    {
      marks: 8,
      year: 2025,
      primaryTopic:
        'Composite Transformation',
      repeatCount: 2,
      topicScore: 94,
      approvedSolutionCount: 1,
    }
  ),
  q(
    '5',
    'Explain boundary fill algorithm.',
    {
      marks: 5,
      year: 2024,
      primaryTopic:
        'Boundary Fill',
    }
  ),
  q(
    '6',
    'Differentiate raster scan and random scan.',
    {
      marks: 4,
      year: 2024,
      primaryTopic:
        'Display Systems',
    }
  ),
  q(
    '7',
    'State homogeneous coordinate representation.',
    {
      marks: 2,
      year: 2023,
      primaryTopic:
        'Homogeneous Coordinates',
    }
  ),
];

test(
  'seeded random is reproducible',
  () => {
    const a =
      createSeededRandom(
        'abc'
      );

    const b =
      createSeededRandom(
        'abc'
      );

    assert.equal(
      a(),
      b()
    );

    assert.equal(
      a(),
      b()
    );
  }
);

test(
  'section assignment follows marks',
  () => {
    assert.equal(
      sectionForMarks(2)
        .key,
      'short'
    );

    assert.equal(
      sectionForMarks(5)
        .key,
      'medium'
    );

    assert.equal(
      sectionForMarks(8)
        .key,
      'long'
    );
  }
);

test(
  'question fingerprint normalizes duplicate wording',
  () => {
    assert.equal(
      questionFingerprint({
        questionText:
          'Explain  Midpoint Circle Algorithm!',
      }),
      questionFingerprint({
        questionText:
          'explain midpoint circle algorithm',
      })
    );
  }
);

test(
  'selection avoids duplicate fingerprints',
  () => {
    const bank = [
      ...BANK,
      q(
        '8',
        'Explain midpoint circle algorithm with steps.',
        {
          marks: 5,
          year: 2023,
        }
      ),
    ];

    const result =
      selectQuestions(
        bank,
        {
          totalMarks: 25,
          seed:
            'dup-test',
        }
      );

    const fingerprints =
      result.selected.map(
        questionFingerprint
      );

    assert.equal(
      new Set(
        fingerprints
      ).size,
      fingerprints.length
    );
  }
);

test(
  'same seed produces same mock selection',
  () => {
    const first =
      selectQuestions(
        BANK,
        {
          totalMarks: 20,
          seed:
            'stable-seed',
        }
      );

    const second =
      selectQuestions(
        BANK,
        {
          totalMarks: 20,
          seed:
            'stable-seed',
        }
      );

    assert.deepEqual(
      first.selected.map(
        (item) =>
          item._id
      ),
      second.selected.map(
        (item) =>
          item._id
      )
    );
  }
);

test(
  'mock exposes sections and instructions',
  () => {
    const mock =
      buildMockExam(
        BANK,
        {
          subject: {
            subjectCode:
              'CS502',
            subject:
              'Computer Graphics',
          },
          examType:
            'Mid-Sem',
          totalMarks:
            25,
          durationMinutes:
            60,
          seed:
            'mock-a',
        }
      );

    assert.ok(
      mock.questions.length >
        0
    );

    assert.ok(
      mock.sections.length >
        0
    );

    assert.equal(
      mock.durationMinutes,
      60
    );

    assert.match(
      mock.generationNotes
        .disclaimer,
      /not an official/i
    );
  }
);

test(
  'mock reports solution-ready questions',
  () => {
    const mock =
      buildMockExam(
        BANK,
        {
          totalMarks:
            30,
          seed:
            'solutions',
        }
      );

    assert.ok(
      mock.summary
        .solutionReady >=
        0
    );

    assert.equal(
      typeof mock.summary
        .solutionReady,
      'number'
    );
  }
);

test(
  'strategy label is preserved',
  () => {
    const mock =
      buildMockExam(
        BANK,
        {
          strategy:
            'repeat-focused',
          totalMarks:
            20,
          seed:
            'repeat',
        }
      );

    assert.equal(
      mock.strategy,
      'repeat-focused'
    );

    assert.match(
      mock.generationNotes
        .strategy,
      /repeated/i
    );
  }
);

test(
  'duration and marks inputs are clamped',
  () => {
    const mock =
      buildMockExam(
        BANK,
        {
          totalMarks:
            999,
          durationMinutes:
            999,
        }
      );

    assert.equal(
      mock.targetMarks,
      100
    );

    assert.equal(
      mock.durationMinutes,
      240
    );
  }
);

test(
  'public mock never includes solution text',
  () => {
    const bank = [
      {
        ...BANK[0],
        answerText:
          'secret answer',
        solutionText:
          'secret solution',
      },
    ];

    const mock =
      buildMockExam(
        bank,
        {
          totalMarks:
            10,
          seed:
            'safe',
        }
      );

    const serialized =
      JSON.stringify(mock);

    assert.ok(
      !serialized.includes(
        'secret answer'
      )
    );

    assert.ok(
      !serialized.includes(
        'secret solution'
      )
    );
  }
);
