import { CurrentRegionField, TargetRegionFields, profileWithSelectableRegions } from './RegionFields';
import { createContext, useContext, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowRight, Bell, Bookmark, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, ExternalLink, GraduationCap, Leaf, LoaderCircle, LogOut, MapPin, Plus, Search, Settings2, Sprout, Trash2, TrendingUp, X, Pencil, ClipboardList, Mail, Wheat } from 'lucide-react';
import { isDemo, configError, supabase } from './lib/supabase';
import { loadData, mutate, type Mutation } from './lib/repository';
import { addDays, completedHours, daysUntil, matchPolicy, roadmap, safeSource, taskProgress, today } from './lib/domain';
import { blankProfile, emptyData, type AppData, type Education, type Policy, type Profile, type Task } from './lib/types';
import Onboarding from './Onboarding';
import { roadmapPeriods, taskPeriod, taskStart, taskStatus } from './lib/task-period';
import { weeklyRoadmap, type WeeklyRoadmap } from './lib/weekly-tasks';
import TaskCalendar from './TaskCalendar';
import { purposeOptions, stageOptions } from './lib/profile-options';
import RoadmapTaskForm from './RoadmapTaskForm';
import { RoadmapGuide } from './RoadmapGuide';
import { isEducationTask } from './lib/education-roadmap';
import { roadmapTaskTitle } from './lib/roadmap-guides';
import PortalHeader from './portal/PortalHeader';
import type { WorkspacePage } from './portal/navigation';
import './roadmap-guide.css';

const MutationError = createContext('');
const pageTitles: Record<WorkspacePage, string> = { home: '나의 대시보드', policies: '맞춤 정책 찾기', tasks: '나의 로드맵', education: '교육 이력', briefing: '이번 주 브리핑', profile: '나의 프로필' };
const categories = ['전체', '창업·자금', '정착지원', '주거·생활', '교육', '농지', '일자리'];
const message = (e: unknown) => e instanceof Error ? e.message : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
function deadline(date: string | null) { if (!date) return '상시 / 원문 확인'; const n = daysUntil(date); return n < 0 ? '모집 마감' : n === 0 ? '오늘 마감' : `D-${n}`; }
function Empty({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className="empty"><Sprout size={34} /><h3>{title}</h3><p>{detail}</p>{action}</div>; }
function Button({ children, onClick, disabled, secondary = false }: { children: ReactNode; onClick?: () => void; disabled?: boolean; secondary?: boolean }) { return <button className={secondary ? 'button secondary' : 'button'} disabled={disabled} onClick={onClick}>{children}</button>; }
function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const error = useContext(MutationError);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} onCancel={e => { e.preventDefault(); close(); }} className="modal" aria-label={title}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="닫기"><X /></button></div>{error && <p role="alert" className="error modal-error">{error}</p>}{children}</dialog>;
}

function Auth({ initialSignup = false, onPortalHome, onNavigate, activePage }: { initialSignup?: boolean; onPortalHome: () => void; onNavigate: (page: WorkspacePage) => void; activePage: WorkspacePage }) {
  const [signup, setSignup] = useState(initialSignup), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  useEffect(() => { setSignup(initialSignup); }, [initialSignup]);
  function switchAuth(next = false) { setSignup(next); setError(''); setNotice(''); }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); setError(''); setNotice('');
    try {
      const credentials = { email: String(form.get('email')).trim(), password: String(form.get('password')) };
      const result = signup ? await supabase!.auth.signUp(credentials) : await supabase!.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      if (signup && !result.data.session) setNotice('가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.');
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <div className="workspace-auth"><PortalHeader onNavigate={onNavigate} onHome={onPortalHome} onAuth={switchAuth} activePage={activePage} /><main className="auth-page" id="site-content"><div className="auth-card"><div className="auth-art"><span className="auth-art-label"><Sprout size={20} /> 새로운 일상으로 가는 길</span><h1>나의 시작을 찾는 곳,<br />시골로</h1><p>나에게 맞는 정책부터 매일의 작은 준비까지.<br />당신의 귀농·귀촌 여정을 함께합니다.</p><span className="auth-photo-caption">자연과 가까워지는 새로운 일상</span></div><div className="auth-form"><span className="eyebrow">시골로 회원 서비스</span><h2>{signup ? '시골로 여정 시작하기' : '로그인'}</h2><p>{signup ? '계정을 만들고 나만의 귀농·귀촌 준비를 시작하세요.' : '내 준비 상황을 안전하게 저장하고 이어가세요.'}</p><form onSubmit={submit}><label>이메일<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><label>비밀번호<input name="password" type="password" minLength={8} autoComplete={signup ? 'new-password' : 'current-password'} required placeholder="8자 이상 입력" /></label>{error && <p role="alert" className="error">{error}</p>}{notice && <p role="status" className="success">{notice}</p>}<button className="button" disabled={busy}>{busy ? '처리 중…' : signup ? '회원가입' : '로그인'}<ArrowRight size={17} /></button></form><button className="text-button auth-switch" onClick={() => switchAuth(!signup)}>{signup ? '이미 계정이 있나요? 로그인' : '처음 오셨나요? 회원가입'}</button><small>정책 신청은 원문에 안내된 기관에서 직접 진행합니다.</small></div></div></main></div>;
}

