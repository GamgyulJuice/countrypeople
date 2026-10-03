import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import { z, ZodError } from 'zod';
import { CheckInRequestSchema, UpdateTaskRequestSchema, UserProfileInputSchema, UserProfilePatchSchema } from '@rural/contracts';
import { HttpError } from './errors.js';
import type { PolicyEnginePort, Repository, RoadmapEnginePort } from './ports.js';
import { PlatformService } from './services/platform.js';

export interface AppDependencies {
  databaseHealth: () => Promise<boolean>;
  engineImplemented: boolean;
  repository?: Repository;
  policyEngine?: PolicyEnginePort;
  roadmapEngine?: RoadmapEnginePort;
  now?: () => Date;
  logging?: boolean;
}
const id = z.uuid();
export function buildApp(dependencies: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: dependencies.logging ?? false, genReqId: request => request.headers['x-request-id']?.toString() ?? crypto.randomUUID() });
  app.register(cors, { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  app.register(swagger, { openapi: { info: { title: 'Countrypeople MVP API', version: '1.0.0' } } });
  app.setErrorHandler((error, request, reply) => {
    const isValidation = error instanceof ZodError || (typeof error === 'object' && error !== null && 'validation' in error);
    const status = isValidation ? 400 : error instanceof HttpError ? error.status : 500;
    const code = isValidation ? 'VALIDATION_ERROR' : error instanceof HttpError ? error.code : 'INTERNAL_ERROR';
    return reply.code(status).send({ error: { code, message: status === 500 ? '서버 오류가 발생했습니다.' : error instanceof Error ? error.message : '잘못된 요청입니다.', details: error instanceof ZodError ? error.issues : undefined }, requestId: request.id });
  });
  app.get('/health', async (_request, reply) => {
    try {
      const available = await dependencies.databaseHealth();
      return reply.code(available ? 200 : 503).send({ api: 'ok', database: available ? 'ok' : 'unavailable', policyEngine: dependencies.engineImplemented ? 'implemented' : 'not_implemented' });
    } catch {
      return reply.code(503).send({ api: 'ok', database: 'unavailable', policyEngine: dependencies.engineImplemented ? 'implemented' : 'not_implemented' });
    }
  });
  if (dependencies.repository) {
    const service = new PlatformService({ repository: dependencies.repository, policyEngine: dependencies.policyEngine, roadmapEngine: dependencies.roadmapEngine, now: dependencies.now ?? (() => new Date()) });
    app.post('/api/v1/profiles', async (req, reply) => reply.code(201).send(await service.create(UserProfileInputSchema.parse(req.body))));
    app.get('/api/v1/profiles/:profileId', async req => service.get(id.parse((req.params as { profileId: string }).profileId)));
    app.patch('/api/v1/profiles/:profileId', async req => service.patch(id.parse((req.params as { profileId: string }).profileId), UserProfilePatchSchema.parse(req.body)));
    app.post('/api/v1/profiles/:profileId/evaluations', async req => service.evaluate(id.parse((req.params as { profileId: string }).profileId)));
    app.get('/api/v1/profiles/:profileId/dashboard', async req => service.dashboard(id.parse((req.params as { profileId: string }).profileId)));
    app.patch('/api/v1/tasks/:taskId', async req => service.task(id.parse((req.params as { taskId: string }).taskId), UpdateTaskRequestSchema.parse(req.body).status));
    app.post('/api/v1/profiles/:profileId/check-ins', async req => {
      const key = req.headers['idempotency-key'];
      if (typeof key !== 'string' || !key.trim()) throw new HttpError(400, 'VALIDATION_ERROR', 'Idempotency-Key가 필요합니다.');
      return service.checkIn(id.parse((req.params as { profileId: string }).profileId), CheckInRequestSchema.parse(req.body), key);
    });
    app.get('/api/v1/profiles/:profileId/newsletter-preview', async req => service.newsletter(id.parse((req.params as { profileId: string }).profileId)));
  }
  return app;
}
