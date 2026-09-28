function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function createSeededRandom(seedInput = 'paperstack') {
  const seedText = String(seedInput || 'paperstack');
  let h = 2166136261;

  for (let index = 0; index < seedText.length; index += 1) {
    h ^= seedText.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }

  let state = h >>> 0;

  return function random() {
    state += 0x6D2B79F5;

    let t = state;

    t = Math.imul(
      t ^ (t >>> 15),
      t | 1
    );

    t ^= t + Math.imul(
      t ^ (t >>> 7),
      t | 61
    );

    return (
      (
        t ^
        (t >>> 14)
      ) >>> 0
    ) / 4294967296;
  };
}

function shuffleSeeded(items = [], random = Math.random) {
  const copy = [...items];

  for (
    let index = copy.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex = Math.floor(
      random() * (index + 1)
    );

    [
      copy[index],
      copy[swapIndex],
    ] = [
      copy[swapIndex],
      copy[index],
    ];
  }

  return copy;
}

function questionMarks(question = {}) {
  const numeric = Number(question.marks);

  if (
    Number.isFinite(numeric) &&
    numeric > 0
  ) {
    return numeric;
  }

  return 2;
}

function questionTopics(question = {}) {
  const values = [];

  if (question.primaryTopic) {
    values.push(
      question.primaryTopic
    );
  }

  if (
    Array.isArray(
      question.topics
    )
  ) {
    question.topics.forEach(
      (topic) => {
        if (
          typeof topic ===
          'string'
        ) {
          values.push(topic);
        } else if (
          topic &&
          topic.name
        ) {
          values.push(
            topic.name
          );
        }
      }
    );
  }

  return [
    ...new Set(
      values
        .map(
          (value) =>
            String(
              value || ''
            ).trim()
        )
        .filter(Boolean)
    ),
  ];
}

function questionFingerprint(question = {}) {
  return normalizeText(
    question.questionText
  )
    .split(' ')
    .slice(0, 18)
    .join(' ');
}

function sectionForMarks(marksInput) {
  const marks = Number(
    marksInput || 0
  );

  if (marks <= 2) {
    return {
      key: 'short',
      title: 'Section A · Short Answer',
      description:
        'Definitions, direct concepts, and short calculations.',
    };
  }

  if (marks <= 5) {
    return {
      key: 'medium',
      title: 'Section B · Core Problems',
      description:
        'Explanations, derivations, algorithms, and medium-length problems.',
    };
  }

  return {
    key: 'long',
    title: 'Section C · Long Answer',
    description:
      'Long-form analytical, derivation, design, or multi-step questions.',
  };
}

function yearSpreadScore(question = {}, selectedYears = new Set()) {
  if (!question.year) {
    return 0;
  }

  return selectedYears.has(
    Number(question.year)
  )
    ? -4
    : 5;
}

function topicSpreadScore(question = {}, selectedTopics = new Set()) {
  const topics =
    questionTopics(question)
      .map(normalizeText)
      .filter(Boolean);

  if (!topics.length) {
    return 0;
  }

  const unseen =
    topics.filter(
      (topic) =>
        !selectedTopics.has(topic)
    );

  if (unseen.length) {
    return 8;
  }

  return -3;
}

function strategyScore(question = {}, strategy = 'balanced') {
  const marks =
    questionMarks(question);

  const repeatEvidence =
    Number(
      question.repeatCount ||
      question.repeatedInstances ||
      0
    );

  const topicEvidence =
    Number(
      question.topicScore ||
      question.importantTopicScore ||
      0
    );

  if (
    strategy ===
    'repeat-focused'
  ) {
    return (
      repeatEvidence * 8 +
      topicEvidence * 0.12 +
      Math.min(
        marks,
        10
      )
    );
  }

  if (
    strategy ===
    'broad-coverage'
  ) {
    return (
      topicEvidence * 0.07 +
      Math.min(
        marks,
        10
      ) * 0.4
    );
  }

  return (
    repeatEvidence * 4 +
    topicEvidence * 0.1 +
    Math.min(
      marks,
      10
    ) * 0.8
  );
}

function rankCandidate(
  question,
  {
    strategy,
    selectedYears,
    selectedTopics,
    random,
  }
) {
  return (
    strategyScore(
      question,
      strategy
    ) +
    yearSpreadScore(
      question,
      selectedYears
    ) +
    topicSpreadScore(
      question,
      selectedTopics
    ) +
    random() * 3
  );
}

