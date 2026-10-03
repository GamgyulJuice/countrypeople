import { describe, expect, it } from 'vitest';
import { ageAt, completedHours, daysUntil, matchPolicy, roadmap, safeSource, taskProgress, today, weekStart } from './domain';
import { sampleDemo as initialDemo } from './demo';
import { blankProfile, type Policy } from './types';

const profile = { ...blankProfile('test'), birth_date: '1994-10-04', purpose: '귀농' as const, target_province: '전라남도', target_district: '담양군', move_date: '2027-03-01', urban_months: 36 };
const policy: Policy = { id: 'test-policy', title: '테스트 정책', summary: '', agency: '기관', region: '전국', category: '교육', benefit: '', start_date: '2026-01-01', end_date: '2026-12-31', source_name: '공식 공고', source_url: 'https://example.org/notice', policy_year: 2026, verified_at: '2026-10-01', contact: '', is_demo: false, rules: [{ id: 'rule', policy_id: 'test-policy', field: 'education_hours', operator: 'gte', value: 100, label: '100시간 교육', guidance: '교육시간 확인' }], documents: [] };
describe('정책 추천 및 로드맵', () => {
  it('한국 날짜 및 월요일 기준 주간을 계산한다', () => {
    expect(today(new Date('2026-10-02T16:00:00Z'))).toBe('2026-10-03');
    expect(weekStart('2026-10-04')).toBe('2026-09-28');
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
  });
  it('생일 전후의 만 나이를 구분한다', () => {
    expect(ageAt('1994-10-04', '2026-10-03')).toBe(31);
    expect(ageAt('1994-10-04', '2026-10-04')).toBe(32);
  });
  it('부족한 교육시간을 충족으로 오판하지 않는다', () => {
    expect(matchPolicy(policy, profile, [], '2026-10-03').status).toBe('준비 후 검토');
    const education = [{ ...initialDemo().education[0], hours: 100, completed_date: '2026-10-02' }];
    expect(matchPolicy(policy, profile, education, '2026-10-03').status).toBe('조건상 추천');
  });
  it('미래 수료 기록은 교육시간에 합산하지 않는다', () => {
    const education = [{ ...initialDemo().education[0], hours: 100, completed_date: '2026-10-04' }];
    expect(completedHours(education, '2026-10-03')).toBe(0);
  });
  it('미입력 조건과 등록되지 않은 규칙은 추가 확인으로 표시한다', () => {
    const incomePolicy = { ...policy, rules: [{ ...policy.rules[0], field: 'income_band' as const, operator: 'eq' as const, value: '2천만원 미만' }] };
    expect(matchPolicy(incomePolicy, profile, [], '2026-10-03').status).toBe('추가 확인 필요');
    expect(matchPolicy({ ...policy, rules: [] }, profile, [], '2026-10-03').status).toBe('추가 확인 필요');
    expect(matchPolicy(policy, null, [], '2026-10-03').status).toBe('추가 확인 필요');
  });
  it('선택하지 않은 귀농 목적과 잘못된 규칙 타입을 일치로 판단하지 않는다', () => {
    const purposePolicy = { ...policy, rules: [{ ...policy.rules[0], field: 'purpose' as const, operator: 'eq' as const, value: '귀농' }] };
    expect(matchPolicy(purposePolicy, { ...profile, purpose: '탐색 중' }, [], '2026-10-03').status).toBe('추가 확인 필요');
    expect(matchPolicy({ ...policy, rules: [{ ...policy.rules[0], value: '100' }] }, profile, [], '2026-10-03').status).toBe('추가 확인 필요');
  });
  it('시군 지역 조건은 별도 규칙이 없어도 검토한다', () => {
    expect(matchPolicy({ ...policy, region: '경상북도 상주시' }, profile, [], '2026-10-03').status).toBe('현재 조건 불일치');
  });
  it('마감일 당일과 다음날, 모집 시작 전을 구분한다', () => {
    expect(matchPolicy(policy, profile, [], '2026-12-31').status).not.toBe('모집 마감');
    expect(matchPolicy(policy, profile, [], '2027-01-01').status).toBe('모집 마감');
    expect(matchPolicy(policy, profile, [], '2025-12-31').status).toBe('모집 예정');
  });
  it('자바스크립트·HTTP 링크를 원문으로 허용하지 않는다', () => {
    expect(safeSource('javascript:alert(1)')).toBeNull();
    expect(safeSource('http://example.org')).toBeNull();
    expect(safeSource('https://example.org/notice')).toBe('https://example.org/notice');
  });
  it('목표일 기준 일정을 만들고 실제 완료만 진행도로 계산한다', () => {
    const tasks = roadmap(profile);
    expect(tasks).toHaveLength(7);
    expect(tasks.find(t => t.due_date === '2027-03-01')).toBeDefined();
    expect(roadmap({ ...profile, move_date: null })).toEqual([]);
    expect(taskProgress([])).toBe(0);
    expect(taskProgress(initialDemo().tasks)).toBe(33);
  });
});
