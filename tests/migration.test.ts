// Runs the real migration against an in-memory Postgres engine. No network or Supabase connection.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const userA = '00000000-0000-4000-a000-000000000001';
const userB = '00000000-0000-4000-a000-000000000002';
const publicPolicy = '00000000-0000-4000-b000-000000000001';
const privatePolicy = '00000000-0000-4000-b000-000000000002';
let db: PGlite;
async function asUser(id: string) {
  await db.exec('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  const sql = readFileSync(new URL('../supabase/migrations/202610030001_initial_schema.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.query('insert into auth.users (id) values ($1), ($2)', [userA, userB]);
  await db.query('insert into public.profiles (user_id, display_name) values ($1, $2), ($3, $4)', [userA, 'A', userB, 'B']);
  await db.query(`insert into public.policies (id,title,agency,category,source_name,source_url,policy_year,verified_at,is_published)
    values ($1,'공개 정책','기관','교육','공고','https://example.org/public',2026,'2026-10-03',true),
    ($2,'비공개 정책','기관','교육','공고','https://example.org/private',2026,null,false)`, [publicPolicy, privatePolicy]);
  await db.query("insert into public.tasks(user_id,title,due_date) values ($1,'A의 일정','2026-10-03'),($2,'B의 일정','2026-10-03')", [userA, userB]);
  await db.exec(readFileSync(new URL('../supabase/migrations/202610030002_task_periods.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../supabase/migrations/202610030003_education_roadmap.sql', import.meta.url), 'utf8'));
}, 60000);
beforeEach(async () => { await db.exec('begin'); });
afterEach(async () => { await db.exec('rollback'); });
afterAll(async () => { await db?.close(); });

describe('migration / 권한 및 관계', () => {
  it('기간 migration이 기존 일정을 하루짜리로 보존한다', async () => {
    await asUser(userA);
    expect((await db.query("select start_date::text, due_date::text from public.tasks")).rows).toEqual([{ start_date: '2026-10-03', due_date: '2026-10-03' }]);
  });
  it('기간 저장과 종료일 이전 시작일 제약을 적용한다', async () => {
    await asUser(userA);
    await db.query("insert into public.tasks(title,start_date,due_date) values('기간','2026-10-01','2026-11-05')");
    expect((await db.query("select title from public.tasks where start_date <= '2026-10-15' and due_date >= '2026-10-15'")).rows).toEqual([{ title: '기간' }]);
    await expect(db.query("insert into public.tasks(title,start_date,due_date) values('잘못된 기간','2026-11-05','2026-10-01')")).rejects.toThrow(/tasks_date_order/);
  });
  it('타인의 기간을 변경할 수 없다', async () => {
    await asUser(userA);
    expect((await db.query("update public.tasks set start_date='2026-10-01' where user_id=$1 returning id", [userB])).rows).toEqual([]);
  });
  it('모든 앱 테이블에 RLS가 켜져 있다', async () => {
    const result = await db.query<{ relname: string; relrowsecurity: boolean }>("select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'");
    expect(result.rows).toHaveLength(9);
    expect(result.rows.every(r => r.relrowsecurity)).toBe(true);
  });
  it('다른 사람의 프로필·일정은 조회되지 않는다', async () => {
    await asUser(userA);
    expect((await db.query('select display_name from public.profiles')).rows).toEqual([{ display_name: 'A' }]);
    expect((await db.query('select title from public.tasks')).rows).toEqual([{ title: 'A의 일정' }]);
  });
  it('자신의 데이터를 등록·수정·삭제할 수 있다', async () => {
    await asUser(userA);
    const result = await db.query<{ id: string }>("insert into public.tasks(title,due_date) values('새 일정','2026-10-04') returning id");
    const id = result.rows[0].id;
    await db.query('update public.tasks set completed=true where id=$1', [id]);
    expect((await db.query('select completed from public.tasks where id=$1', [id])).rows).toEqual([{ completed: true }]);
    await db.query('delete from public.tasks where id=$1', [id]);
    expect((await db.query('select id from public.tasks where id=$1', [id])).rows).toEqual([]);
  });
  it('다른 사람의 데이터 수정·삭제는 적용되지 않는다', async () => {
    await asUser(userA);
    expect((await db.query('update public.tasks set completed=true where user_id=$1 returning id', [userB])).rows).toHaveLength(0);
    expect((await db.query('delete from public.profiles where user_id=$1 returning user_id', [userB])).rows).toHaveLength(0);
  });
  it('user_id를 위조한 등록은 거절된다', async () => {
    await asUser(userA);
    await expect(db.query("insert into public.tasks(user_id,title,due_date) values($1,'위조','2026-10-03')", [userB])).rejects.toThrow(/row-level security/i);
  });
  it('기존 레코드 소유자를 다른 사용자로 바꾸지 못한다', async () => {
    await asUser(userA);
    await expect(db.query('update public.tasks set user_id=$1 where user_id=$2', [userB, userA])).rejects.toThrow(/row-level security/i);
  });
  it('공개 정책만 조회할 수 있다', async () => {
    await asUser(userA);
    expect((await db.query('select title from public.policies')).rows).toEqual([{ title: '공개 정책' }]);
  });
  it('클라이언트에서 정책 카탈로그를 수정하지 못한다', async () => {
    await asUser(userA);
    await expect(db.query("update public.policies set title='변조' where id=$1", [publicPolicy])).rejects.toThrow(/permission denied/i);
  });
  it('익명 사용자는 비공개 사용자 데이터에 접근하지 못한다', async () => {
    await db.exec('set local role anon');
    expect((await db.query('select id from public.policies')).rows).toHaveLength(1);
    await expect(db.query('select * from public.profiles')).rejects.toThrow(/permission denied/i);
  });
  it('비공개 정책을 관심 정책으로 등록하지 못한다', async () => {
    await asUser(userA);
    await expect(db.query('insert into public.saved_policies(policy_id) values($1)', [privatePolicy])).rejects.toThrow(/row-level security/i);
  });
  it('관심 정책은 중복 저장되지 않는다', async () => {
    await asUser(userA);
    await db.query('insert into public.saved_policies(policy_id) values($1)', [publicPolicy]);
    await expect(db.query('insert into public.saved_policies(policy_id) values($1)', [publicPolicy])).rejects.toThrow(/duplicate key/i);
  });
  it('확인일 없는 실제 정책은 공개할 수 없다', async () => {
    await expect(db.query('update public.policies set is_published=true where id=$1', [privatePolicy])).rejects.toThrow(/check constraint/i);
  });
  it('규칙 값의 타입을 검증한다', async () => {
    await expect(db.query("insert into public.policy_rules(policy_id,field,operator,value,label) values($1,'age','gte','\"18\"'::jsonb,'잘못된 나이 규칙')", [publicPolicy])).rejects.toThrow(/check constraint/i);
  });
  it('사용자 삭제 시 개인 기록이 정리된다', async () => {
    await db.query('delete from auth.users where id=$1', [userA]);
    expect((await db.query('select * from public.tasks where user_id=$1', [userA])).rows).toEqual([]);
    expect((await db.query('select * from public.profiles where user_id=$1', [userA])).rows).toEqual([]);
  });
});

