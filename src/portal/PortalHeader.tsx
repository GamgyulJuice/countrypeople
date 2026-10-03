import { useEffect, useRef, useState } from 'react';
import { Search, LayoutGrid, X, UserRound, Sprout, ChevronRight, ArrowUpRight } from 'lucide-react';
import { official } from './links';
import type { WorkspacePage } from './navigation';

type Entry = { label: string; description: string; page?: WorkspacePage; href?: string };
const groups: { label: string; entries: Entry[] }[] = [
  { label: '가이드 · 상담', entries: [
    { label: '나의 로드맵', description: '귀농귀촌 준비를 단계별로', page: 'tasks' },
    { label: '프로필 및 설정', description: '내 상황에 맞는 계획 세우기', page: 'profile' },
    { label: '귀농닥터', description: '그린대로 전문가 상담', href: official.doctor },
  ] },
  { label: '교육', entries: [
    { label: '교육 과정 찾기', description: '공식 교육 공고 둘러보기', href: official.education },
    { label: '교육 이력', description: '수료 내역과 교육시간 관리', page: 'education' },
  ] },
  { label: '체험', entries: [
    { label: '농촌에서 살아보기', description: '마을의 일상을 미리 경험하기', href: official.experience },
    { label: '체험후기', description: '먼저 경험한 이웃들의 이야기', href: official.reviews },
  ] },
  { label: '정착 · 지원정보', entries: [
    { label: '맞춤 정책 찾기', description: '내 조건으로 지원정책 확인', page: 'policies' },
    { label: '전국 지원정책', description: '그린대로 공식 공고', href: official.policies },
    { label: '나의 대시보드', description: '준비 현황 한눈에 보기', page: 'home' },
  ] },
  { label: '지역 이야기', entries: [
    { label: '귀농귀촌 이야기', description: '농촌에서 찾은 새로운 일상', href: official.stories },
    { label: '체험후기', description: '지역에서 보낸 시간과 경험', href: official.reviews },
  ] },
  { label: '나의 준비', entries: [
    { label: '이번 주 브리핑', description: '이번 주 할 일과 기록', page: 'briefing' },
    { label: '나의 로드맵', description: '할 일과 캘린더 관리', page: 'tasks' },
    { label: '교육 이력', description: '차곡차곡 쌓이는 수료 기록', page: 'education' },
  ] },
];
const searchEntries = groups.flatMap(g => g.entries).filter((entry, i, all) => all.findIndex(e => e.label === entry.label) === i);

export interface PortalHeaderProps {
  onNavigate: (page: WorkspacePage) => void;
  onHome: () => void;
  onAuth: (signup?: boolean) => void;
  userName?: string;
  activePage?: WorkspacePage;
}

