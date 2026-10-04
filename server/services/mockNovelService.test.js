const test = require('node:test');
const assert = require('node:assert/strict');
const { arithmetic, combineMock, estimateDifficulty, generateNovelQuestions,
  parseCandidateRows, similarity, validateNovelQuestion,
  validateNovelQuestionDetailed } = require('./mockNovelService');
const { buildMockExam } = require('./mockExamService');

const template = {
  _id: '507f1f77bcf86cd799439011',
  questionText: 'Explain why platform as a service reduces infrastructure management.',
  marks: 5, questionType: 'theory', primaryTopic: 'Cloud service models',
  subject: 'Cloud Computing', subjectCode: 'CS504',
};

test('arithmetic verifier accepts simple valid expressions only', () => {
  assert.equal(arithmetic('(2+3)*4'), 20);
  assert.equal(arithmetic('process.exit()'), null);
  assert.equal(arithmetic('4/0'), null);
});

test('archive difficulty estimate follows marks and reasoning signals', () => {
  assert.equal(estimateDifficulty({ marks: 2, questionText: 'Define rasterization.' }), 'easy');
  assert.equal(estimateDifficulty({ marks: 5, questionText: 'Calculate transformed coordinates.' }), 'hard');
});

test('new questions need novelty, complete answer, and a marks-matched rubric', () => {
  const candidate = {
    sourceQuestionId: template._id,
    questionText: 'A startup needs to deploy its web application without managing its operating system. Choose the service model and justify the decision.',
    expectedAnswer: 'Platform as a service manages runtime and infrastructure while the startup deploys its application.',
    keyPoints: ['Platform as a service', 'Managed runtime'],
    markingScheme: [{ criterion: 'Model', marks: 2 }, { criterion: 'Reasoning', marks: 3 }],
  };
  assert.ok(validateNovelQuestion(candidate, template, [template.questionText], []));
  assert.equal(validateNovelQuestion({ ...candidate, questionText: template.questionText }, template, [template.questionText], []), null);
  assert.equal(validateNovelQuestion({ ...candidate, markingScheme: [{ criterion: 'Model', marks: 1 }] }, template, [], []), null);
  assert.ok(similarity(template.questionText, template.questionText) > 0.99);
});

test('generated numerical questions require a verified calculation', () => {
  const numericalTemplate = { ...template, questionType: 'numerical' };
  const candidate = {
    sourceQuestionId: template._id,
    questionText: 'A square has an area of 16 square metres. Calculate its side length and explain the square root used.',
    questionType: 'numerical', difficulty: 'moderate',
    expectedAnswer: 'The square root of 16 is 4, so the final side length is 4 metres.',
    keyPoints: ['Use square root', 'State the length with units'],
    markingScheme: [{ criterion: 'Method', marks: 2 }, { criterion: 'Value and units', marks: 3 }],
    numericCheck: { expression: 'sqrt(16)', result: 4 },
  };
  assert.ok(validateNovelQuestion(candidate, numericalTemplate, [], []));
  assert.equal(validateNovelQuestion({ ...candidate, numericCheck: { expression: 'sqrt(16)', result: 5 } },
    numericalTemplate, [], []), null);
  assert.equal(validateNovelQuestion({ ...candidate, numericCheck: { expression: 'process.exit()', result: 4 } },
    numericalTemplate, [], []), null);
  assert.equal(validateNovelQuestionDetailed({
    ...candidate,
    questionText: 'Calculate the side length for the supplied square and explain the method.',
  }, numericalTemplate, [], []).reason, 'missing_numeric_values');
  assert.ok(validateNovelQuestion({
    ...candidate,
    expectedAnswer: 'Using the square-root relation gives a side length of 4.000 metres.',
  }, numericalTemplate, [], []));
});

test('safe numerical formatting repair normalizes operators and derives a missing check result', () => {
  const numericalTemplate = { ...template, questionType: 'numerical' };
  const [candidate] = parseCandidateRows(JSON.stringify({ questions: [{
    sourceQuestionId: template._id,
    questionText: 'A system processes 6 groups with 4 records each. Calculate the total record count and explain the multiplication.',
    questionType: 'numerical', difficulty: 'moderate',
    expectedAnswer: 'There are 24 records because six equal groups each contain four records.',
    keyPoints: ['Multiply groups by records', 'State the final record count'],
    markingScheme: [{ criterion: 'Method', marks: 2 }, { criterion: 'Result', marks: 3 }],
    numericCheck: { expression: '6 × 4', result: null },
  }] }), { templates: [numericalTemplate] });
  assert.equal(candidate.numericCheck.expression, '6 * 4');
  assert.equal(candidate.numericCheck.result, 24);
  assert.ok(validateNovelQuestion(candidate, numericalTemplate, [], []));
});

