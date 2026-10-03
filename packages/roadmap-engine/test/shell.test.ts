import { expect, it } from 'vitest';
import { calculateReadiness } from '../src/index';

it('does not report fabricated readiness while the engine is unimplemented', () => {
  expect(() => calculateReadiness({ profile: { migrationType: 'rural', migrationStatus: 'planning' }, tasks: [] })).toThrow('NotImplementedError');
});
