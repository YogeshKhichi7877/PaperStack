export function subjectSemester(subject) {
  const direct = Number(subject?.semester);
  if (Number.isInteger(direct)) return direct;
  const list = Array.isArray(subject?.semesters) ? subject.semesters.map(Number) : [];
  return list.find(Number.isInteger) || null;
}

export function prioritizeSubjects(subjects, semester) {
  const wanted = Number(semester);
  return [...(subjects || [])].sort((a, b) => {
    const aMatch = subjectSemester(a) === wanted ? 0 : 1;
    const bMatch = subjectSemester(b) === wanted ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return String(a.subject || a.subjectName || a.name || '').localeCompare(String(b.subject || b.subjectName || b.name || ''));
  });
}

export function preferredSubject(subjects, semester) {
  return prioritizeSubjects(subjects, semester)[0] || null;
}