test('public mock omits generated answer keys', () => {
  const base = buildMockExam([template], { subject: { subjectCode: 'CS504' }, totalMarks: 10 });
  const generated = validateNovelQuestion({
    sourceQuestionId: template._id,
    questionText: 'A startup needs to deploy its web application without managing its operating system. Choose the service model and justify the decision.',
    expectedAnswer: 'Platform as a service manages runtime and infrastructure while the startup deploys its application.',
    keyPoints: ['Platform as a service', 'Managed runtime'],
    markingScheme: [{ criterion: 'Model', marks: 2 }, { criterion: 'Reasoning', marks: 3 }],
  }, template, [template.questionText], []);
  const mock = combineMock(base, [generated], 'new');
  assert.equal(mock.questions[0].source, 'generated');
  assert.equal(mock.questions[0].expectedAnswer, undefined);
  assert.equal(mock.questions[0].markingScheme, undefined);
});

test('invalid generated rows do not discard valid questions in the same response', () => {
  const valid = {
    sourceQuestionId: template._id,
    questionText: 'A retailer wants to launch an online store without maintaining servers. Choose a suitable managed service and explain its responsibilities.',
    questionType: 'theory', difficulty: 'easy',
    expectedAnswer: 'A managed platform supplies the runtime and server maintenance while the retailer remains responsible for application code.',
    keyPoints: ['Managed runtime', 'Application code remains with the retailer'],
    markingScheme: [{ criterion: 'Service choice', marks: '2' }, { criterion: 'Reasoning', marks: '3' }],
  };
  const rows = parseCandidateRows(JSON.stringify({ questions: [valid, { ...valid, keyPoints: [] }] }));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].markingScheme[0].marks, 2);
});

test('repairable candidate formatting is normalized before validation', () => {
  const repaired = parseCandidateRows(JSON.stringify({ questions: [{
    sourceQuestionId: template._id,
    questionText: 'A cloud team compares two deployment approaches and justifies the more maintainable engineering choice.',
    questionType: 'theory', difficulty: 'challenging',
    expectedAnswer: 'The managed platform is preferable because it reduces infrastructure maintenance while preserving application control.',
    keyPoints: 'Managed runtime;Application responsibility',
    markingScheme: [
      { criterion: 'Correct platform choice', marks: '2' },
      { criterion: 'Clear justification', marks: '' },
    ],
  }] }), { templates: [template], difficulty: 'hard' });
  assert.equal(repaired.length, 1);
  assert.equal(repaired[0].difficulty, 'hard');
  assert.deepEqual(repaired[0].keyPoints, ['Managed runtime', 'Application responsibility']);
  assert.deepEqual(repaired[0].markingScheme.map((item) => item.marks), [2, 3]);
});