export default function App({ initialPage = 'home', onPortalHome, initialSignup = false }: { initialPage?: WorkspacePage; onPortalHome?: () => void; initialSignup?: boolean }) {
  const [userId, setUserId] = useState<string | null>(isDemo ? 'demo-user' : null);
  const [booting, setBooting] = useState(!isDemo && !configError);
  const [data, setData] = useState<AppData>(emptyData), [owner, setOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [version, setVersion] = useState(0), [page, setPage] = useState<WorkspacePage>(initialPage);
  const [bellOpen, setBellOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => new URLSearchParams(window.location.search).get('onboarding') === '1');
  const [selected, setSelected] = useState<Policy | null>(null), [taskEditor, setTaskEditor] = useState<Task | 'new' | null>(null), [eduEditor, setEduEditor] = useState<Education | 'new' | null>(null);
  const [query, setQuery] = useState(''), [category, setCategory] = useState('전체'), [savedOnly, setSavedOnly] = useState(false), [taskFilter, setTaskFilter] = useState('전체');
  const [taskView, setTaskView] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(today);
  const generation = useRef(0), locked = useRef(false);
  useEffect(() => { setPage(initialPage); setBellOpen(false); }, [initialPage]);
  useEffect(() => {
    if (!supabase) return;
    let live = true, authEventReceived = false;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      if (live) { setUserId(session?.user.id ?? null); setBooting(false); }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!live) return;
      if (error) setError(error.message);
      if (!authEventReceived) setUserId(data.session?.user.id ?? null);
      setBooting(false);
    }).catch(e => { if (live) { setError(message(e)); setBooting(false); } });
    return () => { live = false; subscription.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    const current = ++generation.current;
    setData(emptyData); setOwner(null); setSelected(null); setTaskEditor(null); setEduEditor(null); setLoadError(''); setError(''); setNotice('');
    locked.current = false; setBusy(false);
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    loadData(userId).then(value => { if (generation.current === current) { setData(value); setOwner(userId); } }).catch(e => { if (generation.current === current) setLoadError(message(e)); }).finally(() => { if (generation.current === current) setLoading(false); });
    return () => { generation.current++; };
  }, [userId, version]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(id); }, [notice]);
  const save = useCallback(async (mutation: Mutation) => {
    if (locked.current || !userId || owner !== userId) return false;
    locked.current = true; setBusy(true); setError(''); const current = generation.current;
    try {
      const result = await mutate(data, userId, mutation);
      if (current !== generation.current) return false;
      setData(result); setNotice(isDemo ? '이 브라우저의 데모에 저장했습니다.' : '저장했습니다.'); return true;
    } catch (e) { if (current === generation.current) setError(message(e)); return false; }
    finally { if (current === generation.current) { locked.current = false; setBusy(false); } }
  }, [data, userId, owner]);
  const go = (next: WorkspacePage) => { setPage(next); setBellOpen(false); window.location.hash = `#my/${next}`; };
  const portalHome = onPortalHome || (() => { window.location.hash = '#'; });
  if (configError) return <main className="center-state"><CircleHelp size={36} /><h1>연결 설정을 확인해 주세요</h1><p role="alert">{configError}</p><p>.env.example의 설명에 따라 환경변수를 설정하고 앱을 다시 시작하세요.</p></main>;
  if (booting) return <main className="center-state"><LoaderCircle className="spin" /><p>로그인 상태를 확인하고 있어요…</p></main>;
  if (!userId) return <><Auth initialSignup={initialSignup} onPortalHome={portalHome} onNavigate={go} activePage={page} />{error && <div role="alert" className="toast error">{error}</div>}</>;
  const profile = owner === userId ? data.profile : null;
  function finishOnboarding() {
    setShowOnboarding(false); go('home'); setError('');
    const url = new URL(window.location.href);
    url.searchParams.delete('onboarding'); window.history.replaceState({}, '', url);
  }
  if (!loading && !loadError && owner === userId && (!profile || showOnboarding)) {
    return <div className="workspace-onboarding"><div className="onboarding-portal-return"><button className="text-button" onClick={portalHome}><ArrowRight size={16} />시골로 홈으로</button></div><Onboarding key={userId} userId={userId} data={data} demo={isDemo} busy={busy} error={error} save={save} done={finishOnboarding} cancel={profile ? finishOnboarding : undefined} /></div>;
  }
  const sortedTasks = roadmapPeriods(data.tasks).map(task => profile ? { ...task, title: roadmapTaskTitle(task, profile) } : task);
  const week = weeklyRoadmap(data.tasks);
  const visibleTasks = sortedTasks.filter(t => taskFilter === '전체' || (taskFilter === '완료' ? t.completed : !t.completed));
  const upcoming = sortedTasks.filter(t => !t.completed && taskStart(t) <= addDays(today(), 7));
  const matched = data.policies.map(policy => ({ policy, ...matchPolicy(policy, profile, data.education) }));
  const recommendations = [...matched].sort((a, b) => ['조건상 추천', '추가 확인 필요', '준비 후 검토', '모집 예정', '현재 조건 불일치', '모집 마감'].indexOf(a.status) - ['조건상 추천', '추가 확인 필요', '준비 후 검토', '모집 예정', '현재 조건 불일치', '모집 마감'].indexOf(b.status));
  const savedIds = new Set(data.bookmarks.map(b => b.policy_id));
  const policyAlerts = data.policies.filter(p => savedIds.has(p.id) && p.end_date && daysUntil(p.end_date) >= 0 && daysUntil(p.end_date) <= 30);
  const alertCount = profile?.notifications_enabled ? policyAlerts.length + upcoming.length : 0;
  const filteredPolicies = recommendations.filter(({ policy }) => (!savedOnly || savedIds.has(policy.id)) && (category === '전체' || policy.category === category) && `${policy.title} ${policy.region} ${policy.summary}`.toLowerCase().includes(query.toLowerCase()));
  async function generateRoadmap() {
    if (!profile?.move_date) { go('profile'); return; }
    const existing = new Set(data.tasks.map(t => `${roadmapTaskTitle(t, profile)}|${taskStart(t)}`));
    const tasks = roadmap(profile).filter(t => !existing.has(`${t.title}|${taskStart(t)}`)).map(t => ({ ...t, id: crypto.randomUUID() }));
    if (!tasks.length) { setNotice('목표일 기준 로드맵이 이미 추가되어 있습니다.'); return; }
    await save({ kind: 'tasks', value: tasks });
  }
  function addEducationTask() {
    setTaskEditor({ id: crypto.randomUUID(), user_id: userId!, title: '', start_date: today(), due_date: today(), completed: false, category: '교육', policy_id: null, education_provider: '', education_hours: 1, education_completed_date: null, education_certificate: false });
  }
  function policyCard(policy: Policy) {
    const status = matchPolicy(policy, profile, data.education).status;
    return <article className="policy-card" key={policy.id}><div className="card-top"><span className="category-icon">{policy.category === '교육' ? <GraduationCap /> : policy.category === '주거·생활' ? <MapPin /> : <Wheat />}</span><button className={`icon-button bookmark ${savedIds.has(policy.id) ? 'active' : ''}`} aria-label={`${policy.title} ${savedIds.has(policy.id) ? '저장 해제' : '저장'}`} aria-pressed={savedIds.has(policy.id)} disabled={busy} onClick={() => save({ kind: 'bookmark', policyId: policy.id, saved: !savedIds.has(policy.id) })}><Bookmark size={19} /></button></div><div className="meta">{policy.region} <span>·</span> {policy.category}{policy.is_demo && <span className="demo-tag">예시</span>}</div><h3><button className="title-button" onClick={() => setSelected(policy)}>{policy.title}</button></h3><p>{policy.summary}</p><span className={`badge ${status === '조건상 추천' ? 'green' : status === '모집 마감' || status === '현재 조건 불일치' ? 'muted' : 'amber'}`}>{status === '조건상 추천' ? <CheckCircle2 size={13} /> : <CircleHelp size={13} />}{status}</span><div className="policy-foot"><span className={policy.end_date && daysUntil(policy.end_date) <= 7 ? 'urgent' : ''}>{deadline(policy.end_date)}</span><button className="text-button" onClick={() => setSelected(policy)}>자세히 보기 <ArrowRight size={15} /></button></div></article>;
  }
  function taskRow(task: Task) {
    const original = data.tasks.find(row => row.id === task.id) || task;
    task = profile ? { ...task, title: roadmapTaskTitle(original, profile) } : task;
    const left = daysUntil(task.due_date);
    const course = isEducationTask(original);
    return <div className="task-entry" key={task.id}><div className={`task-row ${task.completed ? 'done' : ''}`}><button className="check-button" role="checkbox" aria-checked={task.completed} aria-label={`${task.title} 완료`} disabled={busy} onClick={() => save({ kind: 'task', value: { ...original, completed: !task.completed } })}>{task.completed && <Check size={15} />}</button><div className="task-copy"><strong>{task.title}</strong><span>{task.category} · {taskPeriod(task)}</span>{course && <span className="course-meta">{original.education_provider} · {original.education_hours}시간 · {task.completed ? `수료 ${original.education_completed_date || ''} · 이력 자동 기록` : '완료 시 수료 이력 자동 기록'}</span>}</div><span className={`small-badge ${left < 0 && !task.completed ? 'overdue' : ''}`}>{taskStatus(task, today())}</span><button className="icon-button" aria-label={`${task.title} 수정`} disabled={busy} onClick={() => setTaskEditor(original)}><Pencil size={15} /></button><button className="icon-button" aria-label={`${task.title} 삭제`} disabled={busy} onClick={() => { if (window.confirm(course && task.completed ? '이 교육 일정을 삭제하면 자동 생성된 수료 기록과 합산 시간도 삭제됩니다. 삭제할까요?' : '이 할 일을 삭제할까요?')) void save({ kind: 'deleteTask', id: task.id }); }}><Trash2 size={15} /></button></div>{page === 'tasks' && profile && <details className="task-guide-disclosure"><summary>준비서류 · 연락처 · 신청 사이트</summary><RoadmapGuide task={original} profile={profile} policy={data.policies.find(policy => policy.id === original.policy_id)} /></details>}</div>;
  }
  return <MutationError.Provider value={error}><div className="app-shell workspace-shell">
    <PortalHeader onNavigate={go} onHome={portalHome} onAuth={() => go('profile')} userName={profile?.display_name || '새로운 이웃'} activePage={page} />
    <div className="main-shell"><header className="topbar workspace-utility"><div className="breadcrumb"><button onClick={portalHome}>시골로</button><ChevronRight size={13} />나의 여정 <ChevronRight size={13} /><strong>{pageTitles[page]}</strong></div><div className="topbar-right"><span className="today">{today().replaceAll('-', '. ')}</span>{isDemo && <span className="connection demo"><i />체험 모드</span>}<button className="icon-button notification-button" aria-label={`알림 ${alertCount}개`} aria-expanded={bellOpen} onClick={() => setBellOpen(!bellOpen)}><Bell size={19} />{alertCount > 0 && <i />}</button><button className="icon-button" aria-label="프로필 및 설정" onClick={() => go('profile')}><Settings2 size={18} /></button>{!isDemo && <button className="icon-button" disabled={busy} aria-label="로그아웃" onClick={async () => { const { error } = await supabase!.auth.signOut(); if (error) setError(error.message); }}><LogOut size={17} /></button>}</div></header>
      {bellOpen && <section className="notification-panel"><h3>다가오는 일정 <span>{alertCount}</span></h3><p className="muted-text">앱 내 알림 · 마감 30일 이내 관심 정책과 진행 중·7일 이내 시작할 일</p>{!profile?.notifications_enabled ? <p>프로필 설정에서 앱 내 알림을 켜 주세요.</p> : !alertCount ? <p>지금 확인할 알림이 없어요.</p> : <>{policyAlerts.map(p => <button key={p.id} onClick={() => { setSelected(p); setBellOpen(false); }}><Bookmark size={17} /><span>{p.title}<small>{deadline(p.end_date)} · 원문 일정 확인</small></span></button>)}{upcoming.map(t => <button key={t.id} onClick={() => go('tasks')}><CalendarDays size={17} /><span>{t.title}<small>{taskPeriod(t)}</small></span></button>)}</>}</section>}
      <main className="content" id="site-content">
        {isDemo && <div className="demo-banner"><span><Sprout size={15} />체험용 데이터입니다. 정책·기간·조건은 실제 공고가 아니며 변경 사항은 이 브라우저에만 저장됩니다.</span></div>}
        {profile && <div className="onboarding-reentry"><button className="text-button" disabled={busy} onClick={() => { setError(''); setShowOnboarding(true); setBellOpen(false); }}>내 조건 다시 입력하기 <ArrowRight size={14} /></button></div>}
        {error && <div className="error inline-alert" role="alert"><span>{error}</span><button className="icon-button" aria-label="오류 닫기" onClick={() => setError('')}><X size={16} /></button></div>}
        {loading || (!loadError && owner !== userId) ? <div className="loading-state" role="status"><LoaderCircle className="spin" /><p>나의 여정을 불러오고 있어요…</p></div> : loadError ? <Empty title="데이터를 불러오지 못했어요" detail={`${loadError} · SQL migration 적용 및 로그인 상태를 확인해 주세요.`} action={<Button onClick={() => setVersion(v => v + 1)}>다시 시도</Button>} /> : !profile ? <><div className="page-heading"><div><span className="eyebrow">FIRST STEP</span><h1>당신의 새로운 시작을 알려주세요</h1><p>기본 정보를 저장하면 맞춤 정책과 준비 일정을 살펴볼 수 있어요.</p></div></div><ProfileForm initial={blankProfile(userId)} busy={busy} save={value => save({ kind: 'profile', value })} /></> : <>
          {page === 'home' && <>
            <div className="page-heading"><div><span className="eyebrow">A LITTLE CLOSER TO YOUR NEW LIFE</span><h1>{profile.display_name || '새로운 이웃'} 님, 오늘도 한 걸음 더 <span className="heading-leaf">✳</span></h1><p>차근차근 준비하는 귀농·귀촌, 시골로가 함께할게요.</p></div><button className="button secondary" onClick={() => go('profile')}>내 계획 수정 <ArrowRight size={15} /></button></div>
            <section className="journey-hero"><div className="hero-copy"><span className="hero-label"><span />나의 {profile.purpose === '탐색 중' ? '귀농·귀촌' : profile.purpose} 여정</span><h2>{profile.target_district || '새로운 일상'}에서 시작할<br />나의 다음 이야기</h2><div className="hero-meta"><span><MapPin size={15} />{`${profile.target_province} ${profile.target_district}`.trim() || '희망 지역을 설정해 주세요'}</span><span><CalendarDays size={15} />{profile.move_date || '전입 목표일 미정'}</span></div><button onClick={() => go('tasks')}>나의 로드맵 보기 <ArrowRight size={16} /></button></div><div className="workspace-hero-photo" aria-hidden="true" /><div className="hero-count"><small>{profile.moved ? '전입 후' : '새로운 시작까지'}</small><strong>{profile.move_date ? daysUntil(profile.move_date) >= 0 ? `D-${daysUntil(profile.move_date)}` : `D+${-daysUntil(profile.move_date)}` : 'D-?'}</strong><span>{profile.interest || '나만의 계획을 만들어 보세요'}</span></div></section>
            <section className="stats"><article><span className="stat-icon sage"><TrendingUp size={20} /></span><div><p>나의 준비도</p><strong>{taskProgress(data.tasks)}<small>%</small></strong><span>등록한 할 일 완료 기준</span></div><div className="mini-progress"><i style={{ width: `${taskProgress(data.tasks)}%` }} /></div></article><article><span className="stat-icon beige"><Sprout size={20} /></span><div><p>조건상 추천 정책</p><strong>{matched.filter(p => p.status === '조건상 추천').length}<small>개</small></strong><span>최종 자격은 원문 확인</span></div></article><article><span className="stat-icon lavender"><ClipboardList size={20} /></span><div><p>이번 주 할 일</p><strong>{week.tasks.length}<small>개</small></strong><span>{week.completedCount}개 완료 · {week.pendingCount}개 남음</span></div></article><article><span className="stat-icon peach"><GraduationCap size={20} /></span><div><p>기록한 수료시간</p><strong>{completedHours(data.education)}<small>시간</small></strong><span>정책별 인정 여부 확인</span></div></article></section>
            <div className="section-heading"><div><h2>나에게 맞는 정책 <span className="count">{data.policies.length}</span></h2><p>내 상황에 맞춰 살펴볼 정책과 준비 조건이에요.</p></div><button className="text-button" onClick={() => go('policies')}>전체 보기 <ArrowRight size={16} /></button></div>
            {data.policies.length ? <div className="policy-grid">{recommendations.slice(0, 3).map(({ policy }) => policyCard(policy))}</div> : <Empty title="아직 등록된 정책이 없어요" detail="운영자가 출처와 조건을 확인한 정책을 등록하면 여기에 나타납니다." />}
            <div className="bottom-grid"><section className="panel weekly-tasks" aria-label="이번 주 할 일"><div className="section-heading"><div><h2>이번 주 할 일</h2><p>{week.start} ~ {week.end} · 로드맵과 연동</p></div><button className="text-button" onClick={() => go('tasks')}>전체 보기 <ChevronRight size={16} /></button></div>{week.tasks.length ? week.tasks.map(taskRow) : <Empty title="이번 주 일정이 비어 있어요" detail="로드맵에 이번 주와 겹치는 준비 구간이 없어요. 할 일을 추가하거나 시작일을 확인해 보세요." />}<button className="add-inline" onClick={() => setTaskEditor('new')}><Plus size={17} /> 새로운 할 일 추가</button></section><section className="weekly-card"><span className="eyebrow">WEEKLY CHECK-IN</span><span className="weekly-art"><Leaf size={36} /></span><h2>한 주의 준비를<br />돌아볼 시간이에요</h2><p>이번 주에 한 일과 다음 걸음을<br />짧게 기록해 보세요.</p><button className="button secondary" onClick={() => go('briefing')}>이번 주 체크인 <ArrowRight size={16} /></button></section></div>
          </>}
          {page === 'policies' && <><div className="page-heading"><div><span className="eyebrow">FIND YOUR NEXT OPPORTUNITY</span><h1>나에게 맞는 정책 찾기</h1><p>추천은 준비를 돕는 참고 정보예요. 신청은 원문에 안내된 기관에서 직접 진행해 주세요.</p></div></div><div className="filter-bar"><label className="search"><Search size={18} /><input aria-label="정책 검색" placeholder="정책명, 지역, 키워드로 검색" value={query} onChange={e => setQuery(e.target.value)} /></label><button className={`button secondary ${savedOnly ? 'saved-selected' : ''}`} aria-pressed={savedOnly} onClick={() => setSavedOnly(!savedOnly)}><Bookmark size={16} />관심 정책 {data.bookmarks.length}</button></div><div className="tabs">{categories.map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div><p className="result-count">총 <strong>{filteredPolicies.length}개</strong>의 정책 · {profile.target_province} {profile.target_district || '희망 지역 미설정'}</p>{filteredPolicies.length ? <div className="policy-grid">{filteredPolicies.map(({ policy }) => policyCard(policy))}</div> : <Empty title="조건에 맞는 정책이 없어요" detail="검색 조건을 바꾸거나 다른 정책을 관심 정책으로 저장해 보세요." />}<p className="disclaimer">실제 자격 및 선정 여부는 사업 시행기관의 심사를 통해 결정됩니다. 추천은 입력한 정보와 등록된 규칙에 따른 참고 결과입니다.</p></>}
          {page === 'tasks' && <>
            <div className="page-heading"><div><span className="eyebrow">ONE STEP AT A TIME</span><h1>나의 정착 로드맵</h1><p>항목별 준비서류·연락처·신청 사이트를 확인하고, 교육 수료까지 함께 관리하세요.</p></div><div className="page-actions"><Button secondary onClick={addEducationTask}><GraduationCap size={17} />교육 로드맵에 추가</Button><Button onClick={() => setTaskEditor('new')}><Plus size={17} />할 일 추가</Button></div></div>
            <div className="roadmap-summary panel"><div><h2>준비는 {taskProgress(data.tasks)}% 진행 중</h2><p>{data.tasks.filter(t => t.completed).length} / {data.tasks.length}개 완료 · 전입 목표 {profile.move_date || '미정'}</p></div><Button secondary disabled={busy} onClick={generateRoadmap}>목표일로 로드맵 생성 <ArrowDown size={16} /></Button></div>
            <div className="roadmap-education-summary" aria-label="교육시간 집계"><GraduationCap size={22} /><div><strong>총 수료시간 {completedHours(data.education)}시간</strong><span>미완료 교육 {data.tasks.filter(task => isEducationTask(task) && !task.completed).reduce((sum, task) => sum + Number(task.education_hours), 0)}시간 · 교육 완료 시 자동 합산</span></div><button className="text-button" onClick={() => go('education')}>교육 이력 보기 <ArrowRight size={16} /></button></div>
            <p className="muted-text">각 할 일은 시작일부터 다음 할 일이 시작되기 전날까지 이어집니다. 같은 날 시작하는 항목은 같은 구간으로 표시하며, 마지막 항목은 지정한 종료일까지 표시합니다. 완료 여부와 관계없이 전체 일정 순서로 계산합니다.</p>
            <div className="roadmap-controls">
              <div className="tabs" role="group" aria-label="할 일 상태">{['전체', '진행 중', '완료'].map(t => <button key={t} className={taskFilter === t ? 'active' : ''} aria-pressed={taskFilter === t} onClick={() => setTaskFilter(t)}>{t}</button>)}</div>
              <div className="roadmap-view-toggle" role="group" aria-label="로드맵 보기 방식">
                <button aria-label="목록 보기" aria-pressed={taskView === 'list'} onClick={() => setTaskView('list')}><ClipboardList size={16} />목록</button>
                <button aria-label="캘린더 보기" aria-pressed={taskView === 'calendar'} onClick={() => setTaskView('calendar')}><CalendarDays size={16} />캘린더</button>
              </div>
            </div>
            {taskView === 'list'
              ? <section className="panel task-list">{visibleTasks.length ? visibleTasks.map(taskRow) : <Empty title="여기에 표시할 할 일이 없어요" detail="직접 할 일을 추가하거나 목표일 기준 로드맵을 생성해 보세요." />}</section>
              : <TaskCalendar tasks={visibleTasks} selectedDate={calendarDate} onSelectDate={setCalendarDate} filtered={taskFilter !== '전체'} busy={busy} renderTask={taskRow} onEdit={task => setTaskEditor(data.tasks.find(row => row.id === task.id) || task)}
                  onAdd={date => setTaskEditor({ id: crypto.randomUUID(), user_id: userId, title: '', start_date: date, due_date: date, completed: false, category: '생활', policy_id: null })} />}
          </>}
          {page === 'education' && <>
            <div className="page-heading"><div><span className="eyebrow">LEARN, GROW, BEGIN</span><h1>차곡차곡 쌓이는 교육 이력</h1><p>로드맵에서 교육을 완료하면 수료 이력과 총 시간이 자동으로 기록돼요.</p></div><div className="page-actions"><Button onClick={addEducationTask}><GraduationCap size={17} />교육 로드맵에 추가</Button><Button secondary onClick={() => setEduEditor('new')}><Plus size={17} />수료 기록 추가</Button></div></div>
            <div className="education-banner"><GraduationCap size={38} /><div><span>기록한 총 수료시간</span><h2>{completedHours(data.education)} <small>시간</small></h2></div><p>자동 기록 {completedHours(data.education.filter(record => !!record.task_id))}시간 · 직접 입력 {completedHours(data.education.filter(record => !record.task_id))}시간<br />정책별 인정 기관·교육 유효기간은 원문을 확인해 주세요.</p></div>
            <section className="panel planned-education" aria-label="수강 예정 및 진행 중 교육"><div className="section-heading"><div><h2>수강 예정 · 진행 중</h2><p>수료 후 완료를 체크하면 오늘 날짜로 기록됩니다. 다른 수료일은 수정에서 입력하세요.</p></div></div>{sortedTasks.filter(task => isEducationTask(task) && !task.completed).length ? sortedTasks.filter(task => isEducationTask(task) && !task.completed).map(taskRow) : <p className="muted-text">교육 로드맵에 수강할 교육명·기관·시간을 추가해 보세요.</p>}</section>
            <section className="panel"><h2>수료한 교육</h2>{data.education.length ? data.education.map(e => <div className="education-row" key={e.id}><span className="category-icon"><GraduationCap /></span><div className="task-copy"><strong>{e.title}</strong><span>{e.provider} · {e.completed_date} · {e.certificate ? '수료증 보유' : '수료증 미등록'}</span><span className="course-meta">{e.task_id ? '로드맵에서 자동 기록' : '직접 입력한 수료 기록'}</span></div><b>{e.hours}시간</b><button className="icon-button" aria-label={`${e.title} 수정`} disabled={busy} onClick={() => setEduEditor(e)}><Pencil size={16} /></button><button className="icon-button" aria-label={`${e.title} 삭제`} disabled={busy} onClick={() => { if (window.confirm(e.task_id ? '이 수료 기록을 삭제하면 연결된 교육 일정이 미완료로 바뀌고 총 시간에서도 빠집니다. 삭제할까요?' : '이 교육 기록을 삭제할까요? 추천 결과에도 반영됩니다.')) void save({ kind: 'deleteEducation', id: e.id }); }}><Trash2 size={16} /></button></div>) : <Empty title="첫 교육 이력을 남겨보세요" detail="로드맵의 교육을 완료하거나 이미 수료한 교육을 직접 추가해 보세요." />}</section>
            <p className="muted-text">외부 교육 사이트의 수료 내역을 자동 조회하지 않습니다. 직접 확인한 수료만 완료해 주세요.</p>
          </>}
          {page === 'briefing' && <Briefing key={week.start} data={data} week={week} busy={busy} save={save} taskRow={taskRow} />}
          {page === 'profile' && <><div className="page-heading"><div><span className="eyebrow">YOUR OWN RURAL PLAN</span><h1>내 상황에 맞게, 나의 프로필</h1><p>알고 있는 정보만 입력해 주세요. 비어 있는 조건은 ‘추가 확인 필요’로 안내합니다.</p></div></div><ProfileForm initial={profile} busy={busy} save={value => save({ kind: 'profile', value })} /></>}
        </>}
        <footer><span><Sprout size={15} />시골로 · 새로운 일상을 향한 한 걸음</span><span>정책 추천 및 정착 준비 서비스 · 신청 대행 없음</span></footer>
      </main>
    </div>
    {notice && <div className="toast" role="status"><CheckCircle2 size={18} />{notice}</div>}
    {selected && <Modal title={selected.title} close={() => setSelected(null)}><PolicyDetail policy={selected} data={data} busy={busy} save={save} addTask={() => { setSelected(null); setTaskEditor({ id: crypto.randomUUID(), user_id: userId, title: `${selected.title} 원문 및 준비조건 확인`, start_date: today(), due_date: selected.end_date && selected.end_date >= today() ? selected.end_date : today(), completed: false, category: '정책', policy_id: selected.id }); }} /></Modal>}
    {taskEditor && profile && <Modal title={taskEditor === 'new' || !data.tasks.some(task => task.id === taskEditor.id) ? '새로운 할 일' : '할 일 수정'} close={() => setTaskEditor(null)}><RoadmapTaskForm tasks={data.tasks} profile={profile} policy={taskEditor === 'new' ? undefined : data.policies.find(policy => policy.id === taskEditor.policy_id)} initial={taskEditor === 'new' ? { id: crypto.randomUUID(), user_id: userId, title: '', start_date: today(), due_date: today(), completed: false, category: '생활', policy_id: null } : taskEditor} busy={busy} submit={async value => { if (await save({ kind: 'task', value })) setTaskEditor(null); }} /></Modal>}
    {eduEditor && <Modal title={eduEditor === 'new' ? '교육 수료 기록 추가' : '교육 기록 수정'} close={() => setEduEditor(null)}><EducationForm initial={eduEditor === 'new' ? { id: crypto.randomUUID(), user_id: userId, title: '', provider: '', hours: 1, completed_date: today(), certificate: false } : eduEditor} busy={busy} submit={async value => { if (await save({ kind: 'education', value })) setEduEditor(null); }} /></Modal>}
  </div></MutationError.Provider>;
}

