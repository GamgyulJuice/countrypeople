import { z } from 'zod';
import { DateOnlySchema } from './profile.js';

export const TaskStatusSchema = z.enum(['todo', 'done', 'skipped']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export const RoadmapTaskSchema = z.object({
  id: z.uuid(), profileId: z.uuid(), code: z.string().min(1), title: z.string().min(1),
  description: z.string(), category: z.string().min(1), status: TaskStatusSchema,
  dueDate: DateOnlySchema.nullable().optional(), sourcePolicyId: z.string().nullable().optional(),
  dedupeKey: z.string().min(1), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export type RoadmapTask = z.infer<typeof RoadmapTaskSchema>;
export const RoadmapTaskDraftSchema = RoadmapTaskSchema.omit({ id: true, profileId: true, createdAt: true, updatedAt: true });
export type RoadmapTaskDraft = z.infer<typeof RoadmapTaskDraftSchema>;
export const UpdateTaskRequestSchema = z.object({ status: TaskStatusSchema }).strict();
