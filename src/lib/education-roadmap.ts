import { today } from './domain';
import type { Education, Task } from './types';

export const koreanToday = today;

export function isEducationTask(task: Task): boolean {
  return Boolean(task.education_provider?.trim()) && typeof task.education_hours === 'number' && Number.isFinite(task.education_hours) && task.education_hours > 0;
}

function validHours(hours: number): boolean {
  return Number.isFinite(hours) && hours > 0 && hours <= 10000 && Math.abs(hours * 100 - Math.round(hours * 100)) < 0.000001;
}

function validDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date + 'T00:00:00Z')) && new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date;
}

export function normalizeEducationRecord(record: Education, reference = today()): Education {
  if (!record.title.trim() || record.title.trim().length > 240) throw new Error('교육명을 1~240자로 입력해 주세요.');
  if (!record.provider.trim()) throw new Error('교육 기관을 입력해 주세요.');
  if (!validHours(record.hours)) throw new Error('교육시간은 0보다 크고 10,000 이하인 숫자로 소수 둘째 자리까지 입력해 주세요.');
  if (!validDate(record.completed_date) || record.completed_date > reference) throw new Error('수료일은 오늘 이전의 올바른 날짜로 입력해 주세요.');
  return { ...record, title: record.title.trim(), provider: record.provider.trim(), certificate: Boolean(record.certificate) };
}

export function normalizeEducationTask(task: Task, previous?: Task, reference = today()): Task {
  const provider = task.education_provider?.trim() || null;
  const hours = task.education_hours ?? null;
  if (!provider && hours === null) return { ...task, education_provider: null, education_hours: null, education_completed_date: null, education_certificate: false };
  if (!task.title.trim() || task.title.trim().length > 240) throw new Error('교육명을 1~240자로 입력해 주세요.');
  if (!provider) throw new Error('교육 기관을 입력해 주세요.');
  if (hours === null || !validHours(hours)) throw new Error('교육시간은 0보다 크고 10,000 이하인 숫자로 소수 둘째 자리까지 입력해 주세요.');
  const completedDate = task.completed
    ? task.education_completed_date || (previous?.completed ? previous.education_completed_date : null) || reference
    : null;
  if (completedDate && (!validDate(completedDate) || completedDate > reference)) throw new Error('수료일은 오늘 이전의 올바른 날짜로 입력해 주세요.');
  return { ...task, title: task.title.trim(), category: '교육', education_provider: provider, education_hours: hours, education_completed_date: completedDate, education_certificate: Boolean(task.education_certificate) };
}

// Both the demo and the database use one linked record per task; manual records have no task_id.
export function syncTaskEducation(records: Education[], task: Task, createId: () => string = () => crypto.randomUUID()): Education[] {
  const existing = records.find(record => record.task_id === task.id);
  const next = records.filter(record => record.task_id !== task.id);
  if (!task.completed || !isEducationTask(task)) return next;
  if (!task.education_completed_date) throw new Error('교육 수료일이 없습니다. 완료 상태를 다시 저장해 주세요.');
  return [...next, {
    id: existing?.id || createId(), user_id: task.user_id, task_id: task.id,
    title: task.title, provider: task.education_provider!, hours: task.education_hours!,
    completed_date: task.education_completed_date, certificate: Boolean(task.education_certificate),
  }];
}

export function educationTaskFromRecord(task: Task, record: Education, reference = today()): Task {
  const value = normalizeEducationRecord(record, reference);
  return normalizeEducationTask({
    ...task, title: value.title, completed: true, education_provider: value.provider,
    education_hours: value.hours, education_completed_date: value.completed_date, education_certificate: value.certificate,
  }, task, reference);
}
