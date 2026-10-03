import { addDays, daysUntil } from './domain';
import type { Task } from './types';

type Period = Pick<Task, 'start_date' | 'due_date'>;
export function taskStart(task: Period): string { return task.start_date || task.due_date; }
// Derive on every render from ALL tasks, before status filtering. Never mutate
// stored dates: completion, insertion and deletion must not freeze a boundary.
export function roadmapPeriods<T extends Period>(tasks: T[]): T[] {
  const starts = [...new Set(tasks.map(taskStart))].sort();
  const nextStart = new Map(starts.map((start, index) => [start, starts[index + 1]]));
  return tasks.map(task => {
    const start_date = taskStart(task);
    const next = nextStart.get(start_date);
    return { ...task, start_date, due_date: next ? addDays(next, -1) : task.due_date };
  }).sort((a, b) => taskStart(a).localeCompare(taskStart(b)));
}
export function taskPeriod(task: Period): string {
  const start = taskStart(task);
  return start === task.due_date ? start : start + ' ~ ' + task.due_date;
}
export function overlaps(task: Period, start: string, end: string): boolean {
  return taskStart(task) <= end && task.due_date >= start;
}
export function taskStatus(task: Task, reference: string): string {
  if (task.completed) return '완료';
  const left = daysUntil(task.due_date, reference);
  if (left < 0) return -left + '일 지남';
  if (left === 0) return '오늘 마감';
  const untilStart = daysUntil(taskStart(task), reference);
  if (untilStart > 0) return untilStart + '일 후 시작';
  return '진행 중 · D-' + left;
}
export function validateTaskPeriod(task: Task): Task {
  const start = taskStart(task);
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date + 'T00:00:00Z')) && new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date;
  if (!validDate(start) || !validDate(task.due_date)) throw new Error('시작일과 종료일을 올바르게 입력해 주세요.');
  if (start > task.due_date) throw new Error('시작일은 종료일보다 늦을 수 없습니다.');
  return { ...task, start_date: start };
}