function PolicyDetail({ policy, data, busy, save, addTask }: { policy: Policy; data: AppData; busy: boolean; save: (m: Mutation) => Promise<boolean>; addTask: () => void }) {
  const match = matchPolicy(policy, data.profile, data.education), source = safeSource(policy.source_url);
  return <div className="detail-content">{policy.is_demo && <p className="demo-banner">체험용 가상 정책입니다. 아래 링크는 정보 탐색용이며 이 정책의 실제 공고가 아닙니다.</p>}<div className="detail-summary"><span className="badge green">{policy.category}</span><span>{policy.region} · {policy.agency}</span><p>{policy.summary}</p><h3>{policy.benefit}</h3></div><div className="source-box"><h3>정책 출처</h3><dl><dt>공식 출처</dt><dd>{policy.source_name}</dd><dt>기준연도</dt><dd>{policy.policy_year}년</dd><dt>최종 확인일</dt><dd>{policy.verified_at || '미검증 · 데모'}</dd><dt>신청기간</dt><dd>{policy.start_date || '시작일 원문 확인'} ~ {policy.end_date || '마감일 원문 확인'}</dd><dt>담당기관 / 문의</dt><dd>{policy.agency} · {policy.contact || '원문 확인'}</dd></dl>{source ? <a className="button" href={source} target="_blank" rel="noopener noreferrer">{policy.is_demo ? '공식 정보 사이트 보기' : '원문 공고 확인'}<ExternalLink size={16} /></a> : <p className="error">유효한 HTTPS 원문 링크가 없습니다. 담당기관에 확인해 주세요.</p>}</div><h3>나의 조건 확인 <span className="badge amber">{match.status}</span></h3>{match.results.length ? match.results.map((r, i) => <div className={`rule-row ${r.status}`} key={`${r.rule.id}-${i}`}><span>{r.status === 'pass' ? <CheckCircle2 size={19} /> : <CircleHelp size={19} />}</span><div><strong>{r.rule.label}</strong><p>{r.status === 'pass' ? '입력한 정보 기준 충족' : r.status === 'unknown' ? '추가 정보 확인이 필요해요' : `현재 조건과 차이가 있어요${typeof r.actual === 'number' ? ` (현재 ${Math.round(r.actual * 10) / 10})` : ''}`}</p>{r.status !== 'pass' && <small>{r.rule.guidance}</small>}</div></div>) : <p className="muted-text">세부 규칙이 등록되지 않았습니다. 원문에서 지원 조건을 직접 확인해 주세요.</p>}<h3>준비서류 체크리스트</h3>{policy.documents.length ? policy.documents.map(d => <label className="checkbox-label" key={d.id}><input type="checkbox" disabled={busy} checked={data.documentChecks.some(c => c.document_id === d.id && c.completed)} onChange={e => save({ kind: 'document', documentId: d.id, completed: e.target.checked })} />{d.title}</label>) : <p className="muted-text">등록된 서류가 없습니다. 원문 공고의 제출서류 목록을 확인해 주세요.</p>}<Button secondary onClick={addTask}><Plus size={16} />준비할 일로 추가</Button><p className="disclaimer">추천은 자격 확정이나 선정 보장이 아닙니다. 실제 자격·교육 인정 여부와 모집 상태는 시행기관 및 원문 공고에서 확인해 주세요. 이 서비스에서는 신청을 접수하지 않습니다.</p></div>;
}

