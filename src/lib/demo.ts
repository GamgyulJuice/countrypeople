import { addDays, today } from './domain';
import { blankProfile, emptyData, type AppData, type Policy, type Rule } from './types';
const rule = (policy: string, field: Rule['field'], value: Rule['value'], label: string, guidance: string, operator: Rule['operator'] = 'gte'): Rule => ({ id: `${policy}-${field}`, policy_id: policy, field, value, label, guidance, operator });
const specs = [
  { id: 'demo-1', title: '귀농 창업·주거 준비 지원', category: '창업·자금', benefit: '창업과 주거 기반 준비', summary: '귀농을 위한 영농 기반과 주거 준비 조건을 살펴보는 예시 정책입니다.', rules: [rule('demo-1', 'purpose', '귀농', '귀농 목적', '귀농 목적에 해당하는지 확인하세요.', 'eq'), rule('demo-1', 'education_hours', 100, '교육 100시간', '인정되는 교육과 수료시간을 원문에서 확인하세요.'), rule('demo-1', 'urban_months', 12, '도시 거주 12개월', '이전 거주 이력을 확인하세요.')] },
  { id: 'demo-2', title: '청년 영농 첫걸음 지원', category: '정착지원', benefit: '청년의 첫 영농을 위한 준비', summary: '청년 귀농인의 영농 준비를 안내하는 가상의 정책입니다.', rules: [rule('demo-2', 'age', 18, '만 18세 이상', '공고의 연령 산정일을 확인하세요.'), rule('demo-2', 'age', 39, '만 39세 이하', '정책별 연령 기준을 확인하세요.', 'lte'), rule('demo-2', 'income_band', '기준 확인 완료', '소득 요건 확인', '기관별 소득·재산 요건을 추가 확인하세요.', 'eq')] },
  { id: 'demo-3', title: '농촌에서 미리 살아보기', category: '주거·생활', benefit: '지역 탐색과 생활 체험', summary: '희망 지역에서 생활을 경험하며 이주 계획을 구체화하는 예시입니다.', rules: [] },
  { id: 'demo-4', title: '예비 귀농인 현장 교육', category: '교육', benefit: '영농 기초와 현장 경험', summary: '농업에 대한 이해와 현장 경험을 쌓는 교육 프로그램 예시입니다.', rules: [rule('demo-4', 'purpose', '귀농', '귀농 준비 중', '귀농 목적 교육인지 확인하세요.', 'eq')] },
];
export function demoPolicies(): Policy[] {
  return specs.map((s, i) => ({ ...s, agency: '데모 운영기관', region: '전국', start_date: addDays(today(), -14), end_date: addDays(today(), [7, 14, 30, 45][i]), source_name: '그린대로 (공식 정보 탐색용)', source_url: 'https://www.greendaero.go.kr/', policy_year: Number(today().slice(0, 4)), verified_at: null, contact: '원문에서 담당기관 확인', is_demo: true, documents: [{ id: `${s.id}-doc-1`, policy_id: s.id, title: '원문 공고 및 자격요건 확인' }, { id: `${s.id}-doc-2`, policy_id: s.id, title: '공고에 명시된 필요서류 확인' }] }));
}
export function initialDemo(): AppData {
  return { ...structuredClone(emptyData), policies: demoPolicies() };
}
// Explicit test fixture only. First-time visitors must enter their own conditions.
export function sampleDemo(): AppData {
  const profile = { ...blankProfile('demo-user'), display_name: '예비 귀농인', birth_date: '1994-05-10', purpose: '귀농' as const, current_region: '서울특별시', target_province: '전라남도', target_district: '담양군', move_date: addDays(today(), 180), stage: '준비', interest: '딸기 · 스마트팜', urban_months: 36 };
  return { profile, policies: demoPolicies(), tasks: [
    { id: 'demo-task-1', user_id: 'demo-user', title: '희망 지역 농업기술센터 상담 예약', due_date: addDays(today(), 2), completed: false, category: '정책', policy_id: null },
    { id: 'demo-task-2', user_id: 'demo-user', title: '귀농 기초 교육 수료 내역 정리', due_date: today(), completed: true, category: '교육', policy_id: null },
    { id: 'demo-task-3', user_id: 'demo-user', title: '담양군 주거 후보지 알아보기', due_date: addDays(today(), 5), completed: false, category: '주거', policy_id: null },
  ], education: [{ id: 'demo-edu-1', user_id: 'demo-user', title: '귀농 기초과정 (예시)', provider: '데모 교육기관', hours: 40, completed_date: today(), certificate: true }], bookmarks: [{ user_id: 'demo-user', policy_id: 'demo-1' }], documentChecks: [], checkins: [] };
}
