import { ExternalLink, FileText, Phone } from 'lucide-react';
import { resolveTaskGuide } from './lib/roadmap-guides';
import { safeSource } from './lib/domain';
import type { Policy, Profile, Task } from './lib/types';

export function RoadmapGuide({ task, profile, policy }: { task: Task; profile: Profile; policy?: Policy }) {
  const guide = resolveTaskGuide(task, profile, policy);
  return <section className="task-guide" aria-label="서류·연락처·신청 안내">
    <header className="task-guide-header"><FileText size={20} /><h3>{guide.title}</h3></header>
    <p className="task-guide-intro">{guide.intro}</p>
    <h4>진행 순서</h4>
    <ol className="task-guide-steps">{guide.steps.map(step => <li key={step}>{step}</li>)}</ol>
    <h4>필수·조건별 서류와 준비자료</h4>
    <ul className="task-guide-documents">{guide.documents.map((document, index) => <li key={`${document.name}-${index}`}><div><strong>{document.name}</strong><span className={`badge ${document.requirement === '필수' ? 'green' : 'neutral'}`}>{document.requirement}</span></div><p>{document.detail}</p></li>)}</ul>
    <h4>담당기관·연락처</h4>
    <div className="task-guide-contacts">{guide.contacts.map((contact, index) => <div key={`${contact.name}-${index}`}><strong>{contact.name}</strong>{contact.phone && <a className="task-guide-phone" href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}><Phone size={14} />{contact.phone}</a>}<p>{contact.detail}</p>{safeSource(contact.url) && <a href={safeSource(contact.url)!} target="_blank" rel="noopener noreferrer">연락처·기관 안내<ExternalLink size={13} /></a>}</div>)}</div>
    <h4>신청 사이트·서식·공식 안내</h4>
    <div className="task-guide-links">{guide.links.filter(link => safeSource(link.url)).map((link, index) => <a key={`${link.url}-${index}`} href={safeSource(link.url)!} target="_blank" rel="noopener noreferrer">{link.label}<ExternalLink size={14} /></a>)}</div>
    {guide.note && <p className="task-guide-note">{guide.note}</p>}
    <small className="task-guide-source">공통 안내 출처 확인: {guide.checkedAt} · 세부 제출요건은 위 공식 안내와 해당 모집공고에서 확인하세요.</small>
  </section>;
}
