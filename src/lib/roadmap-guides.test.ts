import { describe, expect, it } from 'vitest';
import { roadmap } from './domain';
import { guideSources, resolveTaskGuide, roadmapTaskTitle } from './roadmap-guides';
import { blankProfile, type Policy, type Task } from './types';
import { demoPolicies } from './demo';

const profile = { ...blankProfile('u'), purpose: '귀농' as const, target_province: '전라남도', target_district: '담양군', move_date: '2027-03-01' };
const task = (title: string, category = '생활'): Task => ({ id: 't', user_id: 'u', title, category, due_date: '2026-10-10', completed: false, policy_id: null });
const policy: Policy = { ...demoPolicies()[0], id: 'real', is_demo: false, agency: '사업 담당부서', contact: '공고에 기재된 문의처', source_url: 'https://www.greendaero.go.kr/', documents: [{ id: 'doc', policy_id: 'real', title: '사업신청서 (별지 1)' }] };

describe('실행 가능한 로드맵 안내', () => {
  it('새 자동 일정 모두에 서류, 신청 경로, 연락처를 제공한다', () => {
    for (const item of roadmap(profile)) {
      const guide = resolveTaskGuide({ ...item, id: 'new' }, profile);
      expect(guide.steps.length).toBeGreaterThanOrEqual(3);
      expect(guide.documents.length).toBeGreaterThan(0);
      expect(guide.contacts.length).toBeGreaterThan(0);
      expect(guide.links.every(link => link.url.startsWith('https://'))).toBe(true);
      expect(guide.checkedAt).toBe('2026-10-03');
    }
  });
  it('이전 자동 일정 제목은 구체화하고 사용자가 적은 제목은 보존한다', () => {
    expect(roadmapTaskTitle(task('전입 일정과 행정 절차 확인하기'), profile)).toContain('신분증·신고서');
    expect(roadmapTaskTitle(task('다음 주 김 선생님과 농장 방문'), profile)).toBe('다음 주 김 선생님과 농장 방문');
    expect(roadmapTaskTitle(task('테스트: 부족한 교육 60시간의 인정 과정 확인'), profile)).toContain('교육 60시간 인정 과정 신청');
  });
  it('옛 전입 일정도 전입신고 구비서류·직접 신청 링크로 연결한다', () => {
    const guide = resolveTaskGuide(task('전입 및 정착 계획 점검하기'), profile);
    expect(guide.documents.find(d => d.name === '전입신고서')?.requirement).toBe('필수');
    expect(guide.documents.find(d => d.name.includes('위임장'))?.requirement).toBe('해당 시');
    expect(guide.links.some(link => link.url === guideSources.moving)).toBe(true);
  });
  it('농업경영체 등록은 생활 분류여도 신청서·농관원 연락처를 안내한다', () => {
    const guide = resolveTaskGuide(task('농업경영체 등록 상태와 영농 계획 점검'), profile);
    expect(guide.contacts[0].phone).toBe('1644-8778');
    expect(guide.documents[0].name).toContain('농업경영체 등록신청서');
    expect(guide.documents[1].requirement).toBe('해당 시');
  });
  it('교육 연결 일정은 수료 안내와 실제 정책의 문서 목록을 모두 보인다', () => {
    const guide = resolveTaskGuide({ ...task('인정되는 교육 신청', '교육'), policy_id: policy.id }, profile, policy);
    expect(guide.contacts.some(contact => contact.phone === '1811-8656')).toBe(true);
    expect(guide.documents.some(d => d.name === '사업신청서 (별지 1)')).toBe(true);
    expect(guide.links.some(link => link.url === guideSources.certificate)).toBe(true);
  });
  it('가상 정책 문서와 연락처는 실제 필수 요건으로 안내하지 않는다', () => {
    const demo = { ...policy, is_demo: true, contact: '가짜 문의처', documents: [{ id: 'x', policy_id: 'real', title: '가짜 필수서류' }] };
    const guide = resolveTaskGuide(task('정책 신청', '정책'), profile, demo);
    expect(guide.note).toContain('체험용 가상');
    expect(guide.documents.every(d => d.requirement === '공고 확인')).toBe(true);
    expect(JSON.stringify(guide)).not.toContain('가짜');
  });
  it('잘못된 정책 링크 대신 공식 탐색 경로를 안내한다', () => {
    const guide = resolveTaskGuide(task('정책 신청', '정책'), profile, { ...policy, source_url: 'javascript:alert(1)' });
    expect(guide.links[0].url).toBe(guideSources.green);
    expect(guide.contacts[0].url).toBe(guideSources.regional);
  });
  it('일반 준비 계획의 교육이라는 단어를 수강 과제로 오인하지 않는다', () => {
    const guide = resolveTaskGuide(task('전입 목표 시기·주거 예산·교육 수강 일정을 적어보기'), profile);
    expect(guide.title).toContain('상담 예약');
  });
  it('귀촌 일자리 교육에는 지역 프로그램 접수 안내를 제공한다', () => {
    const guide = resolveTaskGuide(task('지역 일자리·창업 프로그램 알아보기', '교육'), { ...profile, purpose: '귀촌' });
    expect(guide.title).toContain('생활·일자리');
    expect(guide.links[0].url).toBe(guideSources.regional);
  });
});
