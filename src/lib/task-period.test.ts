import { describe, expect, it } from 'vitest';
import { roadmap } from './domain';
import { roadmapPeriods, taskStart, taskPeriod, overlaps, taskStatus } from './task-period';
import { weekSegments } from './calendar';
import { onboardingTasks } from './onboarding';
import { blankProfile, type Task } from './types';

const task = (id: string, start: string, end: string): Task => ({ id, user_id: 'u', title: id, start_date: start, due_date: end, completed: false, category: '생활', policy_id: null });
describe('task periods', () => {
  it('preserves legacy dates as single-day tasks', () => {
    const old = { ...task('old', '2026-09-29', '2026-10-05'), start_date: undefined };
    expect(taskStart(old)).toBe('2026-10-05');
    expect(taskPeriod(old)).toBe('2026-10-05');
    expect(overlaps(old, '2026-10-04', '2026-10-04')).toBe(false);
  });
  it('includes both endpoints and ranges spanning a whole week or month', () => {
    const range = task('range', '2026-09-29', '2026-11-05');
    expect(overlaps(range, '2026-10-01', '2026-10-31')).toBe(true);
    expect(overlaps(range, '2026-09-29', '2026-09-29')).toBe(true);
    expect(overlaps(range, '2026-11-05', '2026-11-05')).toBe(true);
    expect(overlaps(range, '2026-11-06', '2026-11-06')).toBe(false);
    expect(taskPeriod(range)).toBe('2026-09-29 ~ 2026-11-05');
  });
  it('distinguishes upcoming, active, due, overdue and completed', () => {
    const range = task('range', '2026-10-05', '2026-10-10');
    expect(taskStatus(range, '2026-10-03')).toBe('2일 후 시작');
    expect(taskStatus(range, '2026-10-05')).toBe('진행 중 · D-5');
    expect(taskStatus(range, '2026-10-10')).toBe('오늘 마감');
    expect(taskStatus(range, '2026-10-11')).toBe('1일 지남');
    expect(taskStatus({ ...range, completed: true }, '2026-10-03')).toBe('완료');
  });
  it('clips week bars and separates overlapping tasks into lanes', () => {
    const bars = weekSegments([
      task('long', '2026-09-29', '2026-10-06'),
      task('short', '2026-10-05', '2026-10-05'),
      task('later', '2026-10-07', '2026-10-10'),
    ], '2026-10-04');
    expect(bars.map(b => [b.task.id, b.column, b.span, b.lane, b.continuesBefore, b.continuesAfter])).toEqual([
      ['long', 1, 3, 0, true, false],
      ['short', 2, 1, 1, false, false],
      ['later', 4, 4, 0, false, false],
    ]);
    expect(weekSegments([task('long', '2026-09-29', '2026-10-06')], '2026-09-27')[0]).toMatchObject({ column: 3, span: 5, continuesAfter: true });
  });
  it('generates stage starts whose displayed periods reach the next stage', () => {
    const profile = { ...blankProfile('u'), move_date: '2027-10-01' };
    const tasks = roadmap(profile);
    expect(tasks.every(t => t.start_date === t.due_date)).toBe(true);
    expect(roadmapPeriods(tasks).filter(t => taskStart(t) < t.due_date).length).toBe(6);
    expect(tasks.find(t => t.due_date === '2027-10-01')?.start_date).toBe('2027-10-01');
  });
  it('keeps near/past-move onboarding ranges valid and not before today', () => {
    for (const date of ['2026-09-01', '2026-10-10', null]) {
      const tasks = onboardingTasks({ ...blankProfile('u'), move_date: date }, [], [], [], '2026-10-03');
      expect(tasks.every(t => !!t.start_date && t.start_date >= '2026-10-03' && t.start_date <= t.due_date)).toBe(true);
      // Consecutive daily starts legitimately produce single-day intervals.
      expect(roadmapPeriods(tasks).every(t => taskStart(t) <= t.due_date)).toBe(true);
    }
  });
});
