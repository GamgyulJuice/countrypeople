import { CurrentRegionField, TargetRegionFields, profileWithSelectableRegions } from './RegionFields';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleHelp, GraduationCap, Leaf, MapPin, Sprout } from 'lucide-react';
import { blankProfile, type AppData, type Education, type Profile } from './lib/types';
import { completedHours, matchPolicy, safeSource, today } from './lib/domain';
import { roadmapPeriods, taskPeriod, taskStart } from './lib/task-period';
import { onboardingTasks } from './lib/onboarding';
import type { Mutation } from './lib/repository';
import './onboarding.css';
import { purposeOptions, stageOptions, stageLabel } from './lib/profile-options';
import EducationListFields from './EducationListFields';

const steps = ['나의 이주 계획', '지금의 준비 상황', '맞춤 계획 확인'];
type Props = { userId: string; data: AppData; demo: boolean; busy: boolean; error: string; save: (m: Mutation) => Promise<boolean>; done: () => void; cancel?: () => void };

export default function Onboarding({ userId, data, demo, busy, error, save, done, cancel }: Props) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(() => profileWithSelectableRegions(data.profile ? { ...data.profile } : blankProfile(userId)));
  const [undecidedDate, setUndecidedDate] = useState(!data.profile?.move_date);
  const [education, setEducation] = useState<Education[]>([]);
  const ids = useRef(new Map<string, string>());
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); window.scrollTo({ top: 0, behavior: 'instant' }); }, [step]);
  const field = <K extends keyof Profile>(key: K, value: Profile[K]) => setP(previous => ({ ...previous, [key]: value }));
  const normalized = { ...p, display_name: p.display_name.trim(), current_region: p.current_region.trim(), target_district: p.target_district.trim(), interest: p.interest.trim(), move_date: undecidedDate && !p.moved ? null : p.move_date };
  const extraEducation = education.map(record => ({ ...record, title: record.title.trim(), provider: record.provider.trim() }));
  const records = [...data.education, ...extraEducation];
  const plan = onboardingTasks(normalized, records, data.policies, data.tasks);
  const previewEnds = new Map(roadmapPeriods([...data.tasks, ...plan]).map(task => [taskStart(task), task.due_date]));
  const matches = data.policies.map(policy => ({ policy, ...matchPolicy(policy, normalized, records) }));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (step < 2) { setStep(step + 1); return; }
    const tasks = plan.map(task => {
      const key = `${task.title}|${task.due_date}`;
      if (!ids.current.has(key)) ids.current.set(key, crypto.randomUUID());
      return { ...task, id: ids.current.get(key)! };
    });
    if (await save({ kind: 'onboarding', profile: normalized, education: extraEducation, tasks })) done();
  }
  return <main className="onboarding-page">
    <header className="onboarding-header"><span className="brand"><Sprout size={29} />시골로<span className="brand-dot">.</span></span><span className="onboarding-mode">{demo ? '가입 없이 먼저 나의 계획 만들기' : '내 계정에 맞춤 계획 만들기'}</span>{cancel && <button type="button" className="text-button" disabled={busy} onClick={cancel}>기존 대시보드로 돌아가기</button>}</header>
    <div className="onboarding-layout"><aside className="onboarding-aside"><span className="eyebrow">YOUR FIRST STEP</span><h1>어떤 내일을<br />꿈꾸고 계신가요?</h1><p>당신의 상황을 알려주시면<br />맞는 정책과 준비할 일을<br />함께 찾아드릴게요.</p><ol className="onboarding-steps">{steps.map((label, i) => <li key={label} aria-current={i === step ? 'step' : undefined} className={i === step ? 'current' : i < step ? 'complete' : ''}><span>{i < step ? <Check size={16} /> : `0${i + 1}`}</span><div><strong>{label}</strong><small>{['농업 계획 · 지역 · 목표일', '교육 · 경험 · 생활 조건', '추천 정책 · 자동 일정'][i]}</small></div></li>)}</ol><div className="onboarding-tip"><Leaf size={24} /><p>아직 정하지 않은 것도 괜찮아요.<br />입력한 정보는 나중에 바꿀 수 있어요.</p></div></aside>
    <section className="onboarding-main"><div className="onboarding-step-label"><span>STEP {step + 1} OF 3</span><div>{steps.map((_, i) => <i key={i} className={i <= step ? 'filled' : ''} />)}</div></div><h2 ref={titleRef} tabIndex={-1}>{['먼저, 나의 이주 계획부터', '지금까지 얼마나 준비하셨나요?', '나만의 계획이 준비됐어요'][step]}</h2><p className="onboarding-intro">{['기본 조건으로 정책을 찾아드려요. 약 1~2분이면 충분해요.', '알고 있는 항목만 입력하세요. 모르는 조건은 추가 확인으로 안내해요.', '입력한 조건을 반영한 추천과 일정입니다. 저장하면 대시보드로 연결돼요.'][step]}</p>
      {demo && <p className="onboarding-demo"><CircleHelp size={16} />Supabase 연결 없이 사용할 수 있어요. 정보는 이 브라우저에 저장되며 정책은 체험용 예시입니다.</p>}
      <form onSubmit={submit} className="onboarding-form"><fieldset disabled={busy}>
        {step === 0 && <>
          <div className="onboarding-purpose"><span className="field-title">이주 후 농업을 할 계획인가요?</span><div role="radiogroup" aria-label="이주 후 농업 계획">{purposeOptions.map(({ value, label, detail }) => <label className={`purpose-choice ${p.purpose === value ? 'chosen' : ''}`} key={value}><input type="radio" name="purpose" value={value} checked={p.purpose === value} onChange={() => field('purpose', value)} /><span aria-hidden="true">{value === '귀농' ? <Sprout size={22} /> : value === '귀촌' ? <MapPin size={22} /> : <Leaf size={22} />}</span><strong>{label}</strong><small>{detail}</small></label>)}</div><p className="muted-text">농업을 할지 아직 결정하지 않았어도 이주 준비는 진행할 수 있어요. 아래에서 현재 이주 진행 단계를 따로 선택해 주세요.</p></div>
          <div className="form-grid"><label>이름 또는 별명 <span className="required">필수</span><input autoComplete="nickname" required maxLength={80} pattern=".*\S.*" value={p.display_name} onChange={e => field('display_name', e.target.value)} placeholder="어떻게 불러드릴까요?" /></label><label>생년월일 <span className="required">필수</span><input type="date" required max={today()} value={p.birth_date || ''} onChange={e => field('birth_date', e.target.value || null)} /></label><CurrentRegionField showRequired value={p.current_region} onChange={value => field('current_region', value)} /><label>귀농·귀촌은 어디까지 진행했나요?<select value={p.stage} onChange={e => field('stage', e.target.value)}>{stageOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label><TargetRegionFields showRequired province={p.target_province} district={p.target_district} onChange={region => setP(previous => ({ ...previous, ...region }))} /></div>
          <label className="checkbox-label"><input type="checkbox" checked={p.moved} onChange={e => { field('moved', e.target.checked); if (e.target.checked) setUndecidedDate(false); }} />이미 농촌으로 전입했어요</label>
          <div className="form-grid"><div><label>{p.moved ? '전입 완료일' : '전입 예정일'}<input type="date" required={p.moved || !undecidedDate} disabled={undecidedDate && !p.moved} min={p.moved ? undefined : today()} max={p.moved ? today() : undefined} value={p.move_date || ''} onChange={e => field('move_date', e.target.value || null)} /></label>{!p.moved && <label className="checkbox-label"><input type="checkbox" checked={undecidedDate} onChange={e => setUndecidedDate(e.target.checked)} />아직 시기를 정하지 않았어요</label>}</div><label>{p.purpose === '귀촌' ? '희망 활동·업종' : '희망 작목·업종'}<input maxLength={80} value={p.interest} onChange={e => field('interest', e.target.value)} placeholder={p.purpose === '귀촌' ? '예: 원격근무, 카페, 은퇴생활' : '예: 딸기, 스마트팜'} /></label></div>
        </>}
        {step === 1 && <>
          <div className="onboarding-section"><h3>생활과 이주 조건 <span>선택 입력</span></h3><div className="form-grid"><label>현재 직업<select value={p.occupation} onChange={e => field('occupation', e.target.value)}><option value="">아직 입력하지 않음</option>{['직장인', '공무원', '자영업', '프리랜서', '학생', '무직', '농업인', '기타'].map(v => <option key={v}>{v}</option>)}</select></label><label>이주 전 연속 도시 거주기간 (개월)<input type="number" min="0" max="1500" step="1" value={p.urban_months ?? ''} onChange={e => field('urban_months', e.target.value === '' ? null : Number(e.target.value))} placeholder="예: 36" /></label><label>세대주 여부<select value={p.household_head === null ? '' : String(p.household_head)} onChange={e => field('household_head', e.target.value === '' ? null : e.target.value === 'true')}><option value="">잘 모르겠어요 / 미입력</option><option value="true">세대주예요</option><option value="false">세대원이에요</option></select></label><label>연간 소득구간<select value={p.income_band} onChange={e => field('income_band', e.target.value)}><option value="">응답하지 않음</option>{['소득 없음', '2천만원 미만', '2천~4천만원', '4천~6천만원', '6천만원 이상'].map(v => <option key={v}>{v}</option>)}</select></label></div></div>
          {p.purpose !== '귀촌' && <div className="onboarding-section"><h3>농업 경험과 영농 기반 <span>선택 입력</span></h3><div className="form-grid"><label>독립 영농 시작일<input type="date" max={today()} value={p.independent_since || ''} onChange={e => field('independent_since', e.target.value || null)} /><small>경험이 없거나 시작 전이면 비워두세요.</small></label><label>농업경영체 등록<select value={p.entity_status} onChange={e => field('entity_status', e.target.value)}><option value="">잘 모르겠어요 / 미입력</option>{['미등록', '경영주', '공동경영주', '경영주 외 농업인'].map(v => <option key={v}>{v}</option>)}</select></label><label>농지·시설 확보<select value={p.farmland_status} onChange={e => field('farmland_status', e.target.value)}><option value="">아직 입력하지 않음</option>{['없음', '탐색 중', '임차 예정', '임차 완료', '구매 예정', '구매 완료', '가족 소유'].map(v => <option key={v}>{v}</option>)}</select></label></div></div>}
          <EducationListFields userId={userId} existing={data.education} records={education} onChange={setEducation} />
          <label className="checkbox-label"><input type="checkbox" checked={p.notifications_enabled} onChange={e => field('notifications_enabled', e.target.checked)} />앱 내 마감·일정 알림 받기</label><p className="muted-text">앱을 열었을 때 알림을 표시합니다. 이메일이나 문자는 발송하지 않아요.</p>
        </>}
        {step === 2 && <>
          {records.length > 0 && <div className="onboarding-section education-preview"><h3><GraduationCap size={18} />수료 교육 확인 <span>{records.length}개 · {completedHours(records)}시간</span></h3>{records.map(record => <div className="education-preview-row" key={record.id}><div><strong>{record.title}</strong><small>{record.provider} · {record.completed_date}</small></div><span>{record.hours}시간</span></div>)}</div>}
          <div className="onboarding-summary"><Sprout size={28} /><div><h3>{normalized.display_name} 님의 {p.purpose === '탐색 중' ? '귀농·귀촌' : p.purpose} 계획</h3><p>{p.target_province} {normalized.target_district} · {normalized.move_date || '전입 시기 탐색 중'} · {stageLabel(p.stage)}</p><p>수료 {completedHours(records)}시간 · {normalized.interest || '희망 업종 탐색 중'}</p></div></div>
          <div className="onboarding-section"><h3>조건을 반영한 정책 미리보기 <span>{matches.length}개</span></h3><p>추천은 자격 확정이 아니에요. 원문에 안내된 기관에서 최종 조건을 확인하세요.</p>{!matches.length && <p className="onboarding-existing">등록된 정책이 아직 없어요. 입력한 조건과 준비 일정은 저장되며 정책이 등록되면 맞춤 결과를 볼 수 있어요.</p>}{matches.map(({ policy, status, results }) => <article className="onboarding-policy" key={policy.id}><div><strong>{policy.title}{policy.is_demo && <span className="demo-tag">예시</span>}</strong><span className={`badge ${status === '조건상 추천' ? 'green' : 'amber'}`}>{status}</span></div><p>{results.find(r => r.status !== 'pass')?.rule.guidance || '세부 조건과 예외는 원문에서 확인하세요.'}</p>{safeSource(policy.source_url) && <a href={safeSource(policy.source_url)!} target="_blank" rel="noopener noreferrer">출처: {policy.source_name} ↗</a>}</article>)}</div>
          <div className="onboarding-section"><h3><CalendarDays size={18} />자동으로 추가될 일정 <span>{plan.length}개</span></h3><p>{normalized.move_date ? '전입일과 준비 조건에 맞춰 만들었어요. 이미 지난 준비 시점은 지금부터 진행하도록 조정했어요.' : '전입일이 아직 없어 오늘부터 시작하는 탐색 일정을 만들었어요.'} 시작일부터 다음 할 일의 시작 전날까지 이어지는 준비 구간입니다. 마지막 항목만 종료일을 직접 지정할 수 있어요.</p>{data.tasks.length > 0 && <p className="onboarding-existing">기존 할 일 {data.tasks.length}개는 유지합니다. 같은 제목·날짜의 일정은 중복 추가하지 않아요.</p>}{plan.map(t => <div className="onboarding-task" key={`${t.title}|${t.due_date}`}><span>{taskPeriod({ ...t, due_date: previewEnds.get(taskStart(t)) || t.due_date })}</span><strong>{t.title}</strong></div>)}{!plan.length && <p>추가할 새 일정이 없어요. 기존 일정은 그대로 유지돼요.</p>}</div>
        </>}
      </fieldset>{error && <p role="alert" className="error onboarding-error">저장하지 못했어요. 입력 내용은 유지됩니다. 다시 시도해 주세요.<br />{error}</p>}<div className="onboarding-actions">{step > 0 ? <button className="button secondary" type="button" disabled={busy} onClick={() => setStep(step - 1)}><ArrowLeft size={16} />이전</button> : <span>언제든 프로필에서 수정할 수 있어요.</span>}<button className="button" type="submit" disabled={busy}>{busy ? '맞춤 계획 저장 중…' : step === 0 ? '준비 조건 입력하기' : step === 1 ? '맞춤 계획 미리보기' : '내 맞춤 계획 시작하기'}<ArrowRight size={16} /></button></div></form>
    </section></div><footer className="onboarding-footer">시골로 · 당신의 새로운 시작을 함께합니다.</footer>
  </main>;
}
