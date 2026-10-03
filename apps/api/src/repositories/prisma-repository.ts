import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import type { CheckInRequest, DashboardResponse, EligibilityResult, ProfileRecord, RoadmapTask, RoadmapTaskDraft, UserProfileInput } from '@rural/contracts';
import { CheckInRequestSchema, DashboardResponseSchema, EligibilityResultSchema, ProfileRecordSchema, RoadmapTaskSchema } from '@rural/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { HttpError } from '../errors.js';
import { stableJson } from '../domain/stable-json.js';
import type { CheckInSnapshot, EvaluationSnapshot, Repository } from '../ports.js';

const asJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const profileRecord = (p: { id: string; data: unknown; createdAt: Date; updatedAt: Date }) => ProfileRecordSchema.parse({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() });
const taskRecord = (t: { id: string; profileId: string; code: string; title: string; description: string; category: string; status: string; dueDate: Date | null; sourcePolicyId: string | null; dedupeKey: string; createdAt: Date; updatedAt: Date }) => RoadmapTaskSchema.parse({ ...t, dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() });
const uniqueInput = (input: CheckInRequest) => ({ ...input, completedTaskIds: [...input.completedTaskIds].sort(), skippedTaskIds: [...input.skippedTaskIds].sort(), note: input.note ?? null });

export function prismaRepository(url: string): { repository: Repository; close: () => Promise<void> } {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const makeRepository = (db: PrismaClient | Prisma.TransactionClient): Repository => ({
    async transaction<T>(profileId: string, run: (repository: Repository) => Promise<T>) { return prisma.$transaction(async tx => { await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${profileId}))`; return run(makeRepository(tx)); }); },
    async health() { await db.$queryRaw`SELECT 1`; return true; },
    async createProfile(data: UserProfileInput, now: Date) { return profileRecord(await db.profile.create({ data: { data: asJson(data), createdAt: now, updatedAt: now } })); },
    async getProfile(id: string) { const p = await db.profile.findUnique({ where: { id } }); return p ? profileRecord(p) : null; },
    async updateProfile(id: string, data: UserProfileInput, now: Date) {
      const p = await db.profile.update({ where: { id }, data: { data: asJson(data), updatedAt: now } }).catch(e => { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') return null; throw e; });
      return p ? profileRecord(p) : null;
    },
    async saveEvaluation(profile: ProfileRecord, result: EligibilityResult[], drafts: RoadmapTaskDraft[], now: Date) {
      await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Profile" WHERE id = ${profile.id}::uuid FOR UPDATE`;
        const current = await tx.profile.findUnique({ where: { id: profile.id } });
        if (!current || current.updatedAt.toISOString() !== profile.updatedAt || stableJson(current.data) !== stableJson(profile.data)) throw new HttpError(409, 'PROFILE_CHANGED', '프로필이 변경되었습니다. 다시 평가해 주세요.');
        await tx.evaluation.create({ data: { profileId: profile.id, result: asJson(result), profileData: asJson(profile.data), profileUpdatedAt: current.updatedAt, evaluatedAt: now, engineVersion: 'contract-v1' } });
        for (const draft of drafts) await tx.task.upsert({ where: { profileId_dedupeKey: { profileId: profile.id, dedupeKey: draft.dedupeKey } }, create: { profileId: profile.id, code: draft.code, title: draft.title, description: draft.description, category: draft.category, status: draft.status, dueDate: draft.dueDate ? new Date(`${draft.dueDate}T00:00:00Z`) : null, sourcePolicyId: draft.sourcePolicyId ?? null, dedupeKey: draft.dedupeKey, createdAt: now, updatedAt: now }, update: {} });
      });
    },
    async latestEvaluation(profileId: string): Promise<EvaluationSnapshot | null> {
      const evaluation = await db.evaluation.findFirst({ where: { profileId }, orderBy: { sequence: 'desc' } });
      return evaluation ? { result: (evaluation.result as unknown[]).map(item => EligibilityResultSchema.parse(item)), profileData: evaluation.profileData as UserProfileInput, profileUpdatedAt: evaluation.profileUpdatedAt.toISOString(), evaluatedAt: evaluation.evaluatedAt.toISOString() } : null;
    },
    async previousEvaluation(profileId: string): Promise<EvaluationSnapshot | null> {
      const evaluation = await db.evaluation.findFirst({ where: { profileId }, orderBy: { sequence: 'desc' }, skip: 1 });
      return evaluation ? { result: (evaluation.result as unknown[]).map(item => EligibilityResultSchema.parse(item)), profileData: evaluation.profileData as UserProfileInput, profileUpdatedAt: evaluation.profileUpdatedAt.toISOString(), evaluatedAt: evaluation.evaluatedAt.toISOString() } : null;
    },
    async listTasks(profileId: string) { return (await db.task.findMany({ where: { profileId }, orderBy: { createdAt: 'asc' } })).map(taskRecord); },
    async getTask(id: string) { const t = await db.task.findUnique({ where: { id } }); return t ? taskRecord(t) : null; },
    async updateTask(id: string, status: RoadmapTask['status'], now: Date) {
      const t = await db.task.update({ where: { id }, data: { status, updatedAt: now } }).catch(e => { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') return null; throw e; });
      return t ? taskRecord(t) : null;
    },
    async getCheckIn(profileId: string, key: string): Promise<CheckInSnapshot | null> {
      const record = await db.checkIn.findUnique({ where: { profileId_idempotencyKey: { profileId, idempotencyKey: key } } });
      return record ? { input: CheckInRequestSchema.parse({ completedTaskIds: record.completedTaskIds, skippedTaskIds: record.skippedTaskIds, note: record.note }), response: DashboardResponseSchema.parse(record.response) } : null;
    },
    async latestCheckIn(profileId: string): Promise<CheckInSnapshot | null> {
      const record = await db.checkIn.findFirst({ where: { profileId }, orderBy: { sequence: 'desc' } });
      return record ? { input: CheckInRequestSchema.parse({ completedTaskIds: record.completedTaskIds, skippedTaskIds: record.skippedTaskIds, note: record.note }), response: DashboardResponseSchema.parse(record.response) } : null;
    },
    async saveCheckIn(profileId: string, key: string, input: CheckInRequest, response: DashboardResponse, now: Date) {
      const normalized = uniqueInput(input);
      await db.checkIn.create({ data: { profileId, idempotencyKey: key, completedTaskIds: asJson(normalized.completedTaskIds), skippedTaskIds: asJson(normalized.skippedTaskIds), note: normalized.note, payloadHash: createHash('sha256').update(JSON.stringify(normalized)).digest('hex'), response: asJson(response), createdAt: now } });
    },
  });
  const repository = makeRepository(prisma);
  return { repository, close: () => prisma.$disconnect() };
}
