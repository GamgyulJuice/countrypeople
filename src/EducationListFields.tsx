import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { completedHours, today } from './lib/domain';
import type { Education } from './lib/types';

type Props = {
  userId: string;
  existing: Education[];
  records: Education[];
  onChange: (records: Education[]) => void;
};

export default function EducationListFields({ userId, existing, records, onChange }: Props) {
  function update(id: string, patch: Partial<Education>) {
    onChange(records.map(record => record.id === id ? { ...record, ...patch } : record));
  }
  function add() {
    onChange([...records, { id: crypto.randomUUID(), user_id: userId, title: '', provider: '', hours: 0, completed_date: today(), certificate: false }]);
  }
  return <div className="onboarding-section education-list-fields">
    <h3><GraduationCap size={18} />수료한 교육 기록 <span>선택 입력</span></h3>
    <p>수료한 교육을 과정별로 추가해 주세요. 각 교육의 수료시간을 합산해 추천에 반영해요.</p>
    {existing.length > 0 && <p className="onboarding-existing">기존 수료 {completedHours(existing)}시간은 유지됩니다. 아래에는 추가할 교육만 입력하세요.</p>}
    {!records.length && <div className="education-draft-empty">추가한 교육이 없어요. 수료한 교육이 있다면 아래 버튼으로 추가해 주세요.<br />교육이 없거나 아직 확인하지 못했다면 그대로 다음 단계로 이동할 수 있어요.</div>}
    {records.map((record, index) => <section className="education-draft" key={record.id} role="group" aria-labelledby={`education-heading-${record.id}`}>
      <div className="education-draft-header"><h4 id={`education-heading-${record.id}`}>교육 {index + 1}</h4><button type="button" className="text-button" aria-label={`${index + 1}번째 교육 삭제`} onClick={() => onChange(records.filter(item => item.id !== record.id))}><Trash2 size={14} />삭제</button></div>
      <div className="form-grid">
        <label>교육명<input required maxLength={240} pattern=".*\S.*" value={record.title} onChange={e => update(record.id, { title: e.target.value })} placeholder="예: 귀농 기초교육" /></label>
        <label>교육기관<input required maxLength={240} pattern=".*\S.*" value={record.provider} onChange={e => update(record.id, { provider: e.target.value })} placeholder="예: 지역 농업기술센터" /></label>
        <label>수료시간<input required type="number" min="0.5" max="10000" step="0.5" value={record.hours || ''} onChange={e => update(record.id, { hours: Number(e.target.value) })} placeholder="예: 20" /></label>
        <label>수료일<input required type="date" max={today()} value={record.completed_date} onChange={e => update(record.id, { completed_date: e.target.value })} /></label>
      </div>
      <label className="checkbox-label"><input type="checkbox" checked={record.certificate} onChange={e => update(record.id, { certificate: e.target.checked })} />수료증을 보유하고 있어요</label>
    </section>)}
    <button className="add-inline education-add" type="button" onClick={add}><Plus size={17} />교육 추가</button>
    <div className="education-draft-total" role="status"><span>이번에 추가 {records.length}개 · {completedHours(records)}시간</span><strong>총 수료시간 {completedHours([...existing, ...records])}시간</strong></div>
    <p className="muted-text">실제로 수료한 교육만 입력해 주세요. 정책별 인정 기관과 유효기간은 원문 확인이 필요해요.</p>
  </div>;
}
