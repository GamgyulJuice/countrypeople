import { describe, expect, it } from 'vitest';
import { monthDays, shiftMonth } from './calendar';

describe('calendar civil dates', () => {
  it('lays out October 2026 Sunday-first with adjacent-month padding', () => {
    const days = monthDays('2026-10-03');
    expect(days).toHaveLength(35);
    expect(days[0]).toBe('2026-09-27');
    expect(days[4]).toBe('2026-10-01');
    expect(days.at(-1)).toBe('2026-10-31');
    expect(new Set(days).size).toBe(days.length);
  });
  it('includes leap day and all six weeks when needed', () => {
    expect(monthDays('2024-02-10')).toContain('2024-02-29');
    expect(monthDays('2025-02-10')).not.toContain('2025-02-29');
    const days = monthDays('2026-08-01');
    expect(days).toHaveLength(42);
    expect(days[0]).toBe('2026-07-26');
    expect(days.at(-1)).toBe('2026-09-05');
  });
  it('changes months across years and clamps month-end selections', () => {
    expect(shiftMonth('2026-12-31', 1)).toBe('2027-01-31');
    expect(shiftMonth('2026-01-31', -1)).toBe('2025-12-31');
    expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftMonth('2024-03-31', -1)).toBe('2024-02-29');
  });
});
