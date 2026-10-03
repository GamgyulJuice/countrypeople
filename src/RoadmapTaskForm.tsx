import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { addDays, today } from './lib/domain';
import { taskStart } from './lib/task-period';
import type { Policy, Profile, Task } from './lib/types';
import { RoadmapGuide } from './RoadmapGuide';

export default function RoadmapTaskForm({ initial, tasks, profile, policy, busy, submit }: {
  initial: Task; tasks: Task[]; profile: Profile; policy?: Policy; busy: boolean; submit: (task: Task) => Promise<void>;
}) {
  const [task, setTask] = useState({ ...initial, start_date: taskStart(initial) });
  const [course, setCourse] = useState(initial.education_hours != null || !!initial.education_provider);
  const nextStart = tasks.filter(item => item.id !== task.id).map(taskStart).filter(date => date > task.start_date).sort()[0];
  const end = nextStart ? addDays(nextStart, -1) : task.due_date;
  return <form className="editor-form" onSubmit={event => {
    event.preventDefault();
    void submit({ ...task, title: task.title.trim(), due_date: end,
      education_provider: course ? task.education_provider?.trim() || '' : null,
      education_hours: course ? task.education_hours : null,
      education_completed_date: course && task.completed ? task.education_completed_date || today() : null,
      education_certificate: course && !!task.education_certificate,
    });
  }}>
    <label>할 일<input autoFocus required maxLength={240} value={task.title} onChange={event => setTask({ ...task, title: event.target.value })} placeholder={course ? '예: 귀농 기초과정 20시간 수료' : '예: 전입신고 신청서와 신분증 준비'} /></label>
    <div className="form-grid">
      <label>시작일<input type="date" required value={task.start_date} onChange={event => setTask({ ...task, start_date: event.target.value })} /></label>
      <label>종료일<input type="date" required readOnly={!!nextStart} min={task.start_date || undefined} value={end} onChange={event => setTask({ ...task, due_date: event.target.value })} /></label>
    </div>
    <p className="muted-text">{nextStart ? `종료일은 다음 할 일 시작일(${nextStart})의 전날로 자동 계산됩니다.` : '다음 할 일이 없는 마지막 항목입니다. 종료일을 직접 정해 주세요.'} 교육 수료일은 아래 수료 정보로 별도 기록합니다.</p>
    <label>분류<select value={task.category} onChange={event => {
      const category = event.target.value;
      setTask({ ...task, category });
      if (category !== '교육') setCourse(false);
    }}>{['탐색', '교육', '정책', '주거', '생활'].map(category => <option key={category}>{category}</option>)}</select></label>
    {task.category === '교육' && <section className="course-fields">
      <label className="checkbox-label"><input type="checkbox" checked={course} onChange={event => { setCourse(event.target.checked); if (event.target.checked && !task.education_hours) setTask({ ...task, education_hours: 1 }); }} />수료할 교육 과정으로 등록</label>
      <p className="muted-text">교육명·기관·시간을 등록해 두면 로드맵에서 완료할 때 수료 이력과 총 시간이 자동으로 갱신됩니다. 교육을 알아보는 단계라면 체크하지 않아도 됩니다.</p>
      {course && <>
        <h3><GraduationCap size={18} />교육 수료 정보</h3>
        <label>교육기관<input required maxLength={240} value={task.education_provider || ''} onChange={event => setTask({ ...task, education_provider: event.target.value })} placeholder="실제 수강할 교육기관" /></label>
        <label>교육시간<input required type="number" min="0.5" max="10000" step="0.5" value={task.education_hours ?? ''} onChange={event => setTask({ ...task, education_hours: event.target.value === '' ? null : Number(event.target.value) })} /></label>
        <label className="checkbox-label"><input type="checkbox" checked={task.completed} onChange={event => setTask({ ...task, completed: event.target.checked, education_completed_date: event.target.checked ? today() : null })} />이 교육을 수료했어요</label>
        {task.completed && <label>수료일<input required type="date" max={today()} value={task.education_completed_date || today()} onChange={event => setTask({ ...task, education_completed_date: event.target.value })} /></label>}
        <label className="checkbox-label"><input type="checkbox" checked={!!task.education_certificate} onChange={event => setTask({ ...task, education_certificate: event.target.checked })} />수료증을 보유하고 있어요</label>
        <p className="muted-text">완료 체크는 직접 수료한 사실을 확인하는 동작입니다. 외부 교육기관의 수료 내역을 자동 조회하지 않습니다.</p>
      </>}
    </section>}
    <details className="task-guide-disclosure"><summary>준비서류 · 연락처 · 신청 사이트</summary><RoadmapGuide task={task} profile={profile} policy={policy} /></details>
    <button className="button" disabled={busy || !task.title.trim() || (course && !task.education_provider?.trim())}>{busy ? '저장 중…' : '할 일 저장'}</button>
  </form>;
}
