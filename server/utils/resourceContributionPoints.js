const RESOURCE_XP_RULES = Object.freeze({
  solution: 120,
  notes: 60,
  formula_sheet: 50,
  assignment: 40,
  lab_material: 40,
  quiz: 30,
  viva_questions: 30,
  important_questions: 50,
  syllabus: 30,
  revision_sheet: 60,
  other: 20,
});

const FIRST_CATEGORY_BONUS = 25;

function safeResourceKind(value) {
  return String(value || '').trim();
}

function baseResourcePoints(kind) {
  return Number(
    RESOURCE_XP_RULES[
      safeResourceKind(kind)
    ] || 0
  );
}

function calculateResourcePoints(
  kind,
  {
    firstInCategory = false,
  } = {}
) {
  const base =
    baseResourcePoints(kind);

  const bonus =
    firstInCategory && base > 0
      ? FIRST_CATEGORY_BONUS
      : 0;

  return {
    base,
    bonus,
    total:
      base + bonus,
  };
}

function resourcePointRules() {
  return {
    rules:
      RESOURCE_XP_RULES,
    firstCategoryBonus:
      FIRST_CATEGORY_BONUS,
    note:
      'Points are awarded only after admin approval. The first approved resource in a subject/category receives the bonus.',
  };
}

module.exports = {
  FIRST_CATEGORY_BONUS,
  RESOURCE_XP_RULES,
  baseResourcePoints,
  calculateResourcePoints,
  resourcePointRules,
  safeResourceKind,
};
