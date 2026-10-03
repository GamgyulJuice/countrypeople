import { addDays, daysUntil } from './domain';
import { overlaps, taskStart } from './task-period';
import type { Task } from './types';

export function weekSegments(tasks: Task[], weekStart: string) {
  const end = addDays(weekStart, 6);
  const laneEnds: number[] = [];
  return tasks.filter(task => overlaps(task, weekStart, end))
    .sort((a, b) => taskStart(a).localeCompare(taskStart(b)) || b.due_date.localeCompare(a.due_date) || a.id.localeCompare(b.id))
    .map(task => {
      const start = taskStart(task);
      const column = Math.max(0, daysUntil(start, weekStart)) + 1;
      const endColumn = Math.min(6, daysUntil(task.due_date, weekStart)) + 1;
      let lane = laneEnds.findIndex(last => last < column);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = endColumn;
      return { task, column, span: endColumn - column + 1, lane, continuesBefore: start < weekStart, continuesAfter: task.due_date > end };
    });
}

// Date-only arithmetic uses UTC, independent of browser timezone and DST.
export function monthDays(selectedDate: string): string[] {
  const first = selectedDate.slice(0, 7) + '-01';
  const weekday = new Date(first + 'T00:00:00Z').getUTCDay();
  const last = addDays(shiftMonth(first, 1), -1);
  const count = Math.ceil((weekday + Number(last.slice(8))) / 7) * 7;
  const start = addDays(first, -weekday);
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

export function shiftMonth(date: string, offset: number): string {
  const next = new Date(date.slice(0, 7) + '-01T00:00:00Z');
  next.setUTCMonth(next.getUTCMonth() + offset);
  const last = new Date(next);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  next.setUTCDate(Math.min(Number(date.slice(8)), last.getUTCDate()));
  return next.toISOString().slice(0, 10);
}
