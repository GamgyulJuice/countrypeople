import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';

describe('health', () => {
  it('exposes API, database, and engine availability', async () => {
    const app = buildApp({ databaseHealth: async () => true, engineImplemented: false });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ api: 'ok', database: 'ok', policyEngine: 'not_implemented' });
    await app.close();
  });

  it('reports a database outage without claiming to be healthy', async () => {
    const app = buildApp({ databaseHealth: async () => false, engineImplemented: false });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ api: 'ok', database: 'unavailable' });
    await app.close();
  });
});
