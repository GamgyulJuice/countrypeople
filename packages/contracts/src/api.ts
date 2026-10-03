import { z } from 'zod';
import { DateOnlySchema, ProfileRecordSchema } from './profile.js';
import { EligibilityResultSchema, PolicySummarySchema } from './policy.js';
import { RoadmapTaskSchema } from './roadmap.js';

export const NewsletterPreviewSchema = z.object({
  profileId: z.uuid(), subject: z.string(), intro: z.string(), daysToMove: z.number().int().nullable(),
  weeklyTasks: z.array(RoadmapTaskSchema), newPolicies: z.array(PolicySummarySchema),
  upcomingDeadlines: z.array(z.object({ policy: PolicySummarySchema, daysRemaining: z.number().int().nonnegative() })),
  readinessChange: z.number().nullable(), generatedAt: z.iso.datetime(),
});
export type NewsletterPreview = z.infer<typeof NewsletterPreviewSchema>;

export const DashboardResponseSchema = z.object({
  profile: ProfileRecordSchema,
  summary: z.object({ daysToMove: z.number().int().nullable(), readinessPercent: z.number().min(0).max(100), eligibleCount: z.number().int().nonnegative(), needsRequirementsCount: z.number().int().nonnegative(), weeklyTaskCount: z.number().int().nonnegative() }),
  eligibility: z.array(EligibilityResultSchema), weeklyTasks: z.array(RoadmapTaskSchema),
  newsletter: NewsletterPreviewSchema,
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;

export const CheckInRequestSchema = z.object({
  completedTaskIds: z.array(z.uuid()).default([]), skippedTaskIds: z.array(z.uuid()).default([]),
  note: z.string().max(2000).nullable().optional(),
}).strict().refine(value => !value.completedTaskIds.some(id => value.skippedTaskIds.includes(id)), 'A task cannot be completed and skipped in the same check-in.');
export type CheckInRequest = z.infer<typeof CheckInRequestSchema>;

export const ApiErrorSchema = z.object({ error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }), requestId: z.string().min(1) });
export type ApiError = z.infer<typeof ApiErrorSchema>;
export const DateRangeSchema = z.object({ start: DateOnlySchema, end: DateOnlySchema });
