const {
  buildMockExam,
  questionMarks,
} = require('./mockExamService');
const { aiAvailable, generateText } = require('./aiService');

const DEFAULT_MODEL =
  'gemini-3.5-flash-lite';

function mockAiModel() {
  return (
    process.env.MOCK_AI_MODEL ||
    process.env.ASK_PAPERSTACK_GEMINI_MODEL ||
    process.env.QUESTION_ASSISTANT_GEMINI_MODEL ||
    process.env.GEMINI_MODEL ||
    DEFAULT_MODEL
  );
}

function mockAiEnabled() {
  return process.env.MOCK_AI_ENABLED !== 'false' && aiAvailable();
}

function sleep(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}

async function fetchWithRetry(
  url,
  options,
  {
    attempts = 3,
    delays = [0, 1200, 3000],
  } = {}
) {
  let lastError;

  for (
    let attempt = 0;
    attempt < attempts;
    attempt += 1
  ) {
    const delay =
      delays[attempt] || 0;

    if (delay) {
      await sleep(delay);
    }

    try {
      const response =
        await fetch(
          url,
          options
        );

      if (response.ok) {
        return response;
      }

      const body =
        await response.text();

      if (
        response.status !== 429 &&
        response.status !== 503
      ) {
        throw new Error(
          `Gemini request failed: ${response.status} ${body}`
        );
      }

      lastError =
        new Error(
          `Gemini temporarily unavailable: ${response.status}`
        );
    } catch (error) {
      lastError = error;
    }
  }

  throw (
    lastError ||
    new Error(
      'Gemini request failed'
    )
  );
}

function candidateForAi(
  question = {}
) {
  return {
    id:
      String(
        question._id ||
        ''
      ),
    text:
      String(
        question.questionText ||
        ''
      ).slice(
        0,
        900
      ),
    marks:
      questionMarks(
        question
      ),
    year:
      question.year ??
      null,
    examType:
      question.examType ||
      '',
    topic:
      question.primaryTopic ||
      '',
    topics:
      Array.isArray(
        question.topics
      )
        ? question.topics
            .map(
              (topic) =>
                typeof topic ===
                'string'
                  ? topic
                  : topic?.name
            )
            .filter(
              Boolean
            )
            .slice(
              0,
              5
            )
        : [],
    repeatCount:
      Number(
        question.repeatCount ||
        question.repeatedInstances ||
        0
      ),
    topicScore:
      Number(
        question.topicScore ||
        question.importantTopicScore ||
        0
      ),
  };
}

function parseJsonFromText(
  text = ''
) {
  const raw =
    String(
      text || ''
    ).trim();

  if (!raw) {
    throw new Error(
      'Gemini returned an empty selection'
    );
  }

  try {
    return JSON.parse(
      raw
    );
  } catch {}

  const fenced =
    raw.match(
      /```(?:json)?\s*([\s\S]*?)```/i
    );

  if (fenced?.[1]) {
    return JSON.parse(
      fenced[1].trim()
    );
  }

  const first =
    raw.indexOf('{');

  const last =
    raw.lastIndexOf('}');

  if (
    first !== -1 &&
    last > first
  ) {
    return JSON.parse(
      raw.slice(
        first,
        last + 1
      )
    );
  }

  throw new Error(
    'Gemini did not return valid JSON'
  );
}

function validateSelectedIds(
  payload,
  candidates = [],
  targetMarks
) {
  const ids =
    Array.isArray(
      payload
        ?.selectedQuestionIds
    )
      ? payload
          .selectedQuestionIds
          .map(String)
      : [];

  const byId =
    new Map(
      candidates.map(
        (question) => [
          String(
            question._id
          ),
          question,
        ]
      )
    );

  const uniqueIds = [
    ...new Set(ids),
  ];

  const selected =
    uniqueIds
      .map(
        (id) =>
          byId.get(id)
      )
      .filter(Boolean);

  if (!selected.length) {
    throw new Error(
      'Gemini did not select valid PaperStack question IDs'
    );
  }

  const total =
    selected.reduce(
      (
        sum,
        question
      ) =>
        sum +
        questionMarks(
          question
        ),
      0
    );

  if (
    Math.abs(
      Number(
        targetMarks
      ) -
      total
    ) > 3
  ) {
    throw new Error(
      `Gemini selection was ${total} marks instead of approximately ${targetMarks}`
    );
  }

  return {
    selected,
    totalMarks:
      total,
    rationale:
      String(
        payload
          ?.rationale ||
        ''
      ).slice(
        0,
        1200
      ),
  };
}

