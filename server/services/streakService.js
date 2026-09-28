const STUDY_CATEGORIES = [
  'archive',
  'questions',
  'revision',
  'war_room',
  'ask',
  'mock',
];

function validDayKey(
  value
) {
  const text =
    String(value || '');

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${text}T00:00:00Z`
    );

  return (
    !Number.isNaN(
      date.getTime()
    ) &&
    date
      .toISOString()
      .slice(
        0,
        10
      ) ===
      text
  );
}

function dateFromDayKey(
  dayKey
) {
  return new Date(
    `${dayKey}T00:00:00Z`
  );
}

function dayDiff(
  newer,
  older
) {
  return Math.round(
    (
      dateFromDayKey(
        newer
      ) -
      dateFromDayKey(
        older
      )
    ) /
      86400000
  );
}

function normalizeCategory(
  value
) {
  const category =
    String(value || '')
      .trim()
      .toLowerCase();

  return (
    STUDY_CATEGORIES.includes(
      category
    )
      ? category
      : null
  );
}

function normalizeActivities(
  activities = []
) {
  const byDay =
    new Map();

  activities.forEach(
    (activity) => {
      const dayKey =
        String(
          activity.dayKey ||
          ''
        );

      if (
        !validDayKey(
          dayKey
        )
      ) {
        return;
      }

      if (
        !byDay.has(
          dayKey
        )
      ) {
        byDay.set(
          dayKey,
          {
            dayKey,
            categories:
              new Set(),
            eventCount:
              0,
          }
        );
      }

      const entry =
        byDay.get(
          dayKey
        );

      (
        activity.categories ||
        []
      ).forEach(
        (category) => {
          const normalized =
            normalizeCategory(
              category
            );

          if (
            normalized
          ) {
            entry.categories.add(
              normalized
            );
          }
        }
      );

      entry.eventCount +=
        Number(
          activity.eventCount ||
          0
        );
    }
  );

  return [
    ...byDay.values(),
  ]
    .map(
      (entry) => ({
        dayKey:
          entry.dayKey,
        categories:
          [
            ...entry.categories,
          ],
        eventCount:
          entry.eventCount,
      })
    )
    .sort(
      (a, b) =>
        a.dayKey.localeCompare(
          b.dayKey
        )
    );
}

function computeStreaks(
  activities = [],
  todayKey
) {
  const normalized =
    normalizeActivities(
      activities
    );

  if (
    !normalized.length
  ) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      activeDays: 0,
      lastActiveDay: null,
    };
  }

  let longest =
    1;

  let running =
    1;

  for (
    let index = 1;
    index <
    normalized.length;
    index += 1
  ) {
    if (
      dayDiff(
        normalized[index]
          .dayKey,
        normalized[
          index - 1
        ].dayKey
      ) ===
      1
    ) {
      running +=
        1;

      longest =
        Math.max(
          longest,
          running
        );
    } else {
      running =
        1;
    }
  }

  const last =
    normalized[
      normalized.length -
      1
    ].dayKey;

  const referenceToday =
    validDayKey(
      todayKey
    )
      ? todayKey
      : new Date()
          .toISOString()
          .slice(
            0,
            10
          );

  const gap =
    dayDiff(
      referenceToday,
      last
    );

  let current =
    0;

  if (
    gap === 0 ||
    gap === 1
  ) {
    current =
      1;

    for (
      let index =
        normalized.length -
        1;
      index > 0;
      index -= 1
    ) {
      if (
        dayDiff(
          normalized[index]
            .dayKey,
          normalized[
            index - 1
          ].dayKey
        ) ===
        1
      ) {
        current +=
          1;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak:
      current,
    longestStreak:
      longest,
    activeDays:
      normalized.length,
    lastActiveDay:
      last,
  };
}

function categoryDayCounts(
  activities = []
) {
  const counts =
    Object.fromEntries(
      STUDY_CATEGORIES.map(
        (category) => [
          category,
          0,
        ]
      )
    );

  normalizeActivities(
    activities
  ).forEach(
    (activity) => {
      activity.categories.forEach(
        (category) => {
          counts[
            category
          ] +=
            1;
        }
      );
    }
  );

  return counts;
}

const BADGE_DEFINITIONS = [
  {
    id:
      'first_session',
    title:
      'First Session',
    description:
      'Study on PaperStack for the first day.',
    metric:
      'activeDays',
    target:
      1,
    icon:
      '01',
  },
  {
    id:
      'flow_3',
    title:
      '3-Day Flow',
    description:
      'Build a 3-day study streak.',
    metric:
      'longestStreak',
    target:
      3,
    icon:
      '03',
  },
  {
    id:
      'streak_7',
    title:
      '7-Day Streak',
    description:
      'Study for 7 consecutive days.',
    metric:
      'longestStreak',
    target:
      7,
    icon:
      '07',
  },
  {
    id:
      'streak_14',
    title:
      '14-Day Streak',
    description:
      'Keep the study chain alive for two weeks.',
    metric:
      'longestStreak',
    target:
      14,
    icon:
      '14',
  },
  {
    id:
      'streak_30',
    title:
      '30-Day Streak',
    description:
      'Maintain a full 30-day study streak.',
    metric:
      'longestStreak',
    target:
      30,
    icon:
      '30',
  },
  {
    id:
      'revision_regular',
    title:
      'Revision Regular',
    description:
      'Use revision tools on 3 different days.',
    metric:
      'category:revision',
    target:
      3,
    icon:
      'RV',
  },
  {
    id:
      'mock_grinder',
    title:
      'Mock Grinder',
    description:
      'Practice with mock tools on 3 different days.',
    metric:
      'category:mock',
    target:
      3,
    icon:
      'MK',
  },
  {
    id:
      'question_hunter',
    title:
      'PYQ Hunter',
    description:
      'Study questions/subject hubs on 5 different days.',
    metric:
      'category:questions',
    target:
      5,
    icon:
      'Q',
  },
  {
    id:
      'ask_explorer',
    title:
      'Ask Explorer',
    description:
      'Use Ask PaperStack on 3 different days.',
    metric:
      'category:ask',
    target:
      3,
    icon:
      'AI',
  },
  {
    id:
      'archive_builder',
    title:
      'Archive Builder',
    description:
      'Get at least one paper contribution approved.',
    metric:
      'community:approvedContributions',
    target:
      1,
    icon:
      'UP',
  },
  {
    id:
      'solution_helper',
    title:
      'Solution Helper',
    description:
      'Get at least one student solution approved.',
    metric:
      'community:approvedSolutions',
    target:
      1,
    icon:
      'SOL',
  },
  {
    id:
      'archive_verifier',
    title:
      'Archive Verifier',
    description:
      'Verify five archived papers.',
    metric:
      'community:verificationCount',
    target:
      5,
    icon:
      'OK',
  },
];

function metricValue(
  definition,
  {
    streaks,
    categoryCounts,
    community,
  }
) {
  if (
    definition.metric ===
    'activeDays'
  ) {
    return Number(
      streaks.activeDays ||
      0
    );
  }

  if (
    definition.metric ===
    'longestStreak'
  ) {
    return Number(
      streaks.longestStreak ||
      0
    );
  }

  if (
    definition.metric.startsWith(
      'category:'
    )
  ) {
    const category =
      definition.metric.split(
        ':'
      )[1];

    return Number(
      categoryCounts[
        category
      ] ||
      0
    );
  }

  if (
    definition.metric.startsWith(
      'community:'
    )
  ) {
    const key =
      definition.metric.split(
        ':'
      )[1];

    return Number(
      community[
        key
      ] ||
      0
    );
  }

  return 0;
}

function buildBadges({
  streaks = {},
  categoryCounts = {},
  community = {},
} = {}) {
  return BADGE_DEFINITIONS.map(
    (definition) => {
      const value =
        metricValue(
          definition,
          {
            streaks,
            categoryCounts,
            community,
          }
        );

      const target =
        Number(
          definition.target ||
          1
        );

      return {
        id:
          definition.id,
        title:
          definition.title,
        description:
          definition.description,
        icon:
          definition.icon,
        earned:
          value >=
          target,
        value,
        target,
        progressPct:
          Math.min(
            100,
            Math.round(
              (
                value /
                target
              ) *
                100
            )
          ),
      };
    }
  );
}

function buildRecentDays(
  activities = [],
  todayKey,
  days = 30
) {
  const normalized =
    normalizeActivities(
      activities
    );

  const map =
    new Map(
      normalized.map(
        (activity) => [
          activity.dayKey,
          activity,
        ]
      )
    );

  const reference =
    validDayKey(
      todayKey
    )
      ? dateFromDayKey(
          todayKey
        )
      : new Date(
          `${new Date().toISOString().slice(0, 10)}T00:00:00Z`
        );

  const result =
    [];

  for (
    let offset =
      days - 1;
    offset >=
    0;
    offset -= 1
  ) {
    const date =
      new Date(
        reference.getTime() -
        offset *
          86400000
      );

    const key =
      date
        .toISOString()
        .slice(
          0,
          10
        );

    const activity =
      map.get(
        key
      );

    result.push({
      dayKey:
        key,
      active:
        Boolean(
          activity
        ),
      categories:
        activity
          ?.categories ||
        [],
      eventCount:
        activity
          ?.eventCount ||
        0,
    });
  }

  return result;
}

function buildStreakSnapshot({
  activities = [],
  todayKey,
  community = {},
} = {}) {
  const normalized =
    normalizeActivities(
      activities
    );

  const streaks =
    computeStreaks(
      normalized,
      todayKey
    );

  const categoryCounts =
    categoryDayCounts(
      normalized
    );

  const badges =
    buildBadges({
      streaks,
      categoryCounts,
      community,
    });

  return {
    ...streaks,
    categoryDayCounts:
      categoryCounts,
    earnedBadges:
      badges.filter(
        (badge) =>
          badge.earned
      ),
    lockedBadges:
      badges.filter(
        (badge) =>
          !badge.earned
      ),
    badges,
    recentDays:
      buildRecentDays(
        normalized,
        todayKey,
        30
      ),
    community,
    methodology: {
      activityRule:
        'A study day is counted only when an authenticated student opens a PaperStack study route such as Questions, Subject Hubs, Revision, War Room, Ask, Mock Exams, or Semester Survival.',
      privacy:
        'PaperStack stores only the study day and broad study-tool categories for streaks. It does not store the text of your answers or Ask PaperStack prompts in StudyActivity.',
    },
  };
}

module.exports = {
  BADGE_DEFINITIONS,
  STUDY_CATEGORIES,
  buildBadges,
  buildRecentDays,
  buildStreakSnapshot,
  categoryDayCounts,
  computeStreaks,
  dayDiff,
  normalizeActivities,
  normalizeCategory,
  validDayKey,
};
