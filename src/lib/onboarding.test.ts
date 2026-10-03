import { describe, expect, it } from 'vitest';
import { initialDemo, sampleDemo } from './demo';
import { onboardingTasks } from './onboarding';
import { blankProfile } from './types';

const profile = { ...blankProfile('u1'), target_province: '전라남도', target_district: '담양군', purpose: '귀농' as const, move_date: '2027-03-01', birth_date: '1994-05-10' };
describe('첫 조건 입력과 일정 생성', () => {
  it('첫 방문은 가상 프로필 없이 시작한다', () => {
    const data = initialDemo();
    expect(data.profile).toBeNull();
    expect(data.tasks).toEqual([]);
    expect(data.education).toEqual([]);
    expect(data.policies.length).toBeGreaterThan(0);
  });
  it('전입일로 일정을 생성하되 과거 기한을 새 사용자에게 주지 않는다', () => {
    const tasks = onboardingTasks(profile, [], [], [], '2026-10-03');
    expect(tasks).toHaveLength(7);
    expect(tasks.every(t => t.due_date >= '2026-10-03')).toBe(true);
    expect(tasks.some(t => t.due_date === '2027-03-01')).toBe(true);
  });
  it('전입 시기 미정인 귀촌 사용자에게 탐색·생활 일정을 준다', () => {
    const tasks = onboardingTasks({ ...profile, purpose: '귀촌', move_date: null }, [], [], [], '2026-10-03');
    expect(tasks.some(t => t.title.includes('지역 일자리'))).toBe(true);
    expect(tasks.some(t => t.title.includes('전입 목표 시기'))).toBe(true);
    expect(tasks.some(t => t.title.includes('영농 교육'))).toBe(false);
  });
  it('이미 전입한 사용자는 정착 후 과제를 받는다', () => {
    const tasks = onboardingTasks({ ...profile, moved: true, move_date: '2025-01-01' }, [], [], [], '2026-10-03');
    expect(tasks.some(t => t.title.includes('전입 후'))).toBe(true);
    expect(tasks.some(t => t.due_date < '2026-10-03')).toBe(false);
  });
  it('조건을 다시 입력해도 기존 일정은 중복 생성하지 않는다', () => {
    const first = onboardingTasks(profile, [], [], [], '2026-10-03');
    const existing = first.map((t, i) => ({ ...t, id: String(i) }));
    expect(onboardingTasks(profile, [], [], existing, '2026-10-03')).toEqual([]);
  });
  it('구체화 전 제목의 자동 일정도 같은 날짜에 중복 생성하지 않는다', () => {
    const first = onboardingTasks(profile, [], [], [], '2026-10-03');
    const legacy = first.map((t, i) => ({ ...t, id: String(i), title: t.title.includes('건축물대장') ? '주거 후보지 확인하고 담당기관 상담하기' : t.title.includes('신분증·신고서') ? '전입 일정과 행정 절차 확인하기' : t.title }));
    expect(onboardingTasks(profile, [], [], legacy, '2026-10-03')).toEqual([]);
  });
  it('교육시간 부족을 정책에 연결된 준비 과제로 만든다', () => {
    const demo = sampleDemo();
    const policies = demo.policies.map(p => ({ ...p, start_date: '2026-01-01', end_date: '2026-12-31' }));
    const education = demo.education.map(e => ({ ...e, completed_date: '2026-10-01' }));
    const tasks = onboardingTasks(profile, education, policies, [], '2026-10-03');
    expect(tasks.some(t => t.title.includes('교육 60시간') && t.policy_id === 'demo-1')).toBe(true);
  });
});
