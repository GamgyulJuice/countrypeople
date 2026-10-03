import type { CheckInRequest, DashboardResponse, EligibilityResult, ProfileRecord, RoadmapTask, RoadmapTaskDraft, UserProfileInput } from '@rural/contracts';
import type { CheckInSnapshot, EvaluationSnapshot, Repository } from '../../src/ports';

export function memoryRepository(): Repository {
  const profiles = new Map<string, ProfileRecord>(), tasks = new Map<string, RoadmapTask>(), evaluations = new Map<string, EvaluationSnapshot[]>(), checkIns = new Map<string, CheckInSnapshot>();
  return {
    async transaction<T>(_profileId: string, run: (repository: Repository) => Promise<T>) { return run(this); },
    async health() { return true; },
    async createProfile(data: UserProfileInput, now: Date) { const record = { id: crypto.randomUUID(), data, createdAt: now.toISOString(), updatedAt: now.toISOString() }; profiles.set(record.id, record); return record; },
    async getProfile(id: string) { return profiles.get(id) ?? null; },
    async updateProfile(id: string, data: UserProfileInput, now: Date) { const prev = profiles.get(id); if (!prev) return null; const record = { ...prev, data, updatedAt: now.toISOString() }; profiles.set(id, record); return record; },
    async saveEvaluation(profile: ProfileRecord, result: EligibilityResult[], drafts: RoadmapTaskDraft[], now: Date) {
      if (profiles.get(profile.id)?.updatedAt !== profile.updatedAt) throw new Error('VERSION_CONFLICT');
      evaluations.set(profile.id, [...(evaluations.get(profile.id) ?? []), { result, evaluatedAt: now.toISOString(), profileUpdatedAt: profile.updatedAt, profileData: profile.data }]);
      for (const draft of drafts) if (![...tasks.values()].some(t => t.profileId === profile.id && t.dedupeKey === draft.dedupeKey)) {
        const task = { ...draft, id: crypto.randomUUID(), profileId: profile.id, createdAt: now.toISOString(), updatedAt: now.toISOString() }; tasks.set(task.id, task);
      }
    },
    async latestEvaluation(id: string) { return evaluations.get(id)?.at(-1) ?? null; },
    async previousEvaluation(id: string) { return evaluations.get(id)?.at(-2) ?? null; },
    async listTasks(id: string) { return [...tasks.values()].filter(t => t.profileId === id); },
    async getTask(id: string) { return tasks.get(id) ?? null; },
    async updateTask(id: string, status: RoadmapTask['status'], now: Date) { const old = tasks.get(id); if (!old) return null; const task = { ...old, status, updatedAt: now.toISOString() }; tasks.set(id, task); return task; },
    async getCheckIn(id: string, key: string) { return checkIns.get(`${id}:${key}`) ?? null; },
    async latestCheckIn(id: string) { return [...checkIns.entries()].filter(([key]) => key.startsWith(`${id}:`)).at(-1)?.[1] ?? null; },
    async saveCheckIn(id: string, key: string, input: CheckInRequest, response: DashboardResponse) { checkIns.set(`${id}:${key}`, { input, response }); },
  };
}