function ProfileForm({ initial, busy, save }: { initial: Profile; busy: boolean; save: (p: Profile) => Promise<boolean> }) {
  const [p, setP] = useState(() => profileWithSelectableRegions(initial));
  const field = <K extends keyof Profile>(key: K, value: Profile[K]) => setP(previous => ({ ...previous, [key]: value }));
  return <form className="panel profile-form" onSubmit={async e => { e.preventDefault(); await save(p); }}><div className="form-section-title"><span>01</span><div><h2>나의 기본 계획</h2><p>농업 계획과 이주 진행 단계를 각각 알려주세요. 농업 여부가 미정이어도 이주 준비는 진행할 수 있어요.</p></div></div><div className="form-grid"><label>이름 또는 별명<input required maxLength={80} value={p.display_name} onChange={e => field('display_name', e.target.value)} placeholder="어떻게 불러드릴까요?" /></label><label>생년월일<input required type="date" max={today()} value={p.birth_date || ''} onChange={e => field('birth_date', e.target.value || null)} /></label><label>이주 후 농업을 할 계획인가요?<select value={p.purpose} onChange={e => field('purpose', e.target.value as Profile['purpose'])}>{purposeOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label><label>귀농·귀촌은 어디까지 진행했나요?<select value={p.stage} onChange={e => field('stage', e.target.value)}>{stageOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label><CurrentRegionField value={p.current_region} onChange={value => field('current_region', value)} /><TargetRegionFields province={p.target_province} district={p.target_district} onChange={region => setP(previous => ({ ...previous, ...region }))} /><label>{p.moved ? '전입 완료일' : '전입 예정일'}<input type="date" max={p.moved ? today() : undefined} value={p.move_date || ''} onChange={e => field('move_date', e.target.value || null)} /></label><label>{p.purpose === '귀촌' ? '희망 활동·업종' : '희망 작목·업종'}<input value={p.interest} onChange={e => field('interest', e.target.value)} placeholder={p.purpose === '귀촌' ? '예: 원격근무, 카페, 지역취업' : '예: 딸기, 스마트팜'} /></label><label>현재 직업<select value={p.occupation} onChange={e => field('occupation', e.target.value)}><option value="">미입력</option>{['직장인', '공무원', '자영업', '프리랜서', '학생', '무직', '농업인', '기타'].map(v => <option key={v}>{v}</option>)}</select></label></div><label className="checkbox-label"><input type="checkbox" checked={p.moved} onChange={e => field('moved', e.target.checked)} />이미 농촌으로 전입했어요</label><details className="advanced"><summary>정밀 추천을 위한 추가 정보 <span>선택 입력</span></summary><p className="muted-text">모르는 항목은 미입력으로 남겨 주세요. 수료시간은 교육 이력에서 관리합니다.</p><div className="form-grid"><label>이주 전 연속 도시 거주기간 (개월)<input type="number" min="0" max="1500" step="1" value={p.urban_months ?? ''} onChange={e => field('urban_months', e.target.value === '' ? null : Number(e.target.value))} /></label><label>세대주 여부<select value={p.household_head === null ? '' : String(p.household_head)} onChange={e => field('household_head', e.target.value === '' ? null : e.target.value === 'true')}><option value="">미입력</option><option value="true">세대주</option><option value="false">세대원</option></select></label>{p.purpose !== '귀촌' && <><label>독립 영농 시작일<input type="date" max={today()} value={p.independent_since || ''} onChange={e => field('independent_since', e.target.value || null)} /></label><label>농업경영체 등록<select value={p.entity_status} onChange={e => field('entity_status', e.target.value)}><option value="">미입력</option>{['미등록', '경영주', '공동경영주', '경영주 외 농업인'].map(v => <option key={v}>{v}</option>)}</select></label><label>농지·시설 확보<select value={p.farmland_status} onChange={e => field('farmland_status', e.target.value)}><option value="">미입력</option>{['없음', '탐색 중', '임차 예정', '임차 완료', '구매 예정', '구매 완료', '가족 소유'].map(v => <option key={v}>{v}</option>)}</select></label></>}<label>연간 소득구간 (선택)<select value={p.income_band} onChange={e => field('income_band', e.target.value)}><option value="">미입력 / 응답하지 않음</option>{['소득 없음', '2천만원 미만', '2천~4천만원', '4천~6천만원', '6천만원 이상'].map(v => <option key={v}>{v}</option>)}</select></label></div></details><div className="form-section-title"><span>02</span><div><h2>일정 알림</h2><p>앱 안에서 관심 정책 마감과 이번 주 할 일을 확인해요.</p></div></div><label className="checkbox-label"><input type="checkbox" checked={p.notifications_enabled} onChange={e => field('notifications_enabled', e.target.checked)} />앱 내 일정 알림 사용</label><p className="muted-text">이 버전은 앱을 열었을 때 알림을 표시합니다. 이메일·문자·푸시를 발송하지 않습니다.</p><div className="form-actions"><button className="button" disabled={busy}>{busy ? '저장 중…' : '프로필 저장'}<Check size={17} /></button></div></form>;
}

function EducationForm({ initial, busy, submit }: { initial: Education; busy: boolean; submit: (e: Education) => Promise<void> }) {
  const [e, setE] = useState(initial);
  return <form className="editor-form" onSubmit={event => { event.preventDefault(); void submit({ ...e, title: e.title.trim(), provider: e.provider.trim() }); }}><label>교육명<input autoFocus required maxLength={240} value={e.title} onChange={v => setE({ ...e, title: v.target.value })} /></label><label>교육기관<input required value={e.provider} onChange={v => setE({ ...e, provider: v.target.value })} /></label><div className="form-grid"><label>수료시간<input type="number" min="0.5" max="10000" step="0.5" required value={e.hours} onChange={v => setE({ ...e, hours: Number(v.target.value) })} /></label><label>수료일<input type="date" max={today()} required value={e.completed_date} onChange={v => setE({ ...e, completed_date: v.target.value })} /></label></div><label className="checkbox-label"><input type="checkbox" checked={e.certificate} onChange={v => setE({ ...e, certificate: v.target.checked })} />수료증을 보유하고 있어요</label><button className="button" disabled={busy || !e.title.trim() || !e.provider.trim()}>{busy ? '저장 중…' : '수료 기록 저장'}</button></form>;
}

function Briefing({ data, week, busy, save, taskRow }: { data: AppData; week: WeeklyRoadmap; busy: boolean; save: (m: Mutation) => Promise<boolean>; taskRow: (t: Task) => ReactNode }) {
  const { start, end, tasks: weekly, completedCount: done } = week;
  const previous = data.checkins.find(c => c.week_start === start);
  const [note, setNote] = useState(previous?.note || '');

  return <><div className="page-heading"><div><span className="eyebrow">YOUR WEEKLY RURAL LETTER</span><h1>이번 주, 나의 귀농·귀촌 브리핑</h1><p>{start} ~ {end} · 앱에서 확인하는 나만의 주간 기록</p></div></div><div className="briefing-hero"><Mail size={30} /><h2>이번 주에도 한 걸음 가까워졌어요.</h2><p>이번 주 할 일 {weekly.length}개 중 {done}개를 완료했어요.<br />작은 변화와 다음 계획을 기록해 보세요.</p></div><section className="panel" aria-label="이번 주 할 일"><h2>이번 주 할 일</h2>{weekly.length ? weekly.map(taskRow) : <Empty title="이번 주에 등록한 일정이 없어요" detail="로드맵에서 날짜를 지정해 할 일을 추가해 보세요." />}</section><form className="panel checkin-form" onSubmit={async e => { e.preventDefault(); await save({ kind: 'checkin', value: { id: previous?.id || crypto.randomUUID(), user_id: data.profile!.user_id, week_start: start, note, completed_count: done, total_count: weekly.length } }); }}><h2>이번 주 체크인</h2><label>잘한 일, 어려웠던 점, 다음 주의 작은 목표<textarea rows={4} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="예: 교육 과정을 알아봤어요. 다음 주에는 지역 상담을 받아보려고 해요." /></label><button className="button" disabled={busy}>{previous ? '체크인 수정' : '이번 주 기록하기'}<Check size={16} /></button></form>{data.checkins.length > 0 && <section className="panel"><h2>지나온 기록</h2>{[...data.checkins].sort((a, b) => b.week_start.localeCompare(a.week_start)).map(c => <article className="checkin-history" key={c.id}><strong>{c.week_start} 주간</strong><span>기록 시점 {c.completed_count}/{c.total_count}개 완료</span><p>{c.note || '짧은 메모 없이 진행 상황을 기록했어요.'}</p></article>)}</section>}<p className="muted-text">주간 기록은 DB에 저장됩니다. 자동 이메일 뉴스레터 발송은 아직 연결되지 않았습니다.</p></>;
}
