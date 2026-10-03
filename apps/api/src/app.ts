import Fastify, { type FastifyInstance } from 'fastify';

export interface AppDependencies {
  databaseHealth: () => Promise<boolean>;
  engineImplemented: boolean;
}

export function buildApp(dependencies: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: false, genReqId: request => request.headers['x-request-id']?.toString() ?? crypto.randomUUID() });
  app.get('/health', async (_request, reply) => {
    try {
      const available = await dependencies.databaseHealth();
      return reply.code(available ? 200 : 503).send({ api: 'ok', database: available ? 'ok' : 'unavailable', policyEngine: dependencies.engineImplemented ? 'implemented' : 'not_implemented' });
    } catch {
      return reply.code(503).send({ api: 'ok', database: 'unavailable', policyEngine: dependencies.engineImplemented ? 'implemented' : 'not_implemented' });
    }
  });
  return app;
}
