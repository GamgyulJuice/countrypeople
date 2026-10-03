-- Run manually in the Supabase Dashboard SQL Editor, after 202610030002.
-- Existing education records stay manual; no course/time is inferred from task titles.
begin;

alter table public.tasks
  add column education_provider text,
  add column education_hours numeric(7,2),
  add column education_completed_date date,
  add column education_certificate boolean not null default false,
  add constraint tasks_id_owner_unique unique (id, user_id),
  add constraint tasks_education_details check (
    (education_provider is null and education_hours is null and education_completed_date is null and not education_certificate)
    or (education_provider is not null and length(btrim(education_provider)) > 0
        and education_hours is not null and education_hours > 0 and education_hours <= 10000
        and ((completed and education_completed_date is not null) or (not completed and education_completed_date is null)))
  );

alter table public.education_records
  add column task_id uuid,
  add constraint education_records_task_unique unique (task_id),
  add constraint education_records_task_owner_fk foreign key (task_id, user_id)
    references public.tasks(id, user_id) on delete cascade;

comment on column public.tasks.education_hours is 'Configured course hours only. Research/checklist tasks leave course metadata NULL.';
comment on column public.tasks.education_completed_date is 'Actual completion date in Korea civil time, independent of roadmap dates.';
comment on column public.education_records.task_id is 'NULL for manually entered history; otherwise the unique source task. Task completion and hours are synchronized atomically.';

create function public.normalize_task_education() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.education_provider := nullif(btrim(new.education_provider), '');
  if new.education_provider is not null and new.education_hours is not null then
    new.category := '교육';
    if new.completed then
      if new.education_completed_date is null then
        if tg_op = 'UPDATE' and old.completed and old.education_completed_date is not null then
          new.education_completed_date := old.education_completed_date;
        else
          new.education_completed_date := (now() at time zone 'Asia/Seoul')::date;
        end if;
      end if;
      if new.education_completed_date > (now() at time zone 'Asia/Seoul')::date then
        raise exception '수료일은 오늘 이후일 수 없습니다.' using errcode = '23514';
      end if;
    else
      new.education_completed_date := null;
    end if;
  else
    new.education_completed_date := null;
    new.education_certificate := false;
  end if;
  return new;
end;
$$;

create function public.sync_task_education() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.completed and new.education_provider is not null and new.education_hours is not null then
    insert into public.education_records(task_id, user_id, title, provider, hours, completed_date, certificate)
    values(new.id, new.user_id, new.title, new.education_provider, new.education_hours, new.education_completed_date, new.education_certificate)
    on conflict (task_id) do update set
      title = excluded.title, provider = excluded.provider, hours = excluded.hours,
      completed_date = excluded.completed_date, certificate = excluded.certificate;
  else
    delete from public.education_records where task_id = new.id and user_id = new.user_id;
  end if;
  return new;
end;
$$;

-- Prevent callers from detaching/reassigning an automatic record or making it
-- disagree with its source. App edits update the task; the task trigger updates this row.
create function public.check_education_task_link() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.task_id is not null and new.task_id is distinct from old.task_id then
    raise exception '자동 수료 기록의 연결은 교육 일정에서 변경해 주세요.' using errcode = '23514';
  end if;
  if new.task_id is not null and not exists (
    select 1 from public.tasks t where t.id = new.task_id and t.user_id = new.user_id
      and t.completed and t.title = new.title and t.education_provider = new.provider
      and t.education_hours = new.hours and t.education_completed_date = new.completed_date
      and t.education_certificate = new.certificate
  ) then
    raise exception '수료 기록은 본인의 완료된 교육 일정과 일치해야 합니다.' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Direct deletion also undoes the source completion. During task undo/cascade
-- there is no completed course to update, so this does not recurse.
create function public.undo_deleted_education_task() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.task_id is not null then
    update public.tasks set completed = false
    where id = old.task_id and user_id = old.user_id and completed
      and education_provider is not null and education_hours is not null;
  end if;
  return old;
end;
$$;

create trigger normalize_task_education before insert or update on public.tasks
  for each row execute function public.normalize_task_education();
create trigger sync_task_education after insert or update on public.tasks
  for each row execute function public.sync_task_education();
create trigger check_education_task_link before insert or update on public.education_records
  for each row execute function public.check_education_task_link();
create trigger undo_deleted_education_task after delete on public.education_records
  for each row execute function public.undo_deleted_education_task();

-- Trigger execution remains SECURITY INVOKER and uses the existing owner RLS.
-- No RPC or extra privileges are exposed to the browser.
revoke all on function public.normalize_task_education() from public, anon, authenticated;
revoke all on function public.sync_task_education() from public, anon, authenticated;
revoke all on function public.check_education_task_link() from public, anon, authenticated;
revoke all on function public.undo_deleted_education_task() from public, anon, authenticated;

commit;
