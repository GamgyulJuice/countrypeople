import { describe, expect, it } from 'vitest';
import { roadmapPeriods } from './task-period';
import type { Task } from './types';
import { blankProfile } from './types';
import { onboardingTasks } from './onboarding';
const task = (id: string, date: string, completed = false): Task => ({ id, user_id: 'u', title: id, due_date: date, completed, category: '생활', policy_id: null });

describe('roadmap periods between successive starts', () => {
  it('does not duplicate an existing stage after its computed end has been saved', () => {
    const profile = { ...blankProfile('u'), move_date: null };
    const first = onboardingTasks(profile, [], [], [], '2026-10-03');
    const saved = roadmapPeriods(first).map((t, i) => ({ ...t, id: String(i) }));
    expect(onboardingTasks(profile, [], [], saved, '2026-10-03')).toEqual([]);
  });
  it('immediately expands legacy single dates through the day before the next task', () => {
    const source = [task('B', '2026-10-15'), task('A', '2026-10-01'), task('C', '2026-11-01')];
    const result = roadmapPeriods(source);
    expect(result.map(t => [t.id, t.start_date, t.due_date])).toEqual([
      ['A', '2026-10-01', '2026-10-14'],
      ['B', '2026-10-15', '2026-10-31'],
      ['C', '2026-11-01', '2026-11-01'],
    ]);
    expect(source[1].due_date).toBe('2026-10-01');
    expect(source[1].start_date).toBeUndefined();
  });
  it('uses the next distinct date for ties and counts completed tasks as boundaries', () => {
    const result = roadmapPeriods([task('A', '2026-10-01'), task('B', '2026-10-01'), task('C', '2026-10-10', true), task('D', '2026-10-20')]);
    expect(result.filter(t => !t.completed).map(t => [t.id, t.due_date])).toEqual([['A', '2026-10-09'], ['B', '2026-10-09'], ['D', '2026-10-20']]);
  });
  it('recomputes boundaries after insertion, deletion and date changes', () => {
    const source = [task('A', '2026-10-01'), task('B', '2026-10-15')];
    expect(roadmapPeriods([...source, task('C', '2026-10-07')])[0].due_date).toBe('2026-10-06');
    expect(roadmapPeriods([source[0], { ...source[1], due_date: '2026-11-01' }])[0].due_date).toBe('2026-10-31');
    expect(roadmapPeriods([source[0]])[0].due_date).toBe('2026-10-01');
  });
  it('uses explicit starts, not fixed durations, and preserves a final explicit end', () => {
    expect(roadmapPeriods([
      { ...task('A', '2026-10-04'), start_date: '2026-09-29' },
      { ...task('B', '2026-11-15'), start_date: '2026-10-20' },
    ]).map(t => [t.start_date, t.due_date])).toEqual([['2026-09-29', '2026-10-19'], ['2026-10-20', '2026-11-15']]);
    expect(roadmapPeriods([])).toEqual([]);
  });
});
