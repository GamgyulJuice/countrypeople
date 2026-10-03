import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completedHours } from './domain';
import { isEducationTask, koreanToday, normalizeEducationTask } from './education-roadmap';
import { emptyData, type AppData, type Education, type Task } from './types';

vi.mock('./supabase', () => ({ isDemo: true, supabase: null }));
import { mutate, readDemo } from './repository';

const course: Task = { id: 'course', user_id: 'user-A', title: '귀농 기초 12시간', due_date: '2026-10-31', completed: false, category: '교육', policy_id: null, education_provider: '농업교육포털', education_hours: 12 };
const manual: Education = { id: 'manual', user_id: 'user-A', title: '기존 수료', provider: '센터', hours: 8, completed_date: '2026-09-01', certificate: true };
let data: AppData;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-02T15:30:00Z'));
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  data = { ...structuredClone(emptyData), tasks: [{ ...course }], education: [{ ...manual }] };
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('교육 로드맵 자동 수료 기록', () => {
  it('한국 날짜로 실제 수료일을 기록하고 예정일은 유지한다', async () => {
    expect(koreanToday()).toBe('2026-10-03');
    const next = await mutate(data, 'user-A', { kind: 'task', value: { ...course, completed: true } });
    expect(next.tasks[0]).toMatchObject({ due_date: '2026-10-31', education_completed_date: '2026-10-03' });
    expect(next.education.find(record => record.task_id === course.id)).toMatchObject({ title: course.title, provider: '농업교육포털', hours: 12, completed_date: '2026-10-03', certificate: false });
    expect(completedHours(next.education)).toBe(20);
    expect(readDemo().education).toEqual(next.education);
  });

  it('반복 완료/수정은 중복 시간 없이 동일 수료일과 레코드 ID를 유지한다', async () => {
    let next = await mutate(data, 'user-A', { kind: 'task', value: { ...course, completed: true } });
    const first = next.education.find(record => record.task_id === course.id)!;
    vi.setSystemTime(new Date('2026-10-05T00:00:00Z'));
    next = await mutate(next, 'user-A', { kind: 'task', value: { ...next.tasks[0], title: '심화 교육', education_hours: 15, education_completed_date: null } });
    expect(next.education).toHaveLength(2);
    expect(next.education.find(record => record.task_id === course.id)).toMatchObject({ id: first.id, title: '심화 교육', hours: 15, completed_date: '2026-10-03' });
    expect(completedHours(next.education)).toBe(23);
  });

  it('완료 취소는 자동 기록만 제거하고 다시 완료하면 새 실제 날짜로 기록한다', async () => {
    let next = await mutate(data, 'user-A', { kind: 'task', value: { ...course, completed: true } });
    next = await mutate(next, 'user-A', { kind: 'task', value: { ...next.tasks[0], completed: false } });
    expect(next.education).toEqual([manual]);
    expect(next.tasks[0].education_completed_date).toBeNull();
    vi.setSystemTime(new Date('2026-10-05T00:00:00Z'));
    next = await mutate(next, 'user-A', { kind: 'task', value: { ...next.tasks[0], completed: true } });
    expect(next.education).toHaveLength(2);
    expect(next.education[1].completed_date).toBe('2026-10-05');
  });

  it('연결된 수료 기록 수정/삭제는 일정도 함께 갱신한다', async () => {
    let next = await mutate(data, 'user-A', { kind: 'task', value: { ...course, completed: true } });
    const record = next.education.find(item => item.task_id === course.id)!;
    next = await mutate(next, 'user-A', { kind: 'education', value: { ...record, title: '교육명 수정', hours: 24.5, certificate: true, completed_date: '2026-10-01' } });
    expect(next.tasks[0]).toMatchObject({ title: '교육명 수정', education_hours: 24.5, education_certificate: true, education_completed_date: '2026-10-01', completed: true });
    expect(completedHours(next.education)).toBe(32.5);
    next = await mutate(next, 'user-A', { kind: 'deleteEducation', id: record.id });
    expect(next.tasks[0].completed).toBe(false);
    expect(next.education).toEqual([manual]);
  });

  it('교육 일정 삭제 및 일반 일정 전환 시 연결 기록만 제거한다', async () => {
    const next = await mutate(data, 'user-A', { kind: 'task', value: { ...course, completed: true } });
    const deleted = await mutate(next, 'user-A', { kind: 'deleteTask', id: course.id });
    expect(deleted.tasks).toEqual([]);
    expect(deleted.education).toEqual([manual]);
    const converted = await mutate(next, 'user-A', { kind: 'task', value: { ...next.tasks[0], category: '생활', education_provider: null, education_hours: null } });
    expect(converted.education).toEqual([manual]);
    expect(converted.tasks[0].completed).toBe(true);
  });

  it('교육 분류만 있는 조사 항목을 완료해도 수료시간을 만들지 않는다', async () => {
    const research = { ...course, education_provider: null, education_hours: null, title: '교육과정 확인' };
    expect(isEducationTask(research)).toBe(false);
    const next = await mutate(data, 'user-A', { kind: 'task', value: { ...research, completed: true } });
    expect(next.education).toEqual([manual]);
  });

  it('교육시간/기관/미래 수료일 오류는 저장 전에 거부한다', async () => {
    for (const hours of [0, -1, NaN, Infinity, 10001, 1.001]) expect(() => normalizeEducationTask({ ...course, education_hours: hours })).toThrow('교육시간');
    expect(() => normalizeEducationTask({ ...course, education_provider: ' ' })).toThrow('교육 기관');
    await expect(mutate(data, 'user-A', { kind: 'task', value: { ...course, completed: true, education_completed_date: '2026-10-04' } })).rejects.toThrow('수료일');
    expect(data.education).toEqual([manual]);
    expect(data.tasks[0].completed).toBe(false);
  });
});
