import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, BellRing, ChevronLeft, ChevronRight, GraduationCap, Headphones, House, LockKeyhole, MapPin, Megaphone, Pause, Play, Plus, Sprout, UserRound } from 'lucide-react';
import PortalHeader from './PortalHeader';
import { official } from './links';
import type { WorkspacePage } from './navigation';

type Props = { onNavigate: (page: WorkspacePage) => void; onAuth: (signup?: boolean) => void };
const slides = [
  { image: 'hero-03.png', eyebrow: '나의 귀농귀촌 길잡이, 시골로', title: <>지금 내 꿈은<br />시골로 가는 중</>, description: '새로운 일상, 나에게 맞는 속도로 시작하세요.' },
  { image: 'rural-village-2.jpg', eyebrow: '머물러 보고, 천천히 결정하세요', title: <>마음에 그리던 일상,<br />농촌에서 살아보기</>, description: '어떤 마을이 나와 어울릴지 먼저 경험해 보세요.' },
  { image: 'rural-village-1.jpg', eyebrow: '준비부터 정착까지 함께', title: <>새로운 시작을 위한<br />나만의 첫걸음</>, description: '지원정책부터 교육, 나의 정착 계획까지 한곳에서.' },
];
const services: { label: string; icon: string; page?: WorkspacePage; href?: string; isNew?: boolean }[] = [
  { label: '자가진단', icon: '08', href: official.diagnosis },
  { label: '교육신청', icon: '03', href: official.education },
  { label: '빈집은행', icon: '15', href: official.houses, isNew: true },
  { label: '귀농닥터', icon: '16', href: official.doctor, isNew: true },
  { label: '온라인상담', icon: '02', href: official.consult },
  { label: '교육이력', icon: '14', page: 'education' },
  { label: '맞춤정책', icon: '17', page: 'policies' },
  { label: '살아보기', icon: '04', href: official.experience },
  { label: '나의로드맵', icon: '05', page: 'tasks' },
  { label: '귀농귀촌가이드', icon: '01', href: official.guide },
  { label: '커뮤니티', icon: '10', href: official.community },
  { label: '지역이야기', icon: '11', href: official.stories },
];
const villages = [
  { name: '대실마을', region: '충청북도 음성군', image: 'rural-village-1.jpg', description: '물길을 따라 만나는 농촌의 일상' },
  { name: '개실마을', region: '경상북도 고령군', image: 'rural-village-2.jpg', description: '고즈넉한 풍경 속 새로운 하루' },
  { name: '반곡지마을', region: '경상북도 경산시', image: 'rural-village-3.jpg', description: '자연과 함께하는 마을의 시간' },
];
const policyItems = [
  { title: '나에게 맞는 귀농귀촌\n지원정책을 찾아보세요', text: '희망 지역과 준비 상황에 맞춰\n필요한 정책을 확인해 보세요.' },
  { title: '주거부터 교육까지,\n정착 준비를 한눈에', text: '정책별 조건과 준비서류를\n차근차근 살펴보세요.' },
  { title: '관심 정책을 저장하고\n나의 계획으로 연결하세요', text: '중요한 일정과 준비할 일을\n나의 로드맵에서 관리하세요.' },
];
const notices = [
  { title: '귀농귀촌 준비, 나의 조건 입력부터 시작해 보세요', tag: '이용안내', page: 'profile' as WorkspacePage },
  { title: '관심 정책을 저장하고 필요한 준비서류를 확인하세요', tag: '정책', page: 'policies' as WorkspacePage },
  { title: '전입 예정일에 맞춰 나만의 정착 로드맵 만들기', tag: '로드맵', page: 'tasks' as WorkspacePage },
  { title: '교육 수료 기록을 모아 총 교육시간을 관리하세요', tag: '교육', page: 'education' as WorkspacePage },
  { title: '한 주의 준비를 돌아보는 나만의 주간 브리핑', tag: '브리핑', page: 'briefing' as WorkspacePage },
];

function External({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} className={className} target="_blank" rel="noreferrer">{children}<span className="sr-only"> (외부 사이트 새 창)</span></a>;
}
function More({ href, onClick, label }: { href?: string; onClick?: () => void; label: string }) {
  return href ? <a className="portal-more" href={href} target="_blank" rel="noreferrer" aria-label={`${label} 더보기 (새 창)`}><Plus /></a> : <button className="portal-more" onClick={onClick} aria-label={`${label} 더보기`}><Plus /></button>;
}

