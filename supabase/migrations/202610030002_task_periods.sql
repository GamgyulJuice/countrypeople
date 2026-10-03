-- Run manually in the Supabase Dashboard SQL Editor, after 202610030001.
-- No change to ownership, existing grants, RLS policies, or original due dates.
begin;

alter table public.tasks add column start_date date;
-- Preserve every existing task as a single-day task; never guess a duration.
update public.tasks set start_date = due_date where start_date is null;
-- NULL remains allowed for older clients; the UI interprets it as due_date.
alter table public.tasks add constraint tasks_date_order
  check (start_date is null or start_date <= due_date);
comment on column public.tasks.start_date is 'Inclusive start date. NULL means a legacy single-day task on due_date.';
comment on column public.tasks.due_date is 'Inclusive end date / deadline. Existing dates are preserved.';

commit;
