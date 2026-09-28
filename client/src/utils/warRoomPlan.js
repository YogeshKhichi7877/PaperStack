export function rankActions(actions = [], completed = new Set(), weaknesses = []) {
  const weakByTopic = new Map(weaknesses.map((item) => [item.topic.toLowerCase().trim(), item]));
  return actions.filter((item) => !completed.has(item.id) && !completed.has(item.topicId))
    .map((item) => {
      const weakness = weakByTopic.get(String(item.topic || '').toLowerCase().trim());
      const weakBoost = weakness ? Math.max(0, 70 - weakness.accuracy) * 0.5 : 0;
      return { ...item, priority: Number(item.score || 0) + weakBoost, weakness: weakness || null };
    }).sort((a, b) => b.priority - a.priority);
}

export function readinessBreakdown(room, completed, revisionDone, mockHistory) {
  const practice = room?.missions?.practice || [];
  const checklist = room?.checklist || [];
  const components = [];
  if (practice.length) components.push({ label: 'PYQ practice', value: Math.round(practice.filter((item) => completed.has(item.id)).length / practice.length * 100), weight: 40 });
  if (checklist.length) components.push({ label: 'Revision', value: Math.round(checklist.filter((item) => revisionDone[item.key]).length / checklist.length * 100), weight: 25 });
  const latest = mockHistory[0];
  if (latest && Number.isFinite(latest.percentage)) components.push({ label: 'Latest mock', value: Math.max(0, Math.min(100, latest.percentage)), weight: 35 });
  const totalWeight = components.reduce((sum, item) => sum + item.weight, 0);
  return {
    percentage: totalWeight ? Math.round(components.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight) : null,
    components,
    methodology: 'Weighted available evidence: PYQ practice 40%, revision checklist 25%, latest evaluated mock 35%. Missing components are omitted and weights are renormalized. This measures recorded preparation, not predicted exam marks.',
  };
}

export function examMinutes(examTime, now = Date.now()) {
  if (!examTime) return null;
  const target = new Date(examTime).getTime();
  return Number.isFinite(target) ? Math.max(0, Math.floor((target - now) / 60000)) : null;
}

export function battlePlan(actions = [], totalMinutes = 60, offset = 0) {
  if (!actions.length) return [];
  const rotated = [...actions.slice(offset % actions.length), ...actions.slice(0, offset % actions.length)];
  let remaining = Math.max(20, Math.min(180, Number(totalMinutes) || 60));
  const result = [];
  for (const item of rotated) {
    if (remaining < 8 || result.length >= 4) break;
    const minutes = Math.min(remaining, Math.max(8, Number(item.minutes) || 12));
    result.push({ ...item, minutes });
    remaining -= minutes;
  }
  return result;
}