export default function PortalHeader({ onNavigate, onHome, onAuth, userName, activePage }: PortalHeaderProps) {
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [overlay, setOverlay] = useState<'search' | 'menu' | null>(null);
  const [query, setQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (overlay) dialog.current?.showModal(); else dialog.current?.close();
  }, [overlay]);
  const close = () => { setOpenGroup(null); setOverlay(null); };
  const navigate = (page: WorkspacePage) => { close(); onNavigate(page); };
  const entry = (item: Entry, key: string) => item.page
    ? <button key={key} onClick={() => navigate(item.page!)} aria-current={activePage === item.page ? 'page' : undefined}><span><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={18} /></button>
    : <a key={key} href={item.href} target="_blank" rel="noreferrer" onClick={close}><span><strong>{item.label}</strong><small>{item.description}</small></span><ArrowUpRight size={18} /><span className="sr-only">새 창</span></a>;
  const results = searchEntries.filter(item => `${item.label} ${item.description}`.includes(query.trim()));
  return <>
    <a className="portal-skip" href="#site-content" onClick={e => { e.preventDefault(); const content = document.getElementById('site-content'); content?.setAttribute('tabindex', '-1'); content?.focus(); content?.scrollIntoView(); }}>본문 바로가기</a>
    <header className="portal-header" onMouseLeave={() => setOpenGroup(null)} onKeyDown={e => { if (e.key === 'Escape') close(); }}>
      <div className="portal-utility"><div className="portal-container utility-inner"><div className="utility-links"><a href={official.home} target="_blank" rel="noreferrer">그린대로 <ArrowUpRight size={12} /></a><button className="utility-teal" onClick={() => navigate('policies')}>맞춤 지원정책 <ChevronRight size={12} /></button><button onClick={() => navigate('tasks')}>귀농귀촌 준비 <ChevronRight size={12} /></button></div><div className="utility-account">{userName ? <button onClick={() => navigate('profile')}><UserRound size={14} />{userName} 님</button> : <><button onClick={() => { close(); onAuth(false); }}><UserRound size={14} />로그인</button><button className="utility-join" onClick={() => { close(); onAuth(true); }}><UserRound size={14} />회원가입</button></>}</div></div></div>
      <div className="portal-navigation portal-container"><button className="portal-brand" aria-label="시골로 홈" onClick={() => { close(); onHome(); }}><span className="portal-brand-icon"><Sprout strokeWidth={1.7} /></span><span>시골로<small>귀농귀촌, 나답게 시작하다</small></span></button><nav className="portal-desktop-nav" aria-label="주 메뉴">{groups.map((group, index) => <button key={group.label} aria-expanded={openGroup === index} aria-controls="portal-dropdown" className={openGroup === index ? 'is-active' : ''} onMouseEnter={() => setOpenGroup(index)} onClick={() => setOpenGroup(openGroup === index ? null : index)}>{group.label}</button>)}</nav><div className="portal-header-tools"><button aria-label="통합검색" onClick={() => { setOpenGroup(null); setOverlay('search'); }}><Search /></button><button aria-label="메뉴 열기" onClick={() => { setOpenGroup(null); setOverlay('menu'); }}><LayoutGrid /></button></div></div>
      {openGroup !== null && <div id="portal-dropdown" className="portal-dropdown"><div className="portal-container dropdown-inner"><div><h2>{groups[openGroup].label}</h2><p>준비부터 정착까지,<br />시골로와 함께 시작하세요.</p><Sprout size={66} strokeWidth={1} /></div><div className="dropdown-entries">{groups[openGroup].entries.map((item, i) => entry(item, String(i)))}</div></div></div>}
    </header>
    <dialog ref={dialog} className="portal-dialog" aria-label={overlay === 'search' ? '통합검색' : '전체메뉴'} onCancel={() => setOverlay(null)} onClick={e => { if (e.target === e.currentTarget) close(); }}><div className="portal-dialog-inner"><div className="portal-dialog-title"><h2>{overlay === 'search' ? '통합검색' : '전체메뉴'}</h2><button aria-label="닫기" onClick={close}><X /></button></div>{overlay === 'search' ? <><label className="portal-search-field"><Search /><input autoFocus placeholder="어떤 정보가 궁금하세요?" aria-label="서비스 검색" value={query} onChange={e => setQuery(e.target.value)} /><button aria-label="검색어 지우기" onClick={() => setQuery('')}><X size={18} /></button></label><p className="portal-search-description">시골로 서비스와 공식 정보 바로가기를 찾아보세요.</p><div className="portal-search-results">{results.length ? results.map((item, i) => entry(item, String(i))) : <p className="portal-search-empty">‘{query}’에 해당하는 서비스가 없습니다.<br />정책, 교육, 로드맵 등으로 검색해 보세요.</p>}</div></> : <div className="portal-menu-grid">{groups.map(group => <section key={group.label}><h3>{group.label}</h3>{group.entries.map((item, i) => entry(item, String(i)))}</section>)}</div>}</div></dialog>
  </>;
}
