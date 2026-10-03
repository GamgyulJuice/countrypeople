import { buildApp } from './app.js';
import { ENGINE_IMPLEMENTED, evaluatePolicies, loadVerifiedPolicyCatalog } from '@rural/policy-engine';
import { ENGINE_IMPLEMENTED as ROADMAP_IMPLEMENTED, calculateReadiness, generateRoadmap } from '@rural/roadmap-engine';
import { prismaRepository } from './repositories/prisma-repository.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const { repository, close } = prismaRepository(databaseUrl);
const app = buildApp({
  databaseHealth: () => repository.health(), repository, engineImplemented: ENGINE_IMPLEMENTED, logging: true,
  policyEngine: ENGINE_IMPLEMENTED ? { async evaluate(profile, now) { return evaluatePolicies(await loadVerifiedPolicyCatalog(), profile, now); } } : undefined,
  roadmapEngine: ROADMAP_IMPLEMENTED ? { async generate(profile, eligibility, now) { return generateRoadmap({ profile, eligibility, now }); }, async readiness(profile, tasks) { return calculateReadiness({ profile, tasks }); } } : undefined,
});
app.addHook('onClose', async () => close());
await app.listen({ port: Number(process.env.PORT ?? 4000), host: '0.0.0.0' });
