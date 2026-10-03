import { z } from 'zod';
import { DateOnlySchema } from './profile.js';

export const EligibilityStatusSchema = z.enum(['eligible', 'needs_information', 'needs_requirements', 'future', 'not_eligible']);
export type EligibilityStatus = z.infer<typeof EligibilityStatusSchema>;
export const RequirementStateSchema = z.enum(['pass', 'fail', 'unknown']);
export type RequirementState = z.infer<typeof RequirementStateSchema>;
export const PolicyVerificationStatusSchema = z.enum(['verified', 'needs_review', 'demo', 'stale']);
export type PolicyVerificationStatus = z.infer<typeof PolicyVerificationStatusSchema>;
export const FailureModeSchema = z.enum(['hard', 'remediable', 'future', 'information']);
export const RecommendedActionSchema = z.object({
  code: z.string().min(1), title: z.string().min(1), description: z.string(),
  category: z.string().min(1), suggestedDueOffsetDays: z.number().int().nullable().optional(),
  evidenceDescription: z.string().nullable().optional(), sourcePolicyId: z.string().nullable().optional(),
});
export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;

export const RequirementResultSchema = z.object({
  ruleId: z.string().min(1), label: z.string().min(1), state: RequirementStateSchema,
  actual: z.unknown(), expected: z.unknown(), blocking: z.boolean(), failureMode: FailureModeSchema,
  explanation: z.string(), action: RecommendedActionSchema.nullable().optional(),
});
export type RequirementResult = z.infer<typeof RequirementResultSchema>;

export const PolicySummarySchema = z.object({
  id: z.string().min(1), name: z.string().min(1), organization: z.string().min(1),
  benefitType: z.enum(['grant', 'loan', 'education', 'housing', 'farmland', 'consulting', 'employment', 'other']),
  benefitSummary: z.string(), applicationStart: DateOnlySchema.nullable().optional(),
  applicationEnd: DateOnlySchema.nullable().optional(), sourceUrl: z.url().nullable().optional(),
  policyYear: z.number().int().min(2000), verifiedAt: DateOnlySchema.nullable().optional(),
  verificationStatus: PolicyVerificationStatusSchema,
});
export type PolicySummary = z.infer<typeof PolicySummarySchema>;

export const EligibilityResultSchema = z.object({
  policy: PolicySummarySchema, status: EligibilityStatusSchema, checks: z.array(RequirementResultSchema),
  recommendedActions: z.array(RecommendedActionSchema), evaluatedAt: z.iso.datetime(),
});
export type EligibilityResult = z.infer<typeof EligibilityResultSchema>;
