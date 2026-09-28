function stringId(value) {
  return String(
    value?._id ||
    value ||
    ''
  );
}

function cleanText(value, fallback = '') {
  const text =
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

  return (
    text ||
    fallback
  );
}

function sourceKey(
  userId,
  sourceType,
  sourceId,
  sourceState
) {
  return [
    stringId(userId),
    sourceType,
    stringId(sourceId),
    String(sourceState || ''),
  ].join(':');
}

function contributionEvent(
  userId,
  contribution
) {
  const status =
    contribution.status;

  if (
    ![
      'approved',
      'rejected',
      'needs_correction',
    ].includes(status)
  ) {
    return null;
  }

  const subject =
    cleanText(
      contribution.subject,
      'your paper'
    );

  const detail =
    [
      contribution.year,
      contribution.examType,
    ]
      .filter(Boolean)
      .join(' · ');

  if (
    status ===
    'approved'
  ) {
    return {
      userId,
      sourceKey:
        sourceKey(
          userId,
          'contribution',
          contribution._id,
          status
        ),
      sourceType:
        'contribution',
      sourceId:
        contribution._id,
      sourceState:
        status,
      title:
        'Contribution approved',
      message:
        `${subject}${detail ? ` · ${detail}` : ''} is now part of the PaperStack archive.`,
      severity:
        'success',
      actionUrl:
        contribution.subjectCode
          ? `/subject/${encodeURIComponent(contribution.subjectCode)}`
          : '/dashboard',
      eventAt:
        contribution.approvedAt ||
        contribution.reviewedAt ||
        contribution.updatedAt ||
        contribution.createdAt,
    };
  }

  if (
    status ===
    'needs_correction'
  ) {
    const note =
      cleanText(
        contribution.adminNote
      );

    return {
      userId,
      sourceKey:
        sourceKey(
          userId,
          'contribution',
          contribution._id,
          status
        ),
      sourceType:
        'contribution',
      sourceId:
        contribution._id,
      sourceState:
        status,
      title:
        'Contribution needs correction',
      message:
        note
          ? `${subject}: ${note}`
          : `${subject} needs a correction before it can be approved.`,
      severity:
        'warning',
      actionUrl:
        '/dashboard',
      eventAt:
        contribution.reviewedAt ||
        contribution.updatedAt ||
        contribution.createdAt,
    };
  }

  const note =
    cleanText(
      contribution.adminNote
    );

  return {
    userId,
    sourceKey:
      sourceKey(
        userId,
        'contribution',
        contribution._id,
        status
      ),
    sourceType:
      'contribution',
    sourceId:
      contribution._id,
    sourceState:
      status,
    title:
      'Contribution was not approved',
    message:
      note
        ? `${subject}: ${note}`
        : `${subject}${detail ? ` · ${detail}` : ''} was reviewed but not approved.`,
    severity:
      'warning',
    actionUrl:
      '/dashboard',
    eventAt:
      contribution.rejectedAt ||
      contribution.reviewedAt ||
      contribution.updatedAt ||
      contribution.createdAt,
  };
}

function requestEvent(
  userId,
  request
) {
  if (
    request.status !==
    'fulfilled'
  ) {
    return null;
  }

  const subject =
    cleanText(
      request.subject,
      'Requested paper'
    );

  const detail =
    [
      request.year,
      request.examType,
    ]
      .filter(Boolean)
      .join(' · ');

  return {
    userId,
    sourceKey:
      sourceKey(
        userId,
        'paper_request',
        request._id,
        'fulfilled'
      ),
    sourceType:
      'paper_request',
    sourceId:
      request._id,
    sourceState:
      'fulfilled',
    title:
      'Requested paper is available',
    message:
      `${subject}${detail ? ` · ${detail}` : ''} has been fulfilled in the archive.`,
    severity:
      'success',
    actionUrl:
      request.subjectCode
        ? `/subject/${encodeURIComponent(request.subjectCode)}`
        : '/missing-papers',
    eventAt:
      request.updatedAt ||
      request.createdAt,
  };
}

function solutionEvent(
  userId,
  solution
) {
  if (
    ![
      'approved',
      'rejected',
    ].includes(
      solution.status
    )
  ) {
    return null;
  }

  const questionId =
    stringId(
      solution.questionId
    );

  if (
    solution.status ===
    'approved'
  ) {
    return {
      userId,
      sourceKey:
        sourceKey(
          userId,
          'question_solution',
          solution._id,
          'approved'
        ),
      sourceType:
        'question_solution',
      sourceId:
        solution._id,
      sourceState:
        'approved',
      title:
        'Student solution approved',
      message:
        'Your submitted answer was reviewed and is now available as an approved PaperStack solution.',
      severity:
        'success',
      actionUrl:
        questionId
          ? `/questions/${encodeURIComponent(questionId)}`
          : '/dashboard',
      eventAt:
        solution.approvedAt ||
        solution.updatedAt ||
        solution.createdAt,
    };
  }

  const note =
    cleanText(
      solution.moderationNote
    );

  return {
    userId,
    sourceKey:
      sourceKey(
        userId,
        'question_solution',
        solution._id,
        'rejected'
      ),
    sourceType:
      'question_solution',
    sourceId:
      solution._id,
    sourceState:
      'rejected',
    title:
      'Student solution needs another attempt',
    message:
      note
        ? note
        : 'Your submitted answer was reviewed but was not approved.',
    severity:
      'warning',
    actionUrl:
      questionId
        ? `/questions/${encodeURIComponent(questionId)}`
        : '/dashboard',
    eventAt:
      solution.updatedAt ||
      solution.createdAt,
  };
}

function publicNotification(
  notification = {}
) {
  return {
    _id:
      stringId(
        notification
      ),
    sourceType:
      notification.sourceType ||
      '',
    sourceState:
      notification.sourceState ||
      '',
    title:
      notification.title ||
      '',
    message:
      notification.message ||
      '',
    severity:
      notification.severity ||
      'info',
    actionUrl:
      notification.actionUrl ||
      '',
    eventAt:
      notification.eventAt ||
      notification.createdAt ||
      null,
    readAt:
      notification.readAt ||
      null,
    isRead:
      Boolean(
        notification.readAt
      ),
  };
}

module.exports = {
  cleanText,
  contributionEvent,
  publicNotification,
  requestEvent,
  solutionEvent,
  sourceKey,
  stringId,
};
