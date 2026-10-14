// A numbered question is one record even when it has lettered or Roman parts.
// Keep the part labels in the text so no answerable instruction disappears.
function linesOf(value) {
  return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function commonLines(items) {
  if (items.length < 2) return [];
  const first = items[0];
  let count = first.length;
  for (const lines of items.slice(1)) {
    count = Math.min(count, lines.length);
    for (let index = 0; index < count; index += 1) {
      if (first[index] !== lines[index]) { count = index; break; }
    }
  }
  return first.slice(0, count);
}

function renderParts(group) {
  const root = { children: new Map(), items: [] };
  for (const item of group) {
    let node = root;
    for (const segment of String(item.part || '').split('-').filter(Boolean)) {
      if (!node.children.has(segment)) node.children.set(segment, { children: new Map(), items: [], segment });
      node = node.children.get(segment);
    }
    node.items.push({ question: item, lines: linesOf(item.questionText) });
  }
  const descendants = (node) => [
    ...node.items,
    ...[...node.children.values()].flatMap(descendants),
  ];
  function render(node, consumed = 0) {
    const items = descendants(node);
    const common = node.children.size === 0 && items.length === 1
      ? items[0].lines.slice(consumed)
      : commonLines(items.map((item) => item.lines.slice(consumed)));
    const body = common.length ? [common.join('\n')] : [];
    // A separately returned parent stem is not necessarily repeated in its
    // children. Keep its unshared text instead of dropping it at branch nodes.
    if (node.children.size) {
      for (const own of node.items) {
        const remaining = own.lines.slice(consumed + common.length).join('\n');
        if (remaining) body.push(remaining);
      }
    }
    if (node.items.length && node.children.size === 0) {
      const leaf = node.items[0].question;
      if (leaf.marks != null && node !== root && body.length) body[body.length - 1] += ` [${leaf.marks} marks]`;
    }
    for (const child of node.children.values()) {
      const rendered = render(child, consumed + common.length);
      body.push(`(${child.segment}) ${rendered}`.trim());
    }
    return body.filter(Boolean).join('\n\n');
  }
  return render(root).trim();
}

function mergeGroup(group) {
  if (!group.some((item) => item.part)) return group;
  const first = group[0];
  const parts = group.filter((item) => item.part);
  const totalMarks = parts.every((item) => item.marks != null)
    ? parts.reduce((sum, item) => sum + Number(item.marks), 0) : null;
  const number = String(first.questionNumber);
  const base = group.find((item) => !item.part) || first;
  const parentMarks = base.part ? null : base.marks ?? null;
  const marks = parentMarks ?? totalMarks;
  const questionText = renderParts(group);
  const choiceGroups = new Set(group.map((item) => item.choiceGroup).filter(Boolean));
  return [{
    ...base,
    questionKey: `q${number}`.toLowerCase(),
    questionLabel: `Q${number}`,
    part: '',
    parentQuestionKey: '',
    questionText,
    rawText: group.map((item) => item.rawText || item.questionText).join('\n'),
    marks,
    confidence: Math.min(...group.map((item) => Number(item.confidence) || 0)),
    needsReview: group.some((item) => item.needsReview) || parts.length === 1 ||
      marks == null || choiceGroups.size > 1 ||
      (parentMarks != null && totalMarks != null && parentMarks !== totalMarks),
    hasVisualContext: group.some((item) => item.hasVisualContext),
    pageNumber: group.find((item) => item.pageNumber != null)?.pageNumber ?? null,
    pageStart: group.find((item) => item.pageStart != null)?.pageStart ??
      group.find((item) => item.pageNumber != null)?.pageNumber ?? null,
    pageEnd: [...group].reverse().find((item) => item.pageEnd != null)?.pageEnd ?? null,
    charStart: group.find((item) => item.charStart != null)?.charStart ?? null,
    charEnd: [...group].reverse().find((item) => item.charEnd != null)?.charEnd ?? null,
    mergedPartKeys: parts.map((item) => String(item.questionKey).toLowerCase()),
  }];
}

function combineSubparts(questions = []) {
  const result = [];
  let group = [];
  const flush = () => { result.push(...mergeGroup(group)); group = []; };
  for (const item of questions) {
    const sameNumber = group.length &&
      String(group[0].questionNumber).toLowerCase() === String(item.questionNumber).toLowerCase() &&
      String(group[0].section || '').toLowerCase() === String(item.section || '').toLowerCase();
    // A new un-parted label starts another question (including an OR alternative).
    if (group.length && (!sameNumber || !item.part ||
      group.some((previous) => previous.part === item.part))) flush();
    group.push(item);
  }
  if (group.length) flush();
  return result.map((item, index) => ({ ...item, sequence: index + 1 }));
}

module.exports = { combineSubparts };
