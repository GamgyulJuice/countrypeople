import type { Education, Policy, Profile, Rule, Task } from './types';

// Civil dates use Korea time; calendar differences must not depend on the device timezone.
export function today(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function daysUntil(date: string, reference = today()): number {
  return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(reference + 'T00:00:00Z')) / 86400000);
}
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}
export function weekStart(reference = today()): string {
  const day = new Date(reference + 'T00:00:00Z').getUTCDay();
  return addDays(reference, -((day + 6) % 7));
}
export function ageAt(birthday: string, reference = today()): number {
  const years = Number(reference.slice(0, 4)) - Number(birthday.slice(0, 4));
  return years - (reference.slice(5) < birthday.slice(5) ? 1 : 0);
}
export function completedHours(education: Education[], reference = today()) {
  return education.filter(e => e.completed_date <= reference).reduce((sum, e) => sum + Number(e.hours), 0);
}
export function safeSource(url: string): string | null {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : null; } catch { return null; }
}
export type MatchStatus = '조건상 추천' | '추가 확인 필요' | '준비 후 검토' | '현재 조건 불일치' | '모집 마감' | '모집 예정';
export interface RuleResult { rule: Rule; status: 'pass' | 'gap' | 'unknown'; actual: string | number | boolean | null }
export function matchPolicy(policy: Policy, profile: Profile | null, education: Education[], reference = today()): { status: MatchStatus; results: RuleResult[] } {
  const values: Record<string, string | number | boolean | null> = profile ? {
    age: profile.birth_date ? ageAt(profile.birth_date, reference) : null,
    purpose: profile.purpose === '탐색 중' ? null : profile.purpose,
    region: profile.target_district ? `${profile.target_province} ${profile.target_district}`.trim() : null,
    education_hours: completedHours(education, reference), urban_months: profile.urban_months,
    independent_years: profile.independent_since ? Math.max(0, -daysUntil(profile.independent_since, reference) / 365.2425) : null,
    household_head: profile.household_head, entity_status: profile.entity_status || null,
    farmland_status: profile.farmland_status || null, income_band: profile.income_band || null, moved: profile.moved,
  } : {};
  const results = policy.rules.map(rule => {
    const actual = values[rule.field] ?? null;
    const supported = ['gte', 'lte', 'eq'].includes(rule.operator);
    const numeric = typeof actual === 'number' && typeof rule.value === 'number';
    const unknown = actual === null || !supported || (rule.operator !== 'eq' && !numeric);
    const passed = rule.operator === 'eq' ? actual === rule.value : numeric && (rule.operator === 'gte' ? actual >= (rule.value as number) : actual <= (rule.value as number));
    return { rule, actual, status: unknown ? 'unknown' : passed ? 'pass' : 'gap' } as RuleResult;
  });
  let status: MatchStatus = '조건상 추천';
  if (!profile || !results.length || results.some(r => r.status === 'unknown')) status = '추가 확인 필요';
  if (results.some(r => r.status === 'gap')) status = '준비 후 검토';
  if (results.some(r => r.status === 'gap' && ['age', 'region', 'purpose'].includes(r.rule.field))) status = '현재 조건 불일치';
  // Region is enforced even if an administrator has not created an explicit region rule.
  if (profile && policy.region !== '전국') {
    if (!profile.target_district) status = '추가 확인 필요';
    else if (policy.region !== `${profile.target_province} ${profile.target_district}`.trim()) status = '현재 조건 불일치';
  }
  if (policy.start_date && policy.start_date > reference) status = '모집 예정';
  if (policy.end_date && policy.end_date < reference) status = '모집 마감';
  return { status, results };
}
export function taskProgress(tasks: Task[]): number {
  return tasks.length ? Math.round(tasks.filter(t => t.completed).length / tasks.length * 100) : 0;
}
export function roadmap(profile: Profile): Omit<Task, 'id'>[] {
  if (!profile.move_date) return [];
  const region = `${profile.target_province} ${profile.target_district}`.trim() || '희망 지역';
  // Suggested stage start dates. Displayed ends follow the next distinct start.
  const items: [number, string, string][] = [
    [-270, `${region} 지원사업 공고·신청기간 비교하고 상담 예약하기`, '탐색'],
    [-180, profile.purpose === '귀촌' ? `${region} 지역 일자리·창업 교육 신청서와 일정 확인하기` : '농업교육포털에서 귀농·영농 교육 신청하고 수료증 받기', '교육'],
    [-120, '빈집 후보지 방문하고 건축물대장·임대 조건 확인하기', '주거'],
    [-60, '지원사업 신청서·사업계획서·증빙서류 목록 준비하기', '정책'],
    [-30, '전입신고 신분증·신고서와 온라인 신청 방법 준비하기', '생활'],
    [0, '정부24 또는 주민센터에서 전입신고하고 처리결과 확인하기', '생활'],
    [30, profile.purpose === '귀농' ? '농업경영체 등록신청서·영농 증빙 준비하고 관할 농관원에 문의하기' : `${region} 전입 후 생활·일자리 프로그램 신청하기`, profile.purpose === '귀농' ? '생활' : '정책'],
  ];
  return items.map(([offset, title, category]) => ({ user_id: profile.user_id, title, category, start_date: addDays(profile.move_date!, offset), due_date: addDays(profile.move_date!, offset), completed: false, policy_id: null }));
}
