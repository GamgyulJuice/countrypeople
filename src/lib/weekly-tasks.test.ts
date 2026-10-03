import { describe, expect, it } from 'vitest';
import { weeklyRoadmap } from './weekly-tasks';
import type { Task } from './types';
const task = (id: string, date: string, completed = false): Task => ({ id, user_id: 'u', title: id, due_date: date, completed, category: '생활', policy_id: null });

describe('shared weekly roadmap', () => {
  it('selects Monday-Sunday roadmap overlap, not overdue tasks or a rolling seven days', () => {
    const result = weeklyRoadmap([
      task('past', '2026-09-01'),
      task('ongoing', '2026-09-20'),
      task('Monday', '2026-09-28', true),
      task('Friday', '2026-10-02'),
      task('Sunday', '2026-10-04'),
      task('nextWeek', '2026-10-05'),
    ], '2026-10-03');
    expect(result.start).toBe('2026-09-28');
    expect(result.end).toBe('2026-10-04');
    expect(result.tasks.map(t => [t.id, t.due_date])).toEqual([
      ['Monday', '2026-10-01'], ['Friday', '2026-10-03'], ['Sunday', '2026-10-04'],
    ]);
    expect(result.completedCount).toBe(1);
    expect(result.pendingCount).toBe(2);
  });
  it('includes an interval that started earlier and ends after this week', () => {
    const source = [task('long', '2026-09-01'), task('later', '2026-11-01', true)];
    const result = weeklyRoadmap(source, '2026-10-03');
    expect(result.tasks.map(t => [t.id, t.start_date, t.due_date])).toEqual([['long', '2026-09-01', '2026-10-31']]);
    expect(source[0].due_date).toBe('2026-09-01');
  });
  it('handles Sunday, Monday, year boundaries and empty weeks', () => {
    const tasks = [task('A', '2026-12-28'), task('B', '2027-01-04')];
    expect(weeklyRoadmap(tasks, '2027-01-03').tasks.map(t => t.id)).toEqual(['A']);
    expect(weeklyRoadmap(tasks, '2027-01-04').tasks.map(t => t.id)).toEqual(['B']);
    expect(weeklyRoadmap([], '2027-01-04')).toEqual({ start: '2027-01-04', end: '2027-01-10', tasks: [], completedCount: 0, pendingCount: 0 });
  });
  it('updates completion counts without changing stage boundaries or hiding completed tasks', () => {
    const source = [task('A', '2026-09-28'), task('B', '2026-10-04')];
    const before = weeklyRoadmap(source, '2026-10-03');
    const after = weeklyRoadmap(source.map(t => ({ ...t, completed: true })), '2026-10-03');
    expect(after.tasks.map(t => t.due_date)).toEqual(before.tasks.map(t => t.due_date));
    expect(after.tasks).toHaveLength(2);
    expect(after.completedCount).toBe(2);
    expect(after.pendingCount).toBe(0);
  });
  it('counts every same-start task and retains the shared end date', () => {
    const result = weeklyRoadmap([task('A', '2026-09-28', true), task('B', '2026-09-28'), task('next', '2026-10-05')], '2026-10-03');
    expect(result.tasks.map(t => [t.id, t.due_date])).toEqual([['A', '2026-10-04'], ['B', '2026-10-04']]);
    expect(result.completedCount).toBe(1);
    expect(result.pendingCount).toBe(1);
  });
});
