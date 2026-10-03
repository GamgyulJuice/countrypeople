import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { memoryRepository } from './support/memory-repository';

describe('profile API', () => {
  it('creates, reads, and deeply patches a validated profile', async () => {
    const app = buildApp({ databaseHealth: async () => true, engineImplemented: false, repository: memoryRepository(), now: () => new Date('2026-10-03T00:00:00Z') });
    const created = await app.inject({ method: 'POST', url: '/api/v1/profiles', payload: { migrationType: 'farming', migrationStatus: 'planning', farming: { experienceYears: 2, educationHours: 10 } } });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const patched = await app.inject({ method: 'PATCH', url: `/api/v1/profiles/${id}`, payload: { farming: { educationHours: 40 } } });
    expect(patched.json().data.farming).toEqual({ experienceYears: 2, educationHours: 40 });
    expect((await app.inject({ method: 'GET', url: `/api/v1/profiles/${id}` })).json().data).toEqual(patched.json().data);
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/profiles/${id}`, payload: { migrationStatus: 'completed' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: `/api/v1/profiles/${id}` })).json().data.migrationStatus).toBe('planning');
    await app.close();
  });

  it('returns structured validation and missing errors with requestId', async () => {
    const app = buildApp({ databaseHealth: async () => true, engineImplemented: false, repository: memoryRepository() });
    const invalid = await app.inject({ method: 'POST', url: '/api/v1/profiles', payload: { migrationType: 'wrong' } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' }, requestId: expect.any(String) });
    const missing = await app.inject({ method: 'GET', url: '/api/v1/profiles/00000000-0000-4000-8000-000000000001' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('NOT_FOUND');
    await app.close();
  });
});
