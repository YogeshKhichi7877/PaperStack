import { preferredSubject, prioritizeSubjects, subjectSemester } from './semesterPersonalization';

const subjects = [
  { subject: 'Machine Learning', subjectCode: 'CS601', semester: 6 },
  { subject: 'Computer Graphics', subjectCode: 'CS502', semester: 5 },
  { subject: 'Cloud Computing', subjectCode: 'CS504', semesters: [5] },
];

test('semester-aware subject ordering keeps the selected semester first', () => {
  const ordered = prioritizeSubjects(subjects, 5);
  expect(ordered.slice(0, 2).map((item) => item.subjectCode)).toEqual(['CS504', 'CS502']);
  expect(preferredSubject(subjects, 6).subjectCode).toBe('CS601');
});

test('subject semester normalization supports scalar and array schemas', () => {
  expect(subjectSemester(subjects[0])).toBe(6);
  expect(subjectSemester(subjects[2])).toBe(5);
  expect(subjectSemester({})).toBeNull();
});
