import type { CheckInRequest, DashboardResponse, EligibilityResult, ProfileRecord, RoadmapTask, RoadmapTaskDraft, UserProfileInput } from '@rural/contracts';

export interface PolicyEnginePort { evaluate(profile: UserProfileInput, now: Date): Promise<EligibilityResult[]> }
export interface RoadmapEnginePort {
  generate(profile: UserProfileInput, eligibility: EligibilityResult[], now: Date): Promise<RoadmapTaskDraft[]>;
  readiness(profile: UserProfileInput, tasks: RoadmapTask[]): Promise<number>;
}
export interface EvaluationSnapshot { result: EligibilityResult[]; profileUpdatedAt: string; profileData: UserProfileInput; evaluatedAt: string }
export interface CheckInSnapshot { input: CheckInRequest; response: DashboardResponse }
export interface Repository {
  transaction<T>(profileId: string, run: (repository: Repository) => Promise<T>): Promise<T>;
  health(): Promise<boolean>;
  createProfile(data: UserProfileInput, now: Date): Promise<ProfileRecord>;
  getProfile(id: string): Promise<ProfileRecord | null>;
  updateProfile(id: string, data: UserProfileInput, now: Date): Promise<ProfileRecord | null>;
  saveEvaluation(profile: ProfileRecord, result: EligibilityResult[], drafts: RoadmapTaskDraft[], now: Date): Promise<void>;
  latestEvaluation(profileId: string): Promise<EvaluationSnapshot | null>;
  previousEvaluation(profileId: string): Promise<EvaluationSnapshot | null>;
  listTasks(profileId: string): Promise<RoadmapTask[]>;
  getTask(id: string): Promise<RoadmapTask | null>;
  updateTask(id: string, status: RoadmapTask['status'], now: Date): Promise<RoadmapTask | null>;
  getCheckIn(profileId: string, key: string): Promise<CheckInSnapshot | null>;
  latestCheckIn(profileId: string): Promise<CheckInSnapshot | null>;
  saveCheckIn(profileId: string, key: string, input: CheckInRequest, response: DashboardResponse, now: Date): Promise<void>;
}
