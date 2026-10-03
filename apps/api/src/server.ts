import { buildApp } from './app.js';
import { ENGINE_IMPLEMENTED } from '@rural/policy-engine';

const app = buildApp({ databaseHealth: async () => false, engineImplemented: ENGINE_IMPLEMENTED });
await app.listen({ port: Number(process.env.PORT ?? 4000), host: '0.0.0.0' });