test('single-slot retries safely repair wrapper and source-id formatting', () => {
  const rows = parseCandidateRows(JSON.stringify([{
    sourceQuestionId: 'wrong-provider-id',
    questionText: 'A cloud team selects a managed runtime for a new application and evaluates the operational responsibilities that remain.',
    questionType: 'theory', difficulty: 'hard',
    expectedAnswer: 'The platform provider manages infrastructure and runtime operations while the team owns its application and data.',
    keyPoints: ['Provider manages runtime', 'Team manages application and data'],
    markingScheme: [{ criterion: 'Responsibilities', marks: 2 }, { criterion: 'Evaluation', marks: 3 }],
  }]), { templates: [template], difficulty: 'hard' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sourceQuestionId, template._id);
});

test('generation retries only a missing template and retains the valid first answer', async () => {
  const second = { ...template, _id: '507f1f77bcf86cd799439022',
    questionText: 'Describe how platform services simplify software deployment.' };
  const makeCandidate = (sourceQuestionId, questionText) => ({
    sourceQuestionId, questionText, questionType: 'theory', difficulty: 'easy',
    expectedAnswer: 'A managed platform supplies the runtime and server maintenance while the team remains responsible for application code.',
    keyPoints: ['Managed runtime', 'Application responsibility'],
    markingScheme: [{ criterion: 'Service choice', marks: 2 }, { criterion: 'Reasoning', marks: 3 }],
  });
  const first = makeCandidate(template._id,
    'A retailer wants to launch an online store without maintaining servers. Choose a suitable managed service and explain its responsibilities.');
  const later = makeCandidate(second._id,
    'A research lab needs to publish a data dashboard without maintaining servers. Recommend a hosting service and outline the provider duties.');
  const responses = [
    JSON.stringify({ questions: [first, { ...later, keyPoints: [] }] }),
    JSON.stringify({ questions: [later] }),
  ];
  let calls = 0;
  const generated = await generateNovelQuestions([template, second], [template, second], {
    difficulty: 'easy', env: { AI_ENABLED: 'true', GROQ_API_KEY: 'test' },
  }, async (_prompt, settings) => {
    const response = responses[calls++];
    settings.validateResponse(response);
    return response;
  });
  assert.equal(calls, 2);
  assert.deepEqual(generated.map((item) => item.sourceQuestionId), [template._id, second._id]);
  assert.ok(generated.every((item) => item.difficulty === 'easy'));
});

test('ten fresh slots over-generate thirteen candidates and replace only two failed slots', async () => {
  const templates = Array.from({ length: 10 }, (_, index) => ({
    ...template,
    _id: `507f1f77bcf86cd7994390${String(index + 30).padStart(2, '0')}`,
    questionText: `Reference problem ${index + 1} covering archive concept ref${index + 1}.`,
    marks: index < 5 ? 3 : 2,
    primaryTopic: `Topic ${index + 1}`,
  }));
  const requests = [];
  const generated = await generateNovelQuestions(templates, templates, {
    difficulty: 'hard',
    subject: { subject: 'Fuzzy Logic', subjectCode: 'CS-514', semester: 5 },
    examType: 'End-Sem',
    env: { AI_ENABLED: 'true', GROQ_API_KEY: 'test' },
  }, async (prompt, settings) => {
    const config = JSON.parse(prompt.split('\n').at(-1));
    const round = Number(prompt.match(/Replacement round: (\d+)/)?.[1] || 0);
    requests.push({ round, config });
    const questions = config.references.flatMap((reference) => {
      const index = templates.findIndex((item) => String(item._id) === reference.sourceQuestionId);
      return Array.from({ length: reference.candidateCount }, (_, candidateIndex) => ({
        sourceQuestionId: reference.sourceQuestionId,
        questionText: `Scenario alpha${index} beta${index} gamma${index} delta${index} epsilon${index} zeta${index} variant${candidateIndex} requires a rigorous multi-step engineering analysis and a justified final decision.`,
        questionType: 'theory', difficulty: 'hard',
        expectedAnswer: `A complete solution for topic ${index} develops the governing model, evaluates the evidence, and justifies the final decision.`,
        keyPoints: round === 0 && index >= 8
          ? [] : [`Model topic ${index}`, `Justify decision ${index}`],
        markingScheme: [
          { criterion: 'Reasoning', marks: 1 },
          { criterion: 'Decision', marks: reference.marks - 1 },
        ],
      }));
    });
    const response = JSON.stringify({ questions });
    settings.validateResponse(response);
    return response;
  });

  assert.equal(generated.length, 10);
  assert.equal(new Set(generated.map((item) => item.sourceQuestionId)).size, 10);
  const base = buildMockExam(templates, {
    subject: { subject: 'Fuzzy Logic', subjectCode: 'CS-514', semester: 5 },
    totalMarks: 25,
    durationMinutes: 30,
    seed: 'fresh-only-25',
  });
  const mock = combineMock(base, generated, 'new');
  assert.equal(mock.questions.length, 10);
  assert.equal(mock.questions.reduce((sum, item) => sum + item.marks, 0), 25);
  assert.ok(mock.questions.every((item) => item.source === 'generated'));
  const initialRequests = requests.filter((item) => item.round === 0);
  assert.equal(initialRequests.reduce((sum, item) =>
    sum + item.config.requiredCandidateCount, 0), 13);
  const replacementIds = new Set(requests.filter((item) => item.round > 0)
    .flatMap((item) => item.config.references.map((reference) => reference.sourceQuestionId)));
  assert.deepEqual(replacementIds, new Set(templates.slice(8).map((item) => String(item._id))));
});

test('mock construction matrix preserves marks, duration, difficulty, subject, and source mode', () => {
  const topics = [
    'rasterization', 'deadlock', 'normalization', 'modulation', 'scheduling',
    'encryption', 'clustering', 'routing', 'compilation', 'virtualization',
  ];
  const scenarioTerms = [
    'pixels scanline viewport polygon', 'mutex semaphore starvation process',
    'relation tuple dependency schema', 'carrier spectrum bandwidth signal',
    'queue latency priority dispatch', 'cipher nonce entropy ciphertext',
    'centroid distance partition feature', 'packet gateway topology protocol',
    'parser grammar token syntax', 'hypervisor guest container isolation',
  ];
  const subjects = [
    { subject: 'Cloud Computing', subjectCode: 'CS504', semester: 5 },
    { subject: 'Analog and Digital Communication', subjectCode: 'EC407', semester: 4 },
  ];
  const marksOptions = [10, 25, 50];
  const durations = [10, 20, 30, 60];
  const difficulties = ['easy', 'balanced', 'hard'];

  difficulties.forEach((difficulty, difficultyIndex) => {
    marksOptions.forEach((totalMarks, marksIndex) => {
      durations.forEach((durationMinutes, durationIndex) => {
        const subject = subjects[(difficultyIndex + marksIndex + durationIndex) % subjects.length];
        const templates = topics.map((topic, index) => ({
          ...template,
          _id: `${subject.subjectCode}-${topic}`,
          subject: subject.subject,
          subjectCode: subject.subjectCode,
          semester: subject.semester,
          marks: 5,
          primaryTopic: topic,
          questionText: `Archived ${topic} source question ${index + 1} for the selected subject.`,
        }));
        const base = buildMockExam(templates, {
          subject,
          totalMarks,
          durationMinutes,
          seed: `${subject.subjectCode}-${difficulty}-${totalMarks}-${durationMinutes}`,
        });
        const requestedDifficulty = difficulty === 'balanced' ? 'moderate' : difficulty;
        const selectedTemplates = base.questions.map((item) =>
          templates.find((candidate) => String(candidate._id) === String(item._id)));
        const generated = [];
        selectedTemplates.forEach((source, index) => {
          const topic = source.primaryTopic;
          const candidate = validateNovelQuestion({
            sourceQuestionId: source._id,
            questionText: `A new ${topic} engineering scenario involving ${scenarioTerms[index]} uses dataset ${100 + index}, constraint ${200 + index}, and design case ${300 + index}. Analyze the evidence and justify the final decision.`,
            questionType: 'theory', difficulty: requestedDifficulty,
            expectedAnswer: `The ${topic} solution applies the governing principle, evaluates dataset ${100 + index}, and justifies the resulting engineering decision.`,
            keyPoints: [`Apply ${topic} principle`, `Justify case ${300 + index}`],
            markingScheme: [
              { criterion: 'Correct method', marks: 2 },
              { criterion: 'Reasoned conclusion', marks: 3 },
            ],
          }, source, templates.map((item) => item.questionText),
          generated.map((item) => item.questionText), difficulty);
          assert.ok(candidate);
          generated.push(candidate);
        });

        const fresh = combineMock(base, generated, 'new');
        const mixed = combineMock(base, generated.filter((_, index) => index % 2 === 0), 'mixed');
        const pyq = combineMock(base, [], 'pyq');
        [fresh, mixed, pyq].forEach((mock) => {
          assert.equal(mock.questions.reduce((sum, item) => sum + item.marks, 0), totalMarks);
          assert.equal(mock.questions.length, totalMarks / 5);
          assert.equal(mock.durationMinutes, durationMinutes);
          assert.ok(mock.questions.every((item) => item.subjectCode === subject.subjectCode));
        });
        assert.ok(fresh.questions.every((item) => item.source === 'generated'));
        assert.ok(fresh.questions.every((item) => item.difficulty === requestedDifficulty));
        assert.ok(mixed.questions.some((item) => item.source === 'generated'));
        assert.ok(mixed.questions.some((item) => item.source === 'pyq') || mixed.questions.length === 1);
        assert.ok(pyq.questions.every((item) => item.source === 'pyq'));
      });
    });
  });
});
