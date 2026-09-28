const {
  buildRevisionSheet,
} = require('./revisionSheetService');

function clampMinutes(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 60;
  }

  return Math.max(
    20,
    Math.min(
      180,
      Math.round(numeric)
    )
  );
}

function allocateSessionMinutes(totalMinutesInput) {
  const totalMinutes =
    clampMinutes(totalMinutesInput);

  const topicReview =
    Math.max(
      1,
      Math.floor(totalMinutes * 0.35)
    );

  const repeatDrill =
    Math.max(
      1,
      Math.floor(totalMinutes * 0.25)
    );

  const questionPractice =
    Math.max(
      1,
      Math.floor(totalMinutes * 0.30)
    );

  const finalReview =
    Math.max(
      1,
      totalMinutes -
      topicReview -
      repeatDrill -
      questionPractice
    );

  return {
    totalMinutes,
    phases: [
      {
        key: 'topics',
        label: 'Priority Topics',
        minutes: topicReview,
        purpose:
          'Review the strongest historical topic signals first.',
      },
      {
        key: 'repeats',
        label: 'Repeated PYQs',
        minutes: repeatDrill,
        purpose:
          'Revisit exact and near-repeated questions across years.',
      },
      {
        key: 'practice',
        label: 'Must Practice',
        minutes: questionPractice,
        purpose:
          'Attempt the highest-value question shortlist without looking at solutions first.',
      },
      {
        key: 'final',
        label: 'Final Recall',
        minutes: finalReview,
        purpose:
          'Close the session by recalling formulas, steps, and weak areas from memory.',
      },
    ],
  };
}

function topicMission(topic = {}, index = 0) {
  return {
    id: `topic:${String(topic.topic || index).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'topic',
    order: index + 1,
    title: topic.topic || 'Topic',
    score: Number(topic.score || 0),
    signal: topic.signal || 'limited',
    occurrences: Number(topic.occurrences || 0),
    years: topic.years || [],
    examTypes: topic.examTypes || [],
    totalMarks: Number(topic.totalMarks || 0),
    repeatedInstances: Number(topic.repeatedInstances || 0),
    source: topic.source || 'derived',
  };
}

function repeatMission(cluster = {}, index = 0) {
  return {
    id: `repeat:${cluster.representativeQuestionId || index}`,
    type: 'repeat',
    order: index + 1,
    title: cluster.representativeText || 'Repeated PYQ',
    representativeQuestionId:
      cluster.representativeQuestionId || null,
    occurrenceCount:
      Number(cluster.occurrenceCount || 0),
    distinctYearCount:
      Number(cluster.distinctYearCount || 0),
    years: cluster.years || [],
    examTypes: cluster.examTypes || [],
    marks: cluster.marks || [],
    matchType: cluster.matchType || 'similar',
    averageSimilarity:
      Number(cluster.averageSimilarity || 0),
  };
}

function practiceMission(question = {}, index = 0) {
  return {
    id: `question:${question._id || index}`,
    type: 'question',
    order: index + 1,
    questionId: question._id,
    title:
      question.questionText ||
      'Practice question',
    questionLabel:
      question.questionLabel || '',
    marks:
      question.marks ?? null,
    year:
      question.year ?? null,
    examType:
      question.examType || '',
    matchedTopic:
      question.matchedTopic || '',
    repeatBacked:
      Boolean(question.repeatBacked),
    approvedSolutionCount:
      Number(
        question.approvedSolutionCount || 0
      ),
    sourceLocation:
      question.sourceLocation || {},
    paper:
      question.paper || null,
    revisionScore:
      Number(question.revisionScore || 0),
  };
}

function buildExamWarRoom(
  questions = [],
  {
    subject = {},
    examType = '',
    repeatThreshold = 0.72,
    sessionMinutes = 60,
    solutionCounts = {},
    solutions = [],
    resources = [],
  } = {}
) {
  const revision = buildRevisionSheet(
    questions,
    {
      subject,
      examType,
      repeatThreshold,
      topicLimit: 12,
      practiceLimit: 14,
      solutionCounts,
      solutions,
      resources,
    }
  );

  const focusPlan =
    allocateSessionMinutes(
      sessionMinutes
    );

  const topicMissions =
    (revision.priorityTopics || [])
      .slice(0, 6)
      .map(topicMission);

  const repeatMissions =
    (revision.repeatedClusters || [])
      .slice(0, 6)
      .map(repeatMission);

  const practiceMissions =
    (revision.mustPracticeQuestions || [])
      .slice(0, 10)
      .map(practiceMission);

  const allMissionIds = [
    ...topicMissions,
    ...repeatMissions,
    ...practiceMissions,
  ].map((item) => item.id);

  const solutionReadyQuestions =
    practiceMissions.filter(
      (item) =>
        item.approvedSolutionCount > 0
    ).length;

  const repeatBackedPractice =
    practiceMissions.filter(
      (item) =>
        item.repeatBacked
    ).length;

  const actions = topicMissions.map((topic) => {
    const question = practiceMissions.find((item) =>
      String(item.matchedTopic || '').toLowerCase() === String(topic.title).toLowerCase()
    );
    return {
      id: question?.id || topic.id,
      topicId: topic.id,
      topic: topic.title,
      type: question ? 'solve' : 'revise',
      title: question ? `Solve ${topic.title} PYQ` : `Revise ${topic.title}`,
      href: question?.questionId ? `/questions/${question.questionId}` : '',
      questionId: question?.questionId || '',
      score: topic.score,
      occurrences: topic.occurrences,
      years: topic.years,
      minutes: question ? 12 : 8,
      reason: topic.occurrences
        ? `Appeared in ${topic.occurrences} archived question${topic.occurrences === 1 ? '' : 's'}.`
        : 'Included in the archive topic evidence.',
    };
  });

  return {
    version: 'exam-war-room-v1',
    subject: revision.subject,
    scope: revision.scope,
    summary: {
      ...revision.summary,
      totalMissions:
        allMissionIds.length,
      topicMissions:
        topicMissions.length,
      repeatMissions:
        repeatMissions.length,
      practiceMissions:
        practiceMissions.length,
      solutionReadyQuestions,
      repeatBackedPractice,
    },
    focusPlan,
    missions: {
      topics: topicMissions,
      repeats: repeatMissions,
      practice: practiceMissions,
      allMissionIds,
    },
    command: {
      actions,
      archiveBriefing: actions.length
        ? `Start with ${actions.slice(0, 2).map((item) => item.topic).join(' and ')}. These are the strongest available archive signals for this subject.`
        : 'No extracted topic evidence is available yet. Start with an approved resource or a short practice set.',
      aiBriefing: '',
      revision: revision.workspace,
      drills: [5, 10, 20].map((duration) => ({
        minutes: duration,
        questions: practiceMissions.slice(0, duration === 5 ? 1 : duration === 10 ? 2 : 4),
      })),
    },
    checklist:
      revision.checklist || [],
    methodology: {
      source:
        'Built from the current PaperStack archive: extracted questions, historical topic evidence, repeated PYQs, marks, and approved student-solution availability.',
      disclaimer:
        'The War Room prioritizes revision using historical archive evidence. It does not predict future exam questions.',
    },
  };
}

module.exports = {
  allocateSessionMinutes,
  buildExamWarRoom,
  clampMinutes,
  practiceMission,
  repeatMission,
  topicMission,
};