export default function PortalHome({ onNavigate, onAuth }: Props) {
  const [slide, setSlide] = useState(0), [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [policy, setPolicy] = useState(0), [village, setVillage] = useState(0), [newsTab, setNewsTab] = useState('시골로 소식');
  const serviceTrack = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setSlide(n => (n + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused]);
  const changeSlide = (offset: number) => setSlide(n => (n + offset + slides.length) % slides.length);
  return <div className="portal-site">
    <PortalHeader onNavigate={onNavigate} onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onAuth={onAuth} />
    <main id="site-content" className="portal-container portal-main">
      <section className="portal-top" aria-label="귀농귀촌 한눈에 보기">
        <div className="portal-feature-column">
          <div className="portal-hero" role="region" aria-roledescription="캐러셀" aria-label="시골로 소개 배너">
            {slides.map((item, i) => <div key={item.image} className={`portal-hero-slide ${slide === i ? 'current' : ''}`} aria-hidden={slide !== i}><img src={`/images/${item.image}`} alt="" fetchPriority={i === 0 ? 'high' : 'auto'} /><div className="portal-hero-shade" /><div className="portal-hero-copy"><p>{item.eyebrow}</p>{i === 0 ? <h1>{item.title}</h1> : <h2>{item.title}</h2>}<span>{item.description}</span></div></div>)}
            <div className="portal-hero-controls"><div><b>{String(slide + 1).padStart(2, '0')}</b><span> / 03</span><span className="portal-hero-progress"><i style={{ width: `${(slide + 1) / 3 * 100}%` }} /></span></div><div><button aria-label="배너 이전" onClick={() => changeSlide(-1)}><ChevronLeft /></button><button aria-label={paused ? '배너 자동재생' : '배너 일시정지'} onClick={() => setPaused(!paused)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button><button aria-label="배너 다음" onClick={() => changeSlide(1)}><ChevronRight /></button></div></div>
          </div>
          <button className="portal-notice-ticker" onClick={() => onNavigate('tasks')}><Megaphone size={25} /><strong>시골로에서 나만의 귀농귀촌 계획을 시작하세요.</strong><ChevronRight size={20} /></button>
        </div>
        <div className="portal-info-grid">
          <article className="portal-info-card portal-policy-card"><div className="portal-info-heading"><h2>지원정책</h2><div className="portal-dots">{policyItems.map((_, i) => <button key={i} aria-label={`지원정책 안내 ${i + 1}`} aria-pressed={policy === i} className={policy === i ? 'current' : ''} onClick={() => setPolicy(i)} />)}</div></div><button className="portal-card-link" onClick={() => onNavigate('policies')}><h3>{policyItems[policy].title}</h3><p>{policyItems[policy].text}</p></button><More onClick={() => onNavigate('policies')} label="지원정책" /></article>
          <article className="portal-info-card portal-login-card"><LockKeyhole size={35} strokeWidth={2.5} /><p>로그인 후<br />나의 맞춤 정보를 확인하세요.</p><button className="portal-login-button" onClick={() => onAuth(false)}>로그인</button><div className="portal-account-links"><button onClick={() => onNavigate('home')}>나의 준비 현황</button><span /><button onClick={() => onAuth(true)}>회원가입</button></div></article>
          <article className="portal-info-card portal-house-card"><h2><House size={27} strokeWidth={1.5} />빈집은행</h2><External href={official.houses} className="portal-card-link"><h3>새로운 일상이 시작될<br />나만의 집을 찾아보세요</h3><p>전국 농촌 빈집 정보와<br />지역별 주거 정보를 한곳에서</p><strong className="portal-accent-text">농촌 빈집 알아보기</strong></External><More href={official.houses} label="빈집은행" /></article>
          <article className="portal-info-card portal-plan-card"><div className="portal-info-heading"><h2>나의 귀농귀촌</h2><Sprout size={25} /></div><button className="portal-card-link" onClick={() => onNavigate('tasks')}><h3>막막한 준비도<br />차근차근, 나의 속도로</h3><p>이주 계획 · 지원정책 · 교육<br />나에게 필요한 준비를 시작하세요.</p></button><More onClick={() => onNavigate('tasks')} label="나의 귀농귀촌" /></article>
        </div>
      </section>

      <section className="portal-section portal-services"><div className="portal-section-heading"><div><h2>주요서비스</h2><p>귀농귀촌에 필요한 정보, 쉽고 빠르게 만나보세요.</p></div><div className="portal-inline-controls"><button aria-label="서비스 이전" onClick={() => serviceTrack.current?.scrollBy({ left: -400, behavior: 'smooth' })}><ChevronLeft /></button><button aria-label="서비스 다음" onClick={() => serviceTrack.current?.scrollBy({ left: 400, behavior: 'smooth' })}><ChevronRight /></button></div></div><div className="portal-service-track" ref={serviceTrack}>{services.map(service => { const content = <><span className="portal-service-icon"><img src={`/images/icon_session01_link${service.icon}.svg`} alt="" />{service.isNew && <i>N</i>}</span><strong>{service.label}</strong></>; return service.page ? <button className="portal-service" key={service.label} onClick={() => onNavigate(service.page!)}>{content}</button> : <External href={service.href!} className="portal-service" key={service.label}>{content}</External>; })}</div></section>

      <section className="portal-section portal-living"><div className="portal-section-heading"><div><h2>살아보기</h2><p>잠시 머물며 만나는, 나에게 어울리는 농촌의 일상.</p></div><div className="portal-inline-controls"><span>{village + 1} / {villages.length}</span><button aria-label="마을 이전" onClick={() => setVillage((village + 2) % 3)}><ChevronLeft /></button><button aria-label="마을 다음" onClick={() => setVillage((village + 1) % 3)}><ChevronRight /></button><More href={official.experience} label="살아보기" /></div></div><div className="portal-village-grid">{[0, 1, 2].map(offset => { const item = villages[(village + offset) % villages.length]; return <External href={official.experience} className="portal-village-card" key={item.name}><div className="portal-village-image"><img src={`/images/${item.image}`} alt={`${item.region} ${item.name} 풍경`} loading="lazy" /><span>농촌에서 살아보기</span></div><div className="portal-village-copy"><p><MapPin size={16} />{item.region}</p><h3>{item.name}</h3><span>{item.description}</span><div>프로그램 · 모집 일정 <strong>공식 공고 확인 <ArrowUpRight size={15} /></strong></div></div></External>; })}</div></section>

      <section className="portal-section portal-learning"><div className="portal-section-heading"><div><h2>교육</h2><p>새로운 시작의 자신감, 배움에서 차근차근.</p></div><More href={official.education} label="교육" /></div><div className="portal-education-grid"><External href={official.education} className="portal-course"><div className="portal-course-top"><span>기초부터 차근차근</span><GraduationCap size={31} strokeWidth={1.5} /></div><h3>귀농귀촌,<br />어디서부터 시작할까요?</h3><p>기초 이론부터 현장 실습까지<br />나에게 필요한 교육과정을 찾아보세요.</p><div className="portal-course-meta">귀농귀촌 아카데미 · 맞춤형 교육</div><span className="portal-course-button">교육과정 확인 <ArrowUpRight size={16} /></span></External><External href={official.doctor} className="portal-course"><div className="portal-course-top"><span>경험에서 배우는 시간</span><Headphones size={30} strokeWidth={1.5} /></div><h3>궁금했던 농촌 생활,<br />선배에게 물어보세요.</h3><p>현장의 경험과 노하우를 통해<br />나의 정착 계획을 구체적으로 그려보세요.</p><div className="portal-course-meta">귀농닥터 · 전문가 상담</div><span className="portal-course-button">상담 안내 확인 <ArrowUpRight size={16} /></span></External><button className="portal-course personal-course" onClick={() => onNavigate('education')}><div className="portal-course-top"><span>나의 배움을 기록해요</span><Sprout size={31} strokeWidth={1.5} /></div><h3>차곡차곡 쌓이는<br />나의 교육 이력</h3><p>수강한 교육과 수료시간을 기록하고<br />앞으로의 배움을 계획해 보세요.</p><div className="portal-course-meta">수료 기록 · 총 교육시간 관리</div><span className="portal-course-button">나의 교육 이력 보기 <ChevronRight size={16} /></span></button></div></section>

      <section className="portal-section portal-news-grid"><div className="portal-news"><div className="portal-news-heading"><div role="tablist" aria-label="소식 유형">{['시골로 소식', '공식 정보'].map(tab => <button key={tab} role="tab" aria-selected={newsTab === tab} onClick={() => setNewsTab(tab)}>{tab}</button>)}</div><More href={official.home} label="공식 정보" /></div><div className="portal-news-list" role="tabpanel">{newsTab === '시골로 소식' ? notices.map(item => <button key={item.title} onClick={() => onNavigate(item.page)}><span>{item.title}</span><small>{item.tag}</small></button>) : [{ title: '그린대로에서 전국 귀농귀촌 지원정책 확인하기', href: official.policies }, { title: '농촌에서 살아보기 프로그램 둘러보기', href: official.experience }, { title: '귀농귀촌 교육과정과 신청 안내', href: official.education }, { title: '지역별 농촌 빈집 정보 살펴보기', href: official.houses }, { title: '귀농닥터 상담 이용 안내', href: official.doctor }].map(item => <External key={item.title} href={item.href}><span>{item.title}</span><ArrowUpRight size={15} /></External>)}</div></div><div className="portal-start-banner"><span>나만의 귀농귀촌 여정</span><h2>꿈꾸던 일상에<br />한 걸음 더 가까이</h2><p>나의 상황에 맞는 계획을 세워보세요.</p><button onClick={() => onNavigate('profile')}>나의 계획 시작하기 <ChevronRight size={17} /></button><Sprout className="portal-start-icon" strokeWidth={1} /></div></section>

      <section className="portal-section portal-stories"><div className="portal-section-heading"><div><h2>농촌 이야기</h2><p>먼저 시작한 이웃들의 이야기를 만나보세요.</p></div><More href={official.stories} label="농촌 이야기" /></div><div className="portal-story-grid"><External href={official.reviews} className="portal-story"><img src="/images/rural-village-1.jpg" alt="나무와 물길이 어우러진 농촌 풍경" loading="lazy" /><div><span>체험후기</span><h3>잠시 살아보니,<br />조금 더 선명해진 내일</h3><p>농촌에서 보낸 이웃들의 경험을 읽어보세요.</p><strong>이야기 만나보기 <ArrowUpRight size={17} /></strong></div></External><External href={official.stories} className="portal-story"><img src="/images/rural-village-2.jpg" alt="산자락 아래 자리한 농촌 마을" loading="lazy" /><div><span>지역 이야기</span><h3>각자의 방식으로<br />뿌리내리는 사람들</h3><p>새로운 터전에서 시작하는 일상과 도전.</p><strong>이야기 만나보기 <ArrowUpRight size={17} /></strong></div></External></div></section>
      <section className="portal-partners" aria-label="공식 정보 바로가기"><External href={official.home}><Sprout /><strong>그린대로</strong><span>귀농귀촌 공식 정보</span><ArrowUpRight size={16} /></External><External href="https://edu.agriedu.net/"><GraduationCap /><strong>농업교육포털</strong><span>배움으로 여는 농업의 미래</span><ArrowUpRight size={16} /></External><button onClick={() => onNavigate('briefing')}><BellRing /><strong>나의 주간 브리핑</strong><span>이번 주 준비를 한눈에</span><ChevronRight size={16} /></button></section>
    </main>
    <footer className="portal-footer"><div className="portal-footer-top"><div className="portal-container"><div><Headphones size={28} /><span>귀농귀촌 공식 상담 안내<strong><a href="tel:18999097">1899-9097</a></strong></span></div><p>그린대로 귀농귀촌 종합상담<br /><span>평일 09:00–18:00 · 점심 12:00–13:00</span></p><External href={official.consult}>온라인 상담 <ArrowUpRight size={17} /></External></div></div><div className="portal-container portal-footer-bottom"><div className="portal-footer-brand"><Sprout size={39} /><strong>시골로</strong></div><div className="portal-footer-copy"><div><button onClick={() => onNavigate('home')}>나의 준비 현황</button><External href={official.guide}>귀농귀촌 가이드</External><External href={official.home}>공식 정보 확인</External></div><p>귀농귀촌 정책 탐색과 나만의 정착 준비를 돕는 서비스입니다.<br />지원 자격과 신청 일정은 해당 기관의 원문 공고를 확인해 주세요.</p><small>© 시골로. 농촌에서 시작하는 나의 다음 이야기.</small></div><button className="portal-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="맨 위로"><ArrowUp size={22} /><span>TOP</span></button></div></footer>
  </div>;
}
