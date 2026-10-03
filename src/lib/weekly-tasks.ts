import { addDays, today, weekStart } from './domain';
import { overlaps, roadmapPeriods } from './task-period';
import type { Task } from './types';

// A shared projection for dashboard, briefing and check-in counts.
// Resolve all stage boundaries before selecting this week's tasks.
export function weeklyRoadmap(source: Task[], reference = today()) {
  const start = weekStart(reference);
  const end = addDays(start, 6);
  const tasks = roadmapPeriods(source).filter(task => overlaps(task, start, end));
  const completedCount = tasks.filter(task => task.completed).length;
  return { start, end, tasks, completedCount, pendingCount: tasks.length - completedCount };
}
export type WeeklyRoadmap = ReturnType<typeof weeklyRoadmap>;