function selectQuestions(
  questions = [],
  {
    totalMarks = 25,
    strategy = 'balanced',
    seed = 'paperstack',
  } = {}
) {
  const targetMarks =
    clampNumber(
      totalMarks,
      10,
      100,
      25
    );

  const random =
    createSeededRandom(seed);

  const seenFingerprints =
    new Set();

  const uniqueQuestions =
    shuffleSeeded(
      questions,
      random
    )
      .filter(
        (question) =>
          question &&
          question.status !==
            'rejected' &&
          String(
            question.questionText ||
            ''
          ).trim()
      )
      .filter(
        (question) => {
          const fingerprint =
            questionFingerprint(
              question
            );

          if (
            !fingerprint ||
            seenFingerprints.has(
              fingerprint
            )
          ) {
            return false;
          }

          seenFingerprints.add(
            fingerprint
          );

          return true;
        }
      );

  const selected = [];
  const selectedYears =
    new Set();
  const selectedTopics =
    new Set();

  let marksUsed = 0;
  let safety = 0;

  while (
    marksUsed < targetMarks &&
    safety < 500
  ) {
    safety += 1;

    const remaining =
      targetMarks -
      marksUsed;

    const candidates =
      uniqueQuestions
        .filter(
          (question) =>
            !selected.some(
              (item) =>
                String(item._id) ===
                String(
                  question._id
                )
            )
        )
        .filter(
          (question) =>
            questionMarks(
              question
            ) <=
            remaining + 2
        );

    if (
      !candidates.length
    ) {
      break;
    }

    const scored =
      candidates
        .map(
          (question) => ({
            question,
            score:
              rankCandidate(
                question,
                {
                  strategy,
                  selectedYears,
                  selectedTopics,
                  random,
                }
              ),
          })
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        );

    let chosen =
      scored[0]
        ?.question;

    const exact =
      scored.find(
        (item) =>
          questionMarks(
            item.question
          ) ===
          remaining
      );

    if (exact) {
      chosen =
        exact.question;
    }

    if (!chosen) {
      break;
    }

    selected.push(
      chosen
    );

    marksUsed +=
      questionMarks(
        chosen
      );

    if (chosen.year) {
      selectedYears.add(
        Number(
          chosen.year
        )
      );
    }

    questionTopics(
      chosen
    )
      .map(
        normalizeText
      )
      .filter(Boolean)
      .forEach(
        (topic) =>
          selectedTopics.add(
            topic
          )
      );
  }

  if (
    marksUsed <
      targetMarks &&
    selected.length
  ) {
    const remaining =
      targetMarks -
      marksUsed;

    const filler =
      uniqueQuestions
        .filter(
          (question) =>
            !selected.some(
              (item) =>
                String(item._id) ===
                String(
                  question._id
                )
            )
        )
        .sort(
          (a, b) =>
            Math.abs(
              questionMarks(a) -
              remaining
            ) -
            Math.abs(
              questionMarks(b) -
              remaining
            )
        )[0];

    if (
      filler &&
      Math.abs(
        (
          marksUsed +
          questionMarks(
            filler
          )
        ) -
        targetMarks
      ) <= 2
    ) {
      selected.push(
        filler
      );

      marksUsed +=
        questionMarks(
          filler
        );
    }
  }

  return {
    targetMarks,
    marksUsed,
    exactMarks:
      marksUsed ===
      targetMarks,
    selected,
  };
}

function publicQuestion(
  question = {},
  number = 1
) {
  const paper =
    question.paperId &&
    typeof question.paperId ===
      'object'
      ? question.paperId
      : question.paper ||
        null;

  const marks =
    questionMarks(
      question
    );

  const section =
    sectionForMarks(
      marks
    );

  return {
    _id:
      String(
        question._id ||
        ''
      ),
    number,
    questionLabel:
      question.questionLabel ||
      `Q${number}`,
    questionText:
      question.questionText ||
      '',
    marks,
    sectionKey:
      section.key,
    sectionTitle:
      section.title,
    sectionDescription:
      section.description,
    subject:
      question.subject ||
      '',
    subjectCode:
      question.subjectCode ||
      '',
    year:
      question.year ??
      null,
    examType:
      question.examType ||
      '',
    questionType:
      question.questionType ||
      '',
    unit:
      question.unit ??
      null,
    primaryTopic:
      question.primaryTopic ||
      '',
    topics:
      questionTopics(
        question
      ),
    repeatCount:
      Number(
        question.repeatCount ||
        question.repeatedInstances ||
        0
      ),
    approvedSolutionCount:
      Number(
        question.approvedSolutionCount ||
        0
      ),
    sourceLocation:
      question.sourceLocation ||
      {},
    paper: paper
      ? {
          _id:
            paper._id,
          title:
            paper.title ||
            '',
          filePath:
            paper.filePath ||
            '',
          solutionPath:
            paper.solutionPath ||
            '',
        }
      : null,
  };
}