describe('교육 로드맵 migration / 원자적 자동 수료', () => {
  async function createCourse(completed = false) {
    const result = await db.query<{ id: string }>(`insert into public.tasks(title,due_date,education_provider,education_hours,completed)
      values('귀농 교육','2026-10-31','농업교육포털',12.5,$1) returning id`, [completed]);
    return result.rows[0].id;
  }

  it('완료는 한국 날짜로 자동 기록되며 반복 저장에 중복이 없다', async () => {
    await asUser(userA);
    const id = await createCourse(true);
    const first = await db.query<{ id: string; correct_date: boolean }>(`select id, completed_date = (now() at time zone 'Asia/Seoul')::date as correct_date from public.education_records where task_id=$1`, [id]);
    expect(first.rows).toHaveLength(1);
    expect(first.rows[0].correct_date).toBe(true);
    await db.query('update public.tasks set completed=true where id=$1', [id]);
    expect((await db.query('select id from public.education_records where task_id=$1', [id])).rows).toEqual([{ id: first.rows[0].id }]);
  });

  it('수료일/시간/제목 변경은 자동 기록에 함께 반영된다', async () => {
    await asUser(userA);
    const id = await createCourse(true);
    await db.query("update public.tasks set title='변경 교육', education_hours=20.25, education_completed_date='2020-01-01', education_certificate=true where id=$1", [id]);
    await db.query('update public.tasks set education_completed_date=null where id=$1', [id]);
    expect((await db.query("select title,hours::text,completed_date::text,certificate from public.education_records where task_id=$1", [id])).rows).toEqual([{ title: '변경 교육', hours: '20.25', completed_date: '2020-01-01', certificate: true }]);
  });

  it('완료 취소/재완료/삭제는 수동 이력을 보존하며 연결 이력만 동기화한다', async () => {
    await asUser(userA);
    await db.query("insert into public.education_records(title,provider,hours,completed_date) values('수동','센터',4,'2020-01-01')");
    const id = await createCourse(true);
    await db.query('update public.tasks set completed=false where id=$1', [id]);
    expect((await db.query('select title from public.education_records')).rows).toEqual([{ title: '수동' }]);
    expect((await db.query('select education_completed_date from public.tasks where id=$1', [id])).rows).toEqual([{ education_completed_date: null }]);
    await db.query('update public.tasks set completed=true where id=$1', [id]);
    expect((await db.query('select task_id from public.education_records where task_id=$1', [id])).rows).toHaveLength(1);
    await db.query('delete from public.tasks where id=$1', [id]);
    expect((await db.query('select title from public.education_records')).rows).toEqual([{ title: '수동' }]);
  });

  it('교육 분류의 조사 항목은 완료해도 수료 기록을 생성하지 않는다', async () => {
    await asUser(userA);
    await db.query("insert into public.tasks(title,due_date,category,completed) values('교육기관 조사','2026-10-31','교육',true)");
    expect((await db.query('select id from public.education_records')).rows).toHaveLength(0);
  });

  it('직접 수료 기록 삭제도 일정 완료를 취소한다', async () => {
    await asUser(userA);
    const id = await createCourse(true);
    await db.query('delete from public.education_records where task_id=$1', [id]);
    expect((await db.query('select completed,education_completed_date from public.tasks where id=$1', [id])).rows).toEqual([{ completed: false, education_completed_date: null }]);
  });

  it('자동 수료 이력을 원본과 다르게 직접 수정하거나 연결 해제하지 못한다', async () => {
    await asUser(userA);
    const id = await createCourse(true);
    await db.exec('savepoint before_invalid');
    await expect(db.query('update public.education_records set hours=99 where task_id=$1', [id])).rejects.toThrow('일치해야');
    await db.exec('rollback to savepoint before_invalid');
    await expect(db.query('update public.education_records set task_id=null where task_id=$1', [id])).rejects.toThrow('연결');
  });

  it('타인의 교육 일정에는 수료 이력을 연결할 수 없다', async () => {
    await asUser(userB);
    const id = await createCourse(true);
    await asUser(userA);
    expect((await db.query('select id from public.education_records')).rows).toHaveLength(0);
    await expect(db.query(`insert into public.education_records(task_id,title,provider,hours,completed_date)
      values($1,'귀농 교육','농업교육포털',12.5,(now() at time zone 'Asia/Seoul')::date)`, [id])).rejects.toThrow('본인의');
  });

  it('수료 기록 쓰기가 실패하면 일정 완료도 같은 트랜잭션에서 취소된다', async () => {
    await db.exec('create policy test_reject_education on public.education_records as restrictive for insert to authenticated with check (false)');
    await asUser(userA);
    const id = await createCourse();
    await db.exec('savepoint before_complete');
    await expect(db.query('update public.tasks set completed=true where id=$1', [id])).rejects.toThrow(/row-level security/i);
    await db.exec('rollback to savepoint before_complete');
    expect((await db.query('select completed,education_completed_date from public.tasks where id=$1', [id])).rows).toEqual([{ completed: false, education_completed_date: null }]);
    expect((await db.query('select id from public.education_records')).rows).toHaveLength(0);
  });

  it('교육 기관/시간 불완전 입력 및 미래 수료일을 거부한다', async () => {
    await asUser(userA);
    await db.exec('savepoint before_invalid');
    await expect(db.query("insert into public.tasks(title,due_date,education_hours) values('잘못된 교육','2026-10-31',12)")).rejects.toThrow(/tasks_education_details/);
    await db.exec('rollback to savepoint before_invalid');
    await expect(db.query(`insert into public.tasks(title,due_date,education_provider,education_hours,completed,education_completed_date)
      values('미래 수료','2026-10-31','기관',12,true,(now() at time zone 'Asia/Seoul')::date+1)`)).rejects.toThrow('수료일');
  });

  it('사용자 삭제 cascade는 연결 수료 기록까지 제거한다', async () => {
    await db.query("insert into public.tasks(user_id,title,due_date,education_provider,education_hours,completed) values($1,'교육','2026-10-31','기관',12,true)", [userA]);
    await db.query('delete from auth.users where id=$1', [userA]);
    expect((await db.query('select id from public.education_records where user_id=$1', [userA])).rows).toHaveLength(0);
  });
});
