import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { monthDays, shiftMonth, weekSegments } from './lib/calendar';
import { addDays, today } from './lib/domain';
import { overlaps, taskPeriod } from './lib/task-period';
import type { Task } from './lib/types';
import './calendar.css';

interface Props {
  tasks: Task[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onAdd: (date: string) => void;
  onEdit: (task: Task) => void;
  renderTask: (task: Task) => ReactNode;
  filtered: boolean;
  busy: boolean;
}

export default function TaskCalendar({ tasks, selectedDate, onSelectDate, onAdd, onEdit, renderTask, filtered, busy }: Props) {
  const currentDate = today();
  const month = selectedDate.slice(0, 7);
  const [year, monthNumber, dayNumber] = selectedDate.split('-').map(Number);
  const selectedTasks = tasks.filter(task => overlaps(task, selectedDate, selectedDate));
  const last = addDays(shiftMonth(month + '-01', 1), -1);
  const monthCount = tasks.filter(task => overlaps(task, month + '-01', last)).length;
  const days = monthDays(selectedDate);
  const weeks = Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7));
  return <div className="roadmap-calendar">
    <section className="panel calendar-panel" aria-label="월별 할 일 캘린더">
      <div className="calendar-toolbar">
        <div><h2 aria-live="polite">{year}년 {monthNumber}월</h2><p>{filtered ? '선택한 상태의 ' : ''}할 일 {monthCount}개</p></div>
        <div className="calendar-navigation">
          <button className="button secondary" onClick={() => onSelectDate(currentDate)}>오늘</button>
          <button className="icon-button" aria-label="이전 달" onClick={() => onSelectDate(shiftMonth(selectedDate, -1))}><ChevronLeft size={20} /></button>
          <button className="icon-button" aria-label="다음 달" onClick={() => onSelectDate(shiftMonth(selectedDate, 1))}><ChevronRight size={20} /></button>
        </div>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">{['일', '월', '화', '수', '목', '금', '토'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="calendar-month" role="group" aria-label={year + '년 ' + monthNumber + '월 날짜 선택'}>
        {weeks.map(week => {
          const bars = weekSegments(tasks, week[0]);
          const lanes = Math.max(1, ...bars.map(bar => bar.lane + 1));
          return <div className="calendar-week" key={week[0]}>
            <div className="calendar-week-days">
              {week.map(date => {
                const count = tasks.filter(task => overlaps(task, date, date)).length;
                const isToday = date === currentDate;
                return <div key={date}
                  className={['calendar-day', !date.startsWith(month) ? 'outside-month' : '', date === selectedDate ? 'selected' : '', isToday ? 'is-today' : ''].join(' ')}>
                  <button type="button" className="calendar-date-select"
                  aria-label={date + ', 할 일 ' + count + '개' + (isToday ? ', 오늘' : '')}
                  aria-pressed={date === selectedDate} aria-current={isToday ? 'date' : undefined}
                  onClick={() => onSelectDate(date)}>
                  <span className="calendar-day-number">{Number(date.slice(8))}</span>
                  </button>
                </div>;
              })}
            </div>
            <div className="calendar-week-bars" style={{ gridTemplateRows: '38px repeat(' + lanes + ', 27px) 12px' }}>
              {bars.map(bar => <button key={bar.task.id} type="button" disabled={busy}
                className={['calendar-range', bar.task.completed ? 'completed' : bar.task.due_date < currentDate ? 'overdue' : '', bar.continuesBefore ? 'continues-before' : '', bar.continuesAfter ? 'continues-after' : ''].join(' ')}
                style={{ gridColumn: bar.column + ' / span ' + bar.span, gridRow: bar.lane + 2 }}
                aria-label={bar.task.title + ', ' + taskPeriod(bar.task) + ', 수정'}
                title={bar.task.title + ' · ' + taskPeriod(bar.task)}
                onClick={() => onEdit(bar.task)}>
                {bar.continuesBefore && <span aria-hidden="true">‹ </span>}
                {bar.task.completed ? '✓ ' : ''}{bar.task.title}
                {bar.continuesAfter && <span aria-hidden="true"> ›</span>}
              </button>)}
            </div>
          </div>;
        })}
      </div>
      <div className="calendar-legend"><span><i />진행 중</span><span><i className="overdue" />기한 지남</span><span><i className="completed" />완료</span><p>날짜 선택: 상세 목록 · 막대 선택: 기간 수정</p></div>
    </section>
    <section className="panel calendar-agenda task-list" aria-label="선택한 날짜의 할 일">
      <div className="calendar-agenda-heading">
        <div><h2>{monthNumber}월 {dayNumber}일 할 일 <span className="count">{selectedTasks.length}</span></h2><p>{selectedDate === currentDate ? '오늘의 작은 준비를 시작해 보세요.' : '이 날짜에 필요한 준비를 확인해 보세요.'}</p></div>
        <button className="button secondary" disabled={busy} onClick={() => onAdd(selectedDate)}><Plus size={16} />이 날짜에 할 일 추가</button>
      </div>
      {selectedTasks.length ? selectedTasks.map(renderTask) : <div className="calendar-empty"><h3>{filtered ? '선택한 상태로 표시할 할 일이 없어요' : '등록된 할 일이 없어요'}</h3><p>{filtered ? '다른 상태를 선택하거나 새 할 일을 추가해 보세요.' : '위 버튼으로 이 날짜의 할 일을 추가해 보세요.'}</p></div>}
    </section>
  </div>;
}