function buildSections(publicQuestions = []) {
  const order = [
    'short',
    'medium',
    'long',
  ];

  const map =
    new Map();

  publicQuestions.forEach(
    (question) => {
      if (
        !map.has(
          question.sectionKey
        )
      ) {
        map.set(
          question.sectionKey,
          {
            key:
              question.sectionKey,
            title:
              question.sectionTitle,
            description:
              question.sectionDescription,
            questions: [],
            marks: 0,
          }
        );
      }

      const section =
        map.get(
          question.sectionKey
        );

      section.questions.push(
        question
      );

      section.marks +=
        Number(
          question.marks ||
          0
        );
    }
  );

  return order
    .map(
      (key) =>
        map.get(key)
    )
    .filter(Boolean);
}

function buildMockExam(
  questions = [],
  {
    subject = {},
    examType = '',
    totalMarks = 25,
    durationMinutes = 60,
    strategy = 'balanced',
    seed = 'paperstack',
  } = {}
) {
  const duration =
    clampNumber(
      durationMinutes,
      10,
      240,
      60
    );

  const selection =
    selectQuestions(
      questions,
      {
        totalMarks,
        strategy,
        seed,
      }
    );

  const publicQuestions =
    selection.selected.map(
      (
        question,
        index
      ) =>
        publicQuestion(
          question,
          index + 1
        )
    );

  const sections =
    buildSections(
      publicQuestions
    );

  const years = [
    ...new Set(
      publicQuestions
        .map(
          (question) =>
            Number(
              question.year
            )
        )
        .filter(Boolean)
    ),
  ].sort(
    (a, b) => b - a
  );

  const topics = [
    ...new Set(
      publicQuestions
        .flatMap(
          (question) =>
            question.topics
        )
        .filter(Boolean)
    ),
  ];

  const repeatBacked =
    publicQuestions.filter(
      (question) =>
        question.repeatCount >
        1
    ).length;

  const solutionReady =
    publicQuestions.filter(
      (question) =>
        question
          .approvedSolutionCount >
        0
    ).length;

  return {
    version:
      'mock-exam-v1',
    mockId:
      [
        subject.subjectCode ||
          'subject',
        examType ||
          'all',
        selection.targetMarks,
        duration,
        strategy,
        seed,
      ].join(':'),
    seed:
      String(seed),
    subject: {
      subjectCode:
        subject.subjectCode ||
        publicQuestions[0]
          ?.subjectCode ||
        '',
      subject:
        subject.subject ||
        publicQuestions[0]
          ?.subject ||
        '',
      branch:
        subject.branch ||
        '',
      semester:
        subject.semester ??
        null,
    },
    examType,
    strategy,
    durationMinutes:
      duration,
    targetMarks:
      selection.targetMarks,
    generatedMarks:
      selection.marksUsed,
    exactMarks:
      selection.exactMarks,
    summary: {
      totalQuestions:
        publicQuestions.length,
      yearsCovered:
        years.length,
      years,
      topicsCovered:
        topics.length,
      topics,
      repeatBacked,
      solutionReady,
    },
    instructions: [
      `Time: ${duration} minutes.`,
      `Maximum marks: ${selection.marksUsed}.`,
      'Attempt every question unless your instructor uses a different choice pattern.',
      'Do not open solutions until you finish the mock if you want realistic practice.',
      'Questions are selected from the current PaperStack archive; this mock does not predict future exam questions.',
    ],
    sections,
    questions:
      publicQuestions,
    generationNotes: {
      strategy:
        strategy ===
        'repeat-focused'
          ? 'Prioritizes repeated-PYQ evidence while still avoiding duplicate questions.'
          : strategy ===
            'broad-coverage'
            ? 'Prioritizes topic/year spread across the available archive.'
            : 'Balances topic spread, year spread, marks, and repeated-PYQ evidence.',
      disclaimer:
        'This mock is assembled from archived questions for practice. It is not an official IIIT Surat paper and does not predict the next exam.',
    },
  };
}

module.exports = {
  buildMockExam,
  buildSections,
  clampNumber,
  createSeededRandom,
  normalizeText,
  publicQuestion,
  questionFingerprint,
  questionMarks,
  questionTopics,
  sectionForMarks,
  selectQuestions,
  shuffleSeeded,
  strategyScore,
};
