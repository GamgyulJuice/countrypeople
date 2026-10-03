import { expect, it } from 'vitest';
import { parsePolicyCatalog } from '../src/index';

it('does not pretend that an unimplemented policy catalog is verified', () => {
  expect(() => parsePolicyCatalog([])).toThrow('NotImplementedError');
});
