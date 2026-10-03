import { DateOnlySchema } from '@rural/contracts';
export function daysBetweenDates(from: string, to: string): number {
  const a = DateOnlySchema.parse(from), b = DateOnlySchema.parse(to);
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}
export function todaySeoul(now: Date): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
