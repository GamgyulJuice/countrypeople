import { initialDemo, demoPolicies } from './demo';
import { supabase, isDemo } from './supabase';
import type { AppData, Profile, Task, Education, Checkin } from './types';
import { validateTaskPeriod } from './task-period';
import { educationTaskFromRecord, isEducationTask, normalizeEducationRecord, normalizeEducationTask, syncTaskEducation } from './education-roadmap';
const storageKey = 'countrypeople.demo.v1';
export function readDemo(): AppData {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return initialDemo();
  const data = JSON.parse(raw) as AppData;
  if (!Array.isArray(data.tasks) || !Array.isArray(data.education) || !Array.isArray(data.bookmarks) || !Array.isArray(data.documentChecks) || !Array.isArray(data.checkins)) throw new Error('데모 데이터가 손상되었습니다. 브라우저의 사이트 데이터를 초기화해 주세요.');
  return { ...data, policies: demoPolicies() };
}
function client() { if (!supabase) throw new Error('Supabase 설정을 확인해 주세요.'); return supabase; }
export async function loadData(userId: string): Promise<AppData> {
  if (isDemo) return readDemo();
  const db = client();
  const results = await Promise.all([
    db.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    db.from('policies').select('*, rules:policy_rules(*), documents:policy_documents(*)').order('end_date', { ascending: true, nullsFirst: false }),
    db.from('tasks').select('*').eq('user_id', userId).order('due_date'),
    db.from('education_records').select('*').eq('user_id', userId).order('completed_date', { ascending: false }),
    db.from('saved_policies').select('*').eq('user_id', userId),
    db.from('document_checks').select('*').eq('user_id', userId),
    db.from('weekly_checkins').select('*').eq('user_id', userId).order('week_start', { ascending: false }),
  ]);
  for (const result of results) if (result.error) throw new Error(result.error.message);
  const [profile, policies, tasks, education, bookmarks, documentChecks, checkins] = results.map(r => r.data);
  return { profile, policies, tasks, education, bookmarks, documentChecks, checkins } as unknown as AppData;
}
async function write(table: string, action: 'upsert' | 'insert' | 'delete', payload: object, filter: Record<string, string> = {}) {
  const db = client();
  if (action === 'delete') {
    let query = db.from(table).delete();
    for (const [key, value] of Object.entries(filter)) query = query.eq(key, value);
    const { error, data } = await query.select();
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('삭제할 데이터가 없거나 접근 권한이 없습니다. 새로고침 후 다시 시도하세요.');
  } else {
    const conflict = table === 'document_checks' ? 'user_id,document_id' : table === 'saved_policies' ? 'user_id,policy_id' : table === 'weekly_checkins' ? 'user_id,week_start' : undefined;
    const query = action === 'insert' ? db.from(table).insert(payload) : db.from(table).upsert(payload, conflict ? { onConflict: conflict } : undefined);
    const { error } = await query.select();
    if (error) throw new Error(error.message);
  }
}
export type Mutation =
  | { kind: 'onboarding'; profile: Profile; education: Education[]; tasks: Task[] }
  | { kind: 'profile'; value: Profile }
  | { kind: 'task'; value: Task }
  | { kind: 'tasks'; value: Task[] }
  | { kind: 'deleteTask'; id: string }
  | { kind: 'education'; value: Education }
  | { kind: 'deleteEducation'; id: string }
  | { kind: 'bookmark'; policyId: string; saved: boolean }
  | { kind: 'document'; documentId: string; completed: boolean }
  | { kind: 'checkin'; value: Checkin };
