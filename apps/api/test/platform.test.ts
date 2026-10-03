import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app';
import { memoryRepository } from './support/memory-repository';

const now = () => new Date('2026-10-03T00:00:00.000Z');
const policy = { id: 'p-1', name: '교육 지원', organization: '지역센터', benefitType: 'education' as const, benefitSummary: '교육', applicationEnd: '2026-10-03', policyYear: 2026, verificationStatus: 'verified' as const };
describe('evaluation, dashboard, tasks, and newsletter', () => {
  it('uses injected engines and preserves task identity across evaluations', async () => {
    const repo = memoryRepository();
    const evaluate = vi.fn(async () => [{ policy, status: 'eligible' as const, checks: [], recommendedActions: [], evaluatedAt: now().toISOString() }]);
    const app = buildApp({ databaseHealth: () => repo.health(), repository: repo, engineImplemented: true, now, policyEngine: { evaluate }, roadmapEngine: { async generate() { return [{ code: 'education', title: '교육 신청', description: '', category: 'education', status: 'todo' as const, dueDate: '2026-10-04', dedupeKey: 'education:p-1' }]; }, async readiness(_profile, tasks) { return tasks.some(task => task.status === 'done') ? 100 : 0; } } });
    const create = await app.inject({ method: 'POST', url: '/api/v1/profiles', payload: { migrationType: 'farming', migrationStatus: 'planning', targetMoveDate: '2026-10-03' } });
    const id = create.json().id;
    for (let i = 0; i < 2; i++) expect((await app.inject({ method: 'POST', url: `/api/v1/profiles/${id}/evaluations` })).statusCode).toBe(200);
    expect(evaluate).toHaveBeenCalledTimes(2);
    let dashboard = (await app.inject({ method: 'GET', url: `/api/v1/profiles/${id}/dashboard` })).json();
    expect(dashboard.weeklyTasks).toHaveLength(1);
    expect(dashboard.newsletter.upcomingDeadlines[0].daysRemaining).toBe(0);
    expect(dashboard.summary.daysToMove).toBe(0);
    const taskId = dashboard.weeklyTasks[0].id;
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/tasks/${taskId}`, payload: { status: 'done' } })).statusCode).toBe(200);
    dashboard = (await app.inject({ method: 'GET', url: `/api/v1/profiles/${id}/dashboard` })).json();
    expect(dashboard.summary.readinessPercent).toBe(100);
    expect(dashboard.weeklyTasks).toHaveLength(0);
    expect((await app.inject({ method: 'POST', url: `/api/v1/profiles/${id}/check-ins`, headers: { 'idempotency-key': 'week-1' }, payload: { completedTaskIds: [taskId] } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/api/v1/profiles/${id}/check-ins`, headers: { 'idempotency-key': 'week-1' }, payload: { completedTaskIds: [taskId] } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/api/v1/profiles/${id}/check-ins`, headers: { 'idempotency-key': 'week-1' }, payload: { note: 'different' } })).statusCode).toBe(409);
    expect((await app.inject({ method: 'GET', url: `/api/v1/profiles/${id}/newsletter-preview` })).json().readinessChange).toBe(0);
    expect((await app.inject({ method: 'POST', url: `/api/v1/profiles/${id}/check-ins`, headers: { 'idempotency-key': 'week-2' }, payload: { completedTaskIds: ['00000000-0000-4000-8000-000000000099'] } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: `/api/v1/profiles/${id}/check-ins`, headers: { 'idempotency-key': 'week-2' }, payload: { note: 'valid after failed request' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/profiles/${id}`, payload: { targetRegionCode: '46710' } })).statusCode).toBe(200);
    dashboard = (await app.inject({ method: 'GET', url: `/api/v1/profiles/${id}/dashboard` })).json();
    expect(dashboard.eligibility).toHaveLength(0);
    await app.close();
  });
  it('reports unavailable engines rather than returning fabricated recommendations', async () => {
    const app = buildApp({ databaseHealth: async () => true, engineImplemented: false, repository: memoryRepository() });
    const create = await app.inject({ method: 'POST', url: '/api/v1/profiles', payload: { migrationType: 'rural', migrationStatus: 'planning' } });
    const id = create.json().id;
    const res = await app.inject({ method: 'POST', url: `/api/v1/profiles/${id}/evaluations` });
    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe('ENGINE_UNAVAILABLE');
    await app.close();
  });
});
