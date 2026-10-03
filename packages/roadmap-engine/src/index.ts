import type { EligibilityResult, RoadmapTask, RoadmapTaskDraft, UserProfileInput } from '@rural/contracts';

export const ENGINE_IMPLEMENTED = false;
export class NotImplementedError extends Error {
  constructor() { super('NotImplementedError: roadmap engine is not implemented'); }
}
export function generateRoadmap(_input: { profile: UserProfileInput; eligibility: EligibilityResult[]; now: Date }): RoadmapTaskDraft[] { throw new NotImplementedError(); }
export function calculateReadiness(_input: { profile: UserProfileInput; tasks: RoadmapTask[] }): number { throw new NotImplementedError(); }
