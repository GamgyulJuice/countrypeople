import type { EligibilityResult, UserProfileInput } from '@rural/contracts';

export const ENGINE_IMPLEMENTED = false;
export class NotImplementedError extends Error {
  constructor() { super('NotImplementedError: policy engine is not implemented'); }
}
export function parsePolicyCatalog(_raw: unknown): unknown[] { throw new NotImplementedError(); }
export function evaluatePredicate(_rule: unknown, _context: unknown): never { throw new NotImplementedError(); }
export function evaluateRule(_node: unknown, _context: unknown): never { throw new NotImplementedError(); }
export function evaluatePolicy(_policy: unknown, _profile: UserProfileInput, _now: Date): EligibilityResult { throw new NotImplementedError(); }
export function evaluatePolicies(_policies: unknown[], _profile: UserProfileInput, _now: Date): EligibilityResult[] { throw new NotImplementedError(); }
export async function loadVerifiedPolicyCatalog(): Promise<unknown[]> { throw new NotImplementedError(); }