export async function mutate(data: AppData, userId: string, mutation: Mutation): Promise<AppData> {
  const next = structuredClone(data);
  const replace = <T extends { id: string }>(rows: T[], row: T) => [...rows.filter(r => r.id !== row.id), row];
  let refreshEducation = false;
  const prepareTask = (task: Task) => normalizeEducationTask(validateTaskPeriod({ ...task, user_id: userId }), data.tasks.find(existing => existing.id === task.id));
  const storeTask = (task: Task) => {
    refreshEducation ||= isEducationTask(task) || next.education.some(record => record.task_id === task.id);
    next.tasks = replace(next.tasks, task);
    next.education = syncTaskEducation(next.education, task);
  };
  switch (mutation.kind) {
    case 'onboarding': {
      const profile = { ...mutation.profile, user_id: userId };
      const education = mutation.education.map(record => normalizeEducationRecord({ ...record, user_id: userId }));
      if (education.some(record => record.task_id)) throw new Error('로드맵 연결 교육은 해당 일정을 통해 저장해 주세요.');
      const tasks = mutation.tasks.map(prepareTask);
      if (!isDemo) {
        // Persist the profile last so a new visitor cannot bypass unfinished setup.
        // The form retains stable UUIDs, making a retry after partial failure idempotent.
        if (education.length) await write('education_records', 'upsert', education);
        if (tasks.length) await write('tasks', 'upsert', tasks);
        await write('profiles', 'upsert', profile);
      }
      next.profile = profile;
      for (const record of education) next.education = replace(next.education, record);
      for (const task of tasks) storeTask(task);
      break;
    }
    case 'profile': {
      const value = { ...mutation.value, user_id: userId };
      if (!isDemo) await write('profiles', 'upsert', value);
      next.profile = value; break;
    }
    case 'task': {
      const value = prepareTask(mutation.value);
      if (!isDemo) await write('tasks', 'upsert', value);
      storeTask(value); break;
    }
    case 'tasks': {
      const value = mutation.value.map(prepareTask);
      if (!isDemo) await write('tasks', 'insert', value);
      for (const task of value) storeTask(task);
      break;
    }
    case 'deleteTask':
      if (!isDemo) await write('tasks', 'delete', {}, { id: mutation.id, user_id: userId });
      next.tasks = next.tasks.filter(t => t.id !== mutation.id);
      next.education = next.education.filter(record => record.task_id !== mutation.id); break;
    case 'education': {
      const value = normalizeEducationRecord({ ...mutation.value, user_id: userId });
      const existing = data.education.find(record => record.id === value.id);
      if (existing?.task_id) {
        const task = data.tasks.find(item => item.id === existing.task_id && item.user_id === userId);
        if (!task) throw new Error('연결된 교육 일정을 찾을 수 없습니다. 새로고침 후 다시 시도하세요.');
        const updatedTask = educationTaskFromRecord(task, value);
        if (!isDemo) await write('tasks', 'upsert', updatedTask);
        storeTask(updatedTask);
        break;
      }
      if (value.task_id) throw new Error('로드맵 연결 교육은 해당 일정을 완료하면 자동으로 저장됩니다.');
      if (!isDemo) await write('education_records', 'upsert', value);
      next.education = replace(next.education, value); break;
    }
    case 'deleteEducation': {
      const existing = data.education.find(record => record.id === mutation.id);
      if (existing?.task_id) {
        const task = data.tasks.find(item => item.id === existing.task_id && item.user_id === userId);
        if (!task) throw new Error('연결된 교육 일정을 찾을 수 없습니다. 새로고침 후 다시 시도하세요.');
        const updatedTask = prepareTask({ ...task, completed: false });
        if (!isDemo) await write('tasks', 'upsert', updatedTask);
        storeTask(updatedTask);
        break;
      }
      if (!isDemo) await write('education_records', 'delete', {}, { id: mutation.id, user_id: userId });
      next.education = next.education.filter(e => e.id !== mutation.id); break;
    }
    case 'bookmark': {
      const value = { user_id: userId, policy_id: mutation.policyId };
      if (!isDemo) await write('saved_policies', mutation.saved ? 'upsert' : 'delete', value, value);
      next.bookmarks = next.bookmarks.filter(b => b.policy_id !== mutation.policyId);
      if (mutation.saved) next.bookmarks.push(value); break;
    }
    case 'document': {
      const value = { user_id: userId, document_id: mutation.documentId, completed: mutation.completed };
      if (!isDemo) await write('document_checks', 'upsert', value);
      next.documentChecks = [...next.documentChecks.filter(d => d.document_id !== mutation.documentId), value]; break;
    }
    case 'checkin': {
      const value = { ...mutation.value, user_id: userId };
      if (!isDemo) await write('weekly_checkins', 'upsert', value);
      next.checkins = [...next.checkins.filter(c => c.week_start !== value.week_start), value]; break;
    }
  }
  if (!isDemo && refreshEducation) {
    // The trigger writes both rows in the task transaction. Fetch its canonical IDs/dates.
    const db = client();
    const [tasks, education] = await Promise.all([
      db.from('tasks').select('*').eq('user_id', userId).order('due_date'),
      db.from('education_records').select('*').eq('user_id', userId).order('completed_date', { ascending: false }),
    ]);
    if (tasks.error) throw new Error(tasks.error.message);
    if (education.error) throw new Error(education.error.message);
    next.tasks = tasks.data as Task[];
    next.education = education.data as Education[];
  }
  if (isDemo) localStorage.setItem(storageKey, JSON.stringify(next));
  return next;
}
