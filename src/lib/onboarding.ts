import { addDays, completedHours, matchPolicy, roadmap, today } from './domain';
import type { Education, Policy, Profile, Task } from './types';
import { taskStart } from './task-period';
import { roadmapTaskTitle } from './roadmap-guides';

export function onboardingTasks(profile: Profile, education: Education[], policies: Policy[], existing: Task[], reference = today()): Omit<Task, 'id'>[] {
  const region = `${profile.target_province} ${profile.target_district}`.trim() || '희망 지역';
  const task = (title: string, days: number, category: string, policyId: string | null = null): Omit<Task, 'id'> => ({ user_id: profile.user_id, title, start_date: addDays(reference, days), due_date: addDays(reference, days), category, policy_id: policyId, completed: false });
  let tasks = profile.moved ? [
    task(`${region} 전입 후 지원사업 신청서·접수처·마감일 확인하기`, 7, '정책'),
    task(profile.purpose === '귀농' ? '농업경영체 등록신청서·영농 증빙 준비하고 관할 농관원에 문의하기' : `${region} 지역 생활·일자리 프로그램 모집공고와 신청서 찾기`, 14, '생활'),
    task('한 달 생활비·주거·교육 수료 현황을 정리하고 다음 일정 정하기', 30, '생활'),
  ] : profile.move_date ? roadmap(profile).map((item, index) => {
    const due_date = item.due_date < reference ? addDays(reference, index + 1) : item.due_date;
    return { ...item, due_date, start_date: due_date };
  }) : [
    task(`${region} 귀농귀촌 상담센터 연락처 확인하고 상담 예약하기`, 7, '탐색'),
    task(profile.purpose === '귀농' ? '농업교육포털에서 귀농·영농 입문 교육 신청하기' : profile.purpose === '귀촌' ? `${region} 지역 일자리·생활 프로그램 모집공고와 신청서 찾기` : '그린대로에서 살아보기 프로그램 일정·참가 조건 비교하기', 14, profile.purpose === '귀농' ? '교육' : '탐색'),
    task('전입 목표 시기·주거 예산·교육 수강 일정을 적어보기', 30, '생활'),
  ];
  if (profile.interest.trim()) tasks.push(task(`${region} ${profile.interest.trim()} 프로그램 모집공고·신청서·담당 연락처 찾기`.slice(0, 240), 10, '탐색'));
  for (const policy of policies) {
    const match = matchPolicy(policy, profile, education, reference);
    if (['현재 조건 불일치', '모집 마감'].includes(match.status)) continue;
    const training = match.results.find(r => r.rule.field === 'education_hours' && r.status === 'gap' && r.rule.operator === 'gte' && typeof r.rule.value === 'number');
    if (training) {
      const gap = Math.max(0, Number(training.rule.value) - completedHours(education, reference));
      const item = task(`${policy.title}: 부족한 교육 ${gap}시간 인정 과정 신청·수료증 준비`.slice(0, 240), 7, '교육', policy.id);
      if (policy.end_date && policy.end_date < item.due_date) { item.due_date = policy.end_date; item.start_date = policy.end_date; }
      tasks.push(item);
    }
  }
  const keys = new Set(existing.map(t => `${roadmapTaskTitle(t, profile)}|${taskStart(t)}`));
  tasks = tasks.filter(t => {
    const key = `${t.title}|${taskStart(t)}`;
    if (keys.has(key)) return false;
    keys.add(key); return true;
  });
  return tasks.sort((a, b) => a.due_date.localeCompare(b.due_date));
}
