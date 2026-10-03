import { describe, expect, it } from 'vitest';
import { UserProfileInputSchema, EligibilityResultSchema, RoadmapTaskSchema } from '../src/index';

describe('shared contracts', () => {
  it('preserves unknown profile details while validating migration intent', () => {
    const result = UserProfileInputSchema.parse({ migrationType: 'farming', migrationStatus: 'planning', stage: 'exploring', targetMoveDate: '2028-02-29' });
    expect(result.birthDate).toBeUndefined();
    expect(result.targetMoveDate).toBe('2028-02-29');
  });

  it('rejects impossible date-only values and contradictory move status', () => {
    expect(UserProfileInputSchema.safeParse({ migrationType: 'rural', migrationStatus: 'planning', targetMoveDate: '2025-02-29' }).success).toBe(false);
    expect(UserProfileInputSchema.safeParse({ migrationType: 'rural', migrationStatus: 'completed', targetMoveDate: '2027-01-01' }).success).toBe(false);
  });

  it('retains failed and unknown policy checks rather than discarding them', () => {
    const result = EligibilityResultSchema.parse({
      policy: { id: 'p1', name: '정책', organization: '기관', benefitType: 'education', benefitSummary: '교육', policyYear: 2026, verificationStatus: 'verified', sourceUrl: 'https://example.gov', verifiedAt: '2026-10-03' },
      status: 'needs_information',
      checks: [{ ruleId: 'r1', label: '교육시간', state: 'unknown', actual: null, expected: 100, blocking: true, failureMode: 'information', explanation: '입력 필요', action: null }],
      recommendedActions: [], evaluatedAt: '2026-10-03T00:00:00.000Z'
    });
    expect(result.checks[0]?.state).toBe('unknown');
  });

  it('requires a stable dedupe key for roadmap tasks', () => {
    expect(RoadmapTaskSchema.safeParse({ id: crypto.randomUUID(), profileId: crypto.randomUUID(), code: 'move', title: '전입', description: '전입 준비', category: 'administrative', status: 'todo', dueDate: '2026-10-03', dedupeKey: '' , createdAt: '2026-10-03T00:00:00.000Z', updatedAt: '2026-10-03T00:00:00.000Z' }).success).toBe(false);
  });
});
