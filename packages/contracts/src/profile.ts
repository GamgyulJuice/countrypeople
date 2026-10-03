import { z } from 'zod';

export const MigrationTypeSchema = z.enum(['farming', 'rural', 'undecided']);
export type MigrationType = z.infer<typeof MigrationTypeSchema>;
export const MigrationStatusSchema = z.enum(['planning', 'completed']);
export type MigrationStatus = z.infer<typeof MigrationStatusSchema>;
export const PreparationStageSchema = z.enum(['interest', 'exploring', 'planning', 'preparing', 'executing', 'settled_0_3y', 'settled_3y_plus']);
export type PreparationStage = z.infer<typeof PreparationStageSchema>;

export const DateOnlySchema = z.iso.date();
const unknownText = z.string().trim().min(1).nullable().optional();
const nonnegative = z.number().finite().nonnegative().nullable().optional();
const optionalDate = DateOnlySchema.nullable().optional();
const residence = z.object({ urbanResidenceMonths: nonnegative });
const household = z.object({ isHouseholdHead: z.boolean().nullable().optional(), movingWithFamily: z.boolean().nullable().optional(), childrenCount: z.number().int().nonnegative().nullable().optional() });
const employment = z.object({ currentStatus: unknownText, continueAfterMove: z.boolean().nullable().optional(), hasBusinessRegistration: z.boolean().nullable().optional() });
const farming = z.object({ experienceYears: nonnegative, independentStartDate: optionalDate, educationHours: nonnegative, businessRegistrationStatus: unknownText, farmlandStatus: unknownText, farmlandAreaSqm: nonnegative });
const economics = z.object({ incomeBracket: unknownText, healthInsuranceBracket: unknownText });

export const UserProfileInputSchema = z.object({
  birthDate: optionalDate,
  currentRegionCode: unknownText,
  targetRegionCode: unknownText,
  migrationType: MigrationTypeSchema,
  migrationStatus: MigrationStatusSchema,
  stage: PreparationStageSchema.optional(),
  targetMoveDate: optionalDate,
  movedAt: optionalDate,
  targetIndustries: z.array(z.string().trim().min(1)).optional(),
  residence: residence.optional(),
  household: household.optional(),
  employment: employment.optional(),
  farming: farming.optional(),
  economics: economics.optional(),
  militaryStatus: unknownText,
  housingStatus: unknownText,
}).superRefine((value, ctx) => {
  if (value.migrationStatus === 'planning' && value.movedAt) {
    ctx.addIssue({ code: 'custom', path: ['movedAt'], message: 'A planned move cannot already have a move date.' });
  }
  if (value.migrationStatus === 'completed' && (!value.movedAt || value.targetMoveDate)) {
    ctx.addIssue({ code: 'custom', path: ['movedAt'], message: 'A completed move requires movedAt instead of targetMoveDate.' });
  }
});
export type UserProfileInput = z.infer<typeof UserProfileInputSchema>;

export const UserProfilePatchSchema = z.object({
  birthDate: optionalDate, currentRegionCode: unknownText, targetRegionCode: unknownText,
  migrationType: MigrationTypeSchema.optional(), migrationStatus: MigrationStatusSchema.optional(),
  stage: PreparationStageSchema.optional(), targetMoveDate: optionalDate, movedAt: optionalDate,
  targetIndustries: z.array(z.string().trim().min(1)).optional(),
  residence: residence.partial().optional(), household: household.partial().optional(),
  employment: employment.partial().optional(), farming: farming.partial().optional(),
  economics: economics.partial().optional(), militaryStatus: unknownText, housingStatus: unknownText,
}).strict().refine(value => Object.keys(value).length > 0, 'At least one field must be provided.');
export type UserProfilePatch = z.infer<typeof UserProfilePatchSchema>;

export const ProfileRecordSchema = z.object({ id: z.uuid(), data: UserProfileInputSchema, createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export type ProfileRecord = z.infer<typeof ProfileRecordSchema>;
