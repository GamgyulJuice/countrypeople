import { CheckInRequestSchema, DashboardResponseSchema, EligibilityResultSchema, NewsletterPreviewSchema, ProfileRecordSchema, RoadmapTaskSchema, UserProfileInputSchema, type CheckInRequest, type DashboardResponse, type EligibilityResult, type NewsletterPreview, type ProfileRecord, type RoadmapTask, type UserProfileInput, type UserProfilePatch } from '@rural/contracts';
import { daysBetweenDates, todaySeoul } from '../domain/date-only.js';
import { stableJson } from '../domain/stable-json.js';
import { HttpError } from '../errors.js';
import type { PolicyEnginePort, Repository, RoadmapEnginePort } from '../ports.js';

export interface ServiceDependencies { repository: Repository; policyEngine?: PolicyEnginePort; roadmapEngine?: RoadmapEnginePort; now: () => Date }
const notFound = () => new HttpError(404, 'NOT_FOUND', '요청한 항목을 찾을 수 없습니다.');
export class PlatformService {
  constructor(private readonly deps: ServiceDependencies) {}
  private get repo() { return this.deps.repository; }
  private async profile(id: string): Promise<ProfileRecord> { const p = await this.repo.getProfile(id); if (!p) throw notFound(); return ProfileRecordSchema.parse(p); }
  async create(data: UserProfileInput) { return ProfileRecordSchema.parse(await this.repo.createProfile(data, this.deps.now())); }
  async get(id: string) { return this.profile(id); }
  async patch(id: string, patch: UserProfilePatch) {
    const original = await this.profile(id);
    const combined: Record<string, unknown> = { ...original.data, ...patch };
    for (const key of ['residence', 'household', 'employment', 'farming', 'economics'] as const) if (patch[key]) combined[key] = { ...original.data[key], ...patch[key] };
    const data = UserProfileInputSchema.parse(combined);
    const updated = await this.repo.updateProfile(id, data, this.deps.now());
    if (!updated) throw notFound();
    return ProfileRecordSchema.parse(updated);
  }
  async evaluate(id: string): Promise<EligibilityResult[]> {
    const p = await this.profile(id), now = this.deps.now();
    if (!this.deps.policyEngine || !this.deps.roadmapEngine) throw new HttpError(503, 'ENGINE_UNAVAILABLE', '정책 엔진이 아직 구현되지 않았습니다.');
    const result = (await this.deps.policyEngine.evaluate(p.data, now)).map(item => EligibilityResultSchema.parse(item));
    const drafts = await this.deps.roadmapEngine.generate(p.data, result, now);
    await this.repo.saveEvaluation(p, result, drafts, now);
    return result;
  }
  async task(id: string, status: RoadmapTask['status']) {
    const result = await this.repo.updateTask(id, status, this.deps.now());
    if (!result) throw notFound();
    return RoadmapTaskSchema.parse(result);
  }
  private async state(id: string): Promise<{ profile: ProfileRecord; eligibility: EligibilityResult[]; tasks: RoadmapTask[] }> {
    const profile = await this.profile(id), evaluation = await this.repo.latestEvaluation(id);
    const eligibility = evaluation?.profileUpdatedAt === profile.updatedAt && stableJson(evaluation.profileData) === stableJson(profile.data) ? evaluation.result : [];
    return { profile, eligibility, tasks: (await this.repo.listTasks(id)).map(task => RoadmapTaskSchema.parse(task)) };
  }
  private async readiness(profile: UserProfileInput, tasks: RoadmapTask[]) {
    if (!this.deps.roadmapEngine) throw new HttpError(503, 'ENGINE_UNAVAILABLE', '로드맵 엔진이 아직 구현되지 않았습니다.');
    return this.deps.roadmapEngine.readiness(profile, tasks);
  }
  private weekly(tasks: RoadmapTask[], now: Date) {
    const today = todaySeoul(now), day = new Date(`${today}T00:00:00Z`).getUTCDay(), start = day === 0 ? -6 : 1 - day;
    return tasks.filter(task => task.status === 'todo' && task.dueDate && daysBetweenDates(today, task.dueDate) >= start && daysBetweenDates(today, task.dueDate) <= start + 6);
  }
  async newsletter(id: string): Promise<NewsletterPreview> {
    const { profile, eligibility, tasks } = await this.state(id), now = this.deps.now(), today = todaySeoul(now);
    const daysToMove = profile.data.targetMoveDate ? daysBetweenDates(today, profile.data.targetMoveDate) : null;
    const previous = await this.repo.latestCheckIn(id);
    const priorEvaluation = await this.repo.previousEvaluation(id);
    const readiness = await this.readiness(profile.data, tasks);
    const previousIds = new Set(priorEvaluation?.result.map(item => item.policy.id) ?? []);
    return NewsletterPreviewSchema.parse({ profileId: id, subject: '이번 주 귀농·귀촌 준비', intro: '이번 주 준비 현황', daysToMove, weeklyTasks: this.weekly(tasks, now), newPolicies: priorEvaluation ? eligibility.filter(item => !previousIds.has(item.policy.id)).map(item => item.policy) : [], upcomingDeadlines: eligibility.filter(e => e.policy.verificationStatus === 'verified' && e.policy.applicationEnd && daysBetweenDates(today, e.policy.applicationEnd) >= 0 && daysBetweenDates(today, e.policy.applicationEnd) <= 14).map(e => ({ policy: e.policy, daysRemaining: daysBetweenDates(today, e.policy.applicationEnd!) })), readinessChange: previous ? readiness - previous.response.summary.readinessPercent : null, generatedAt: now.toISOString() });
  }
  async dashboard(id: string): Promise<DashboardResponse> {
    const { profile, eligibility, tasks } = await this.state(id), newsletter = await this.newsletter(id);
    const readinessPercent = await this.readiness(profile.data, tasks);
    return DashboardResponseSchema.parse({ profile, summary: { daysToMove: newsletter.daysToMove, readinessPercent, eligibleCount: eligibility.filter(e => e.status === 'eligible').length, needsRequirementsCount: eligibility.filter(e => e.status === 'needs_requirements').length, weeklyTaskCount: newsletter.weeklyTasks.length }, eligibility, weeklyTasks: newsletter.weeklyTasks, newsletter });
  }
  async checkIn(id: string, input: CheckInRequest, key: string) {
    return this.repo.transaction(id, async repository => new PlatformService({ ...this.deps, repository }).commitCheckIn(id, input, key));
  }
  private async commitCheckIn(id: string, input: CheckInRequest, key: string) {
    const normalized = CheckInRequestSchema.parse(input);
    const prior = await this.repo.getCheckIn(id, key);
    if (prior) {
      const comparable = (value: CheckInRequest) => stableJson({ completed: [...value.completedTaskIds].sort(), skipped: [...value.skippedTaskIds].sort(), note: value.note ?? null });
      if (comparable(prior.input) !== comparable(normalized)) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', '같은 key에 다른 요청이 저장되어 있습니다.');
      return prior.response;
    }
    await this.profile(id);
    const completed = new Set(normalized.completedTaskIds), skipped = new Set(normalized.skippedTaskIds);
    for (const taskId of [...completed, ...skipped]) { const task = await this.repo.getTask(taskId); if (!task || task.profileId !== id) throw notFound(); }
    for (const taskId of completed) await this.repo.updateTask(taskId, 'done', this.deps.now());
    for (const taskId of skipped) await this.repo.updateTask(taskId, 'skipped', this.deps.now());
    const response = await this.dashboard(id);
    await this.repo.saveCheckIn(id, key, normalized, response, this.deps.now());
    return response;
  }
}
