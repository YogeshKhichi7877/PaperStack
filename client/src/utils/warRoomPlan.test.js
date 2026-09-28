import { battlePlan, examMinutes, rankActions, readinessBreakdown } from './warRoomPlan';

test('weak mock evidence moves an unfinished archive action to the top', () => {
  const actions = [
    { id: 'a', topic: 'Strong topic', score: 70, minutes: 12 },
    { id: 'b', topic: 'Weak topic', score: 60, minutes: 12 },
  ];
  const ranked = rankActions(actions, new Set(), [{ topic: 'Weak topic', accuracy: 20 }]);
  expect(ranked[0].id).toBe('b');
  expect(rankActions(actions, new Set(['b']), [])[0].id).toBe('a');
});

test('readiness uses only recorded components and never predicts marks', () => {
  const room = {
    missions: { practice: [{ id: 'p1' }, { id: 'p2' }] },
    checklist: [{ key: 'clipping' }],
  };
  const readiness = readinessBreakdown(room, new Set(['p1']), { clipping: true }, []);
  expect(readiness.percentage).toBe(69);
  expect(readiness.components).toHaveLength(2);
  expect(readiness.methodology).toMatch(/not predicted exam marks/);
});

test('battle plan fits its time box and exam clock handles missing dates', () => {
  const actions = [{ id: 'a', minutes: 12 }, { id: 'b', minutes: 12 }];
  expect(battlePlan(actions, 20).reduce((sum, item) => sum + item.minutes, 0)).toBe(20);
  expect(examMinutes('')).toBeNull();
});
