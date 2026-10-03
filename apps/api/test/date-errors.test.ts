import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { daysBetweenDates, todaySeoul } from '../src/domain/date-only';
import { memoryRepository } from './support/memory-repository';

describe('date-only arithmetic and safe errors', () => {
  it('handles leap day, same day, and timezone-independent date strings', () => {
    expect(daysBetweenDates('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetweenDates('2026-10-03', '2026-10-03')).toBe(0);
    expect(daysBetweenDates('2026-10-03', '2026-10-02')).toBe(-1);
    expect(() => daysBetweenDates('2025-02-29', '2025-03-01')).toThrow();
    expect(todaySeoul(new Date('2026-10-02T16:00:00Z'))).toBe('2026-10-03');
  });
  it('does not disclose database exceptions and includes the request ID', async () => {
    const repo = memoryRepository();
    repo.createProfile = async () => { throw new Error('secret SQL password and query'); };
    const app = buildApp({ databaseHealth: () => repo.health(), engineImplemented: false, repository: repo });
    const response = await app.inject({ method: 'POST', url: '/api/v1/profiles', headers: { 'x-request-id': 'test-request' }, payload: { migrationType: 'rural', migrationStatus: 'planning' } });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ error: { code: 'INTERNAL_ERROR' }, requestId: 'test-request' });
    expect(response.body).not.toContain('secret SQL');
    await app.close();
  });
});