function buildMockFromSelected(
  selected = [],
  options = {}
) {
  const total =
    selected.reduce(
      (
        sum,
        question
      ) =>
        sum +
        questionMarks(
          question
        ),
      0
    );

  return buildMockExam(
    selected,
    {
      ...options,
      totalMarks:
        total,
    }
  );
}

async function requestAiSelection({
  questions = [],
  subject = {},
  examType = '',
  totalMarks = 25,
  durationMinutes = 60,
  strategy = 'balanced',
}) {
  const candidates =
    questions
      .slice(
        0,
        90
      )
      .map(
        candidateForAi
      );

  const prompt = [
    'You are selecting a practice mock exam for PaperStack.',
    'CRITICAL RULE: You may ONLY select question IDs from the supplied candidate list. Never invent, rewrite, or add a new question.',
    `Subject: ${subject.subject || ''} (${subject.subjectCode || ''})`,
    `Exam scope: ${examType || 'All exams'}`,
    `Target marks: ${totalMarks}`,
    `Duration: ${durationMinutes} minutes`,
    `Strategy: ${strategy}`,
    '',
    'Selection goals:',
    '- total marks should equal the target if possible; otherwise stay within 2 marks',
    '- avoid near-duplicate questions',
    '- balanced: mix years/topics/marks/repeat evidence',
    '- repeat-focused: favor repeatCount but still preserve some topic spread',
    '- broad-coverage: maximize topic and year diversity',
    '- prefer questions with useful metadata',
    '',
    'Return JSON only:',
    '{"selectedQuestionIds":["id1","id2"],"rationale":"one short sentence"}',
    '',
    'Candidates:',
    JSON.stringify(
      candidates
    ),
  ].join(
    '\n'
  );

  const text = await generateText(prompt, { temperature: 0.15, maxOutputTokens: 1200, json: true });

  const parsed =
    parseJsonFromText(
      text
    );

  return {
    model: null,
    ...validateSelectedIds(
      parsed,
      questions,
      totalMarks
    ),
  };
}

async function generateMockWithMode(
  questions = [],
  options = {}
) {
  const requestedMode =
    options.mode ===
    'ai'
      ? 'ai'
      : 'local';

  const localMock =
    buildMockExam(
      questions,
      options
    );

  if (
    requestedMode !==
    'ai'
  ) {
    return {
      ...localMock,
      generationMode:
        'local',
      requestedMode,
      aiModel:
        null,
      aiRationale:
        '',
      warnings: [],
    };
  }

  if (
    !mockAiEnabled()
  ) {
    return {
      ...localMock,
      generationMode:
        'local',
      requestedMode,
      aiModel:
        null,
      aiRationale:
        '',
      warnings: [
        'PaperStack used its local generator because AI assistance was unavailable.',
      ],
    };
  }

  try {
    const selection =
      await requestAiSelection({
        questions,
        subject:
          options.subject,
        examType:
          options.examType,
        totalMarks:
          options.totalMarks,
        durationMinutes:
          options.durationMinutes,
        strategy:
          options.strategy,
      });

    const mock =
      buildMockFromSelected(
        selection.selected,
        options
      );

    return {
      ...mock,
      generationMode:
        'ai',
      requestedMode,
      aiModel: null,
      aiRationale:
        selection.rationale,
      warnings: [],
    };
  } catch (error) {
    return {
      ...localMock,
      generationMode:
        'local',
      requestedMode,
      aiModel: null,
      aiRationale:
        '',
      warnings: [
        'PaperStack used its local generator because AI assistance was unavailable.',
      ],
    };
  }
}

module.exports = {
  DEFAULT_MODEL,
  buildMockFromSelected,
  candidateForAi,
  fetchWithRetry,
  generateMockWithMode,
  mockAiEnabled,
  mockAiModel,
  parseJsonFromText,
  requestAiSelection,
  validateSelectedIds,
};
