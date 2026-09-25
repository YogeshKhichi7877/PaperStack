const RESOURCE_TYPES = Object.freeze([
  { value: 'question_paper', label: 'Question Paper' },
  { value: 'solution', label: 'Solution' },
  { value: 'notes', label: 'Notes' },
  { value: 'formula_sheet', label: 'Formula Sheet' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'lab_material', label: 'Lab Material' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'viva_questions', label: 'Viva Questions' },
  { value: 'important_questions', label: 'Important Questions' },
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'revision_sheet', label: 'Revision Sheet' },
  { value: 'other', label: 'Other Resource' },
]);

const RESOURCE_TYPE_VALUES = Object.freeze(RESOURCE_TYPES.map((item) => item.value));

function isValidResourceType(value) {
  return RESOURCE_TYPE_VALUES.includes(String(value || '').trim());
}

module.exports = {
  RESOURCE_TYPES,
  RESOURCE_TYPE_VALUES,
  isValidResourceType,
};
