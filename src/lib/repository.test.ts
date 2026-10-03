import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blankProfile, emptyData } from './types';
import type { Education, Task } from './types';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('./supabase', () => ({ isDemo: false, supabase: { from: mocks.from } }));
import { loadData, mutate } from './repository';

function chain(result: { data: unknown; error: { message: string } | null }) {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'maybeSingle', 'delete', 'upsert', 'insert']) query[method] = vi.fn(() => query);
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return query as Record<string, ReturnType<typeof vi.fn>>;
}
beforeEach(() => mocks.from.mockReset());
describe('Supabase adapter (mocked transport, no project connection)', () => {
  it('rejects reversed task periods before making a remote request', async () => {
    const query = chain({ data: [], error: null }); mocks.from.mockReturnValue(query);
    await expect(mutate(emptyData, 'user-A', { kind: 'task', value: { id: 't', user_id: 'user-A', title: '기간', start_date: '2026-10-10', due_date: '2026-10-01', completed: false, category: '생활', policy_id: null } })).rejects.toThrow('시작일');
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('sends both dates and retains the period after a successful save', async () => {
    const query = chain({ data: [], error: null }); mocks.from.mockReturnValue(query);
    const next = await mutate(emptyData, 'user-A', { kind: 'task', value: { id: 't', user_id: 'user-A', title: '기간', start_date: '2026-10-01', due_date: '2026-10-10', completed: false, category: '생활', policy_id: null } });
    expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({ start_date: '2026-10-01', due_date: '2026-10-10' }), undefined);
    expect(next.tasks[0]).toMatchObject({ start_date: '2026-10-01', due_date: '2026-10-10' });
  });
  it('onboarding saves child records first, profile last, and enforces ownership', async () => {
    const query = chain({ data: [], error: null }); mocks.from.mockReturnValue(query);
    const next = await mutate(emptyData, 'user-A', {
      kind: 'onboarding', profile: blankProfile('forged'),
      education: [
        { id: 'e1', user_id: 'forged', title: '기초 교육', provider: '기관', hours: 40, completed_date: '2026-10-03', certificate: false },
        { id: 'e2', user_id: 'forged', title: '현장 교육', provider: '기관', hours: 60, completed_date: '2026-10-03', certificate: true },
      ],
      tasks: [{ id: 't1', user_id: 'forged', title: '할 일', due_date: '2026-10-03', category: '생활', completed: false, policy_id: null }],
    });
    expect(mocks.from.mock.calls.map(call => call[0])).toEqual(['education_records', 'tasks', 'profiles']);
    expect(next.profile?.user_id).toBe('user-A');
    expect(next.education[0].user_id).toBe('user-A');
    expect(next.education).toHaveLength(2);
    expect(next.education[1].user_id).toBe('user-A');
    expect(next.education.reduce((sum, record) => sum + record.hours, 0)).toBe(100);
    expect(query.upsert.mock.calls[0][0]).toEqual(next.education);
    expect(next.tasks[0].user_id).toBe('user-A');
  });
  it('failed initial schedule save does not mark a new profile as completed', async () => {
    mocks.from.mockImplementation(table => chain({ data: [], error: table === 'tasks' ? { message: 'schedule failed' } : null }));
    await expect(mutate(emptyData, 'user-A', { kind: 'onboarding', profile: blankProfile('user-A'), education: [], tasks: [{ id: 't1', user_id: 'user-A', title: '할 일', due_date: '2026-10-03', category: '생활', completed: false, policy_id: null }] })).rejects.toThrow('schedule failed');
    expect(mocks.from).not.toHaveBeenCalledWith('profiles');
    expect(emptyData.profile).toBeNull();
  });
  it('delete requests always scope both row ID and authenticated owner', async () => {
    const query = chain({ data: [{ id: 'task-1' }], error: null }); mocks.from.mockReturnValue(query);
    await mutate(emptyData, 'user-A', { kind: 'deleteTask', id: 'task-1' });
    expect(mocks.from).toHaveBeenCalledWith('tasks');
    expect(query.eq).toHaveBeenCalledWith('id', 'task-1');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-A');
  });
  it('does not report success if a delete affected no rows', async () => {
    mocks.from.mockReturnValue(chain({ data: [], error: null }));
    await expect(mutate(emptyData, 'user-A', { kind: 'deleteTask', id: 'missing' })).rejects.toThrow('삭제할 데이터가 없거나');
  });
  it('replaces user-supplied ownership before saving a task', async () => {
    const query = chain({ data: [], error: null }); mocks.from.mockReturnValue(query);
    const next = await mutate(emptyData, 'user-A', { kind: 'task', value: { id: 'task-1', user_id: 'user-B', title: 'test', due_date: '2026-10-03', completed: false, category: '생활', policy_id: null } });
    expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-A' }), undefined);
    expect(next.tasks[0].user_id).toBe('user-A');
  });
  it('a failed save rejects and leaves the supplied UI data untouched', async () => {
    mocks.from.mockReturnValue(chain({ data: null, error: { message: 'network failure' } }));
    const data = structuredClone(emptyData);
    await expect(mutate(data, 'user-A', { kind: 'bookmark', policyId: 'p-1', saved: true })).rejects.toThrow('network failure');
    expect(data.bookmarks).toEqual([]);
  });
  it('uses the composite conflict target for weekly check-ins', async () => {
    const query = chain({ data: [], error: null }); mocks.from.mockReturnValue(query);
    await mutate(emptyData, 'user-A', { kind: 'checkin', value: { id: 'c-1', user_id: 'user-A', week_start: '2026-09-28', note: '', total_count: 2, completed_count: 1 } });
    expect(query.upsert).toHaveBeenCalledWith(expect.anything(), { onConflict: 'user_id,week_start' });
  });
  it('fails the load if any table request fails instead of displaying fake empty data', async () => {
    mocks.from.mockImplementation((table: string) => chain(table === 'education_records' ? { data: null, error: { message: 'RLS or network error' } } : { data: [], error: null }));
    await expect(loadData('user-A')).rejects.toThrow('RLS or network error');
  });
  it('education completion writes the task once and reads the trigger-generated canonical record', async () => {
    const task: Task = { id: 'course', user_id: 'user-A', title: '교육', due_date: '2026-10-31', completed: true, category: '교육', policy_id: null, education_provider: '기관', education_hours: 12, education_completed_date: '2020-01-01', education_certificate: false };
    const record: Education = { id: 'database-generated-id', user_id: 'user-A', task_id: task.id, title: task.title, provider: '기관', hours: 12, completed_date: '2020-01-01', certificate: false };
    const taskQuery = chain({ data: [task], error: null });
    const educationQuery = chain({ data: [record], error: null });
    mocks.from.mockImplementation(table => table === 'tasks' ? taskQuery : educationQuery);
    const next = await mutate(emptyData, 'user-A', { kind: 'task', value: task });
    expect(taskQuery.upsert).toHaveBeenCalledOnce();
    expect(educationQuery.upsert).not.toHaveBeenCalled();
    expect(educationQuery.insert).not.toHaveBeenCalled();
    expect(next.tasks).toEqual([task]);
    expect(next.education).toEqual([record]);
  });
  it('editing and deleting linked history use the task transaction rather than separate history writes', async () => {
    const task: Task = { id: 'course', user_id: 'user-A', title: '교육', due_date: '2026-10-31', completed: true, category: '교육', policy_id: null, education_provider: '기관', education_hours: 12, education_completed_date: '2020-01-01' };
    const record: Education = { id: 'linked', user_id: 'user-A', task_id: task.id, title: task.title, provider: '기관', hours: 12, completed_date: '2020-01-01', certificate: false };
    const data = { ...emptyData, tasks: [task], education: [record] };
    const taskQuery = chain({ data: [task], error: null });
    const educationQuery = chain({ data: [record], error: null });
    mocks.from.mockImplementation(table => table === 'tasks' ? taskQuery : educationQuery);
    await mutate(data, 'user-A', { kind: 'education', value: { ...record, hours: 18 } });
    expect(taskQuery.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ education_hours: 18, completed: true }), undefined);
    await mutate(data, 'user-A', { kind: 'deleteEducation', id: record.id });
    expect(taskQuery.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ completed: false, education_completed_date: null }), undefined);
    expect(educationQuery.upsert).not.toHaveBeenCalled();
    expect(educationQuery.delete).not.toHaveBeenCalled();
  });
  it('a failed task completion does not issue an independent history write or mutate UI state', async () => {
    const task: Task = { id: 'course', user_id: 'user-A', title: '교육', due_date: '2026-10-31', completed: false, category: '교육', policy_id: null, education_provider: '기관', education_hours: 12 };
    const data = { ...structuredClone(emptyData), tasks: [task] };
    mocks.from.mockReturnValue(chain({ data: null, error: { message: 'transaction failed' } }));
    await expect(mutate(data, 'user-A', { kind: 'task', value: { ...task, completed: true } })).rejects.toThrow('transaction failed');
    expect(mocks.from.mock.calls.map(call => call[0])).toEqual(['tasks']);
    expect(data.tasks[0].completed).toBe(false);
    expect(data.education).toEqual([]);
  });
});
