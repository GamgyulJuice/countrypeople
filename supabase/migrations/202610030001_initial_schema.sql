-- 시골로 MVP / Supabase Dashboard > SQL Editor에서 사용자가 직접 실행합니다.
-- 기존 테이블을 삭제하거나 덮어쓰지 않습니다. 새 프로젝트용 migration이며 한 번만 실행하세요.
-- 정책 자격 확정, 신청 접수, 외부 알림 발송은 수행하지 않습니다.
begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  display_name text not null default '' check (char_length(display_name) <= 80),
  birth_date date,
  purpose text not null default '탐색 중' check (purpose in ('귀농', '귀촌', '탐색 중')),
  current_region text not null default '',
  target_province text not null default '',
  target_district text not null default '',
  move_date date,
  moved boolean not null default false,
  stage text not null default '관심' check (stage in ('관심', '탐색', '계획', '준비', '실행', '초기 정착', '정착')),
  interest text not null default '',
  occupation text not null default '',
  urban_months integer check (urban_months >= 0 and urban_months <= 1500),
  independent_since date,
  household_head boolean,
  entity_status text not null default '',
  farmland_status text not null default '',
  income_band text not null default '',
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.profiles.income_band is '선택 입력. 정책별 소득 자격을 이 값만으로 확정하지 않습니다.';

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 240),
  summary text not null default '',
  agency text not null,
  region text not null default '전국',
  category text not null check (category in ('창업·자금', '정착지원', '주거·생활', '교육', '농지', '일자리', '기타')),
  benefit text not null default '',
  start_date date,
  end_date date,
  source_name text not null check (char_length(source_name) > 0),
  source_url text not null check (source_url ~ '^https://[^/[:space:]]+'),
  policy_year integer not null check (policy_year between 2000 and 2200),
  verified_at date,
  contact text not null default '',
  is_demo boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (not is_published or is_demo or verified_at is not null)
);
comment on column public.policies.region is '전국 또는 프로필과 동일한 시도 시군구 표기. 예: 전라남도 담양군';
comment on table public.policies is '관리자가 검증 후 Dashboard SQL로 등록하는 읽기 전용 정책 카탈로그. 신청 정보는 수집하지 않습니다.';

create table public.policy_rules (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies(id) on delete cascade,
  field text not null check (field in ('age', 'purpose', 'region', 'education_hours', 'urban_months', 'independent_years', 'household_head', 'entity_status', 'farmland_status', 'income_band', 'moved')),
  operator text not null check (operator in ('gte', 'lte', 'eq')),
  value jsonb not null,
  label text not null,
  guidance text not null default '',
  check (
    (field in ('age','education_hours','urban_months','independent_years') and jsonb_typeof(value) = 'number')
    or (field in ('household_head','moved') and jsonb_typeof(value) = 'boolean' and operator = 'eq')
    or (field in ('purpose','region','entity_status','farmland_status','income_band') and jsonb_typeof(value) = 'string' and operator = 'eq')
  )
);
comment on table public.policy_rules is 'AND 조건의 MVP 규칙. 복합 예외·소득 심사는 guidance로 명시하며 추가 확인이 필요합니다.';

create table public.policy_documents (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies(id) on delete cascade,
  title text not null,
  unique (policy_id, title)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  policy_id uuid references public.policies(id) on delete set null,
  title text not null check (char_length(title) between 1 and 240),
  due_date date not null,
  completed boolean not null default false,
  category text not null default '생활',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.education_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  provider text not null,
  hours numeric(7,2) not null check (hours > 0 and hours <= 10000),
  completed_date date not null,
  certificate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.education_records is '수료 기록. 정책별 인정 기관·유효기간·상한은 원문 확인이 필요합니다.';

create table public.saved_policies (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  policy_id uuid not null references public.policies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, policy_id)
);

create table public.document_checks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document_id uuid not null references public.policy_documents(id) on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, document_id)
);

create table public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  note text not null default '' check (char_length(note) <= 2000),
  completed_count integer not null check (completed_count >= 0),
  total_count integer not null check (total_count >= completed_count),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index policies_published_deadline_idx on public.policies (is_published, end_date);
create index policy_rules_policy_idx on public.policy_rules (policy_id);
create index tasks_user_due_idx on public.tasks (user_id, due_date);
create index tasks_policy_idx on public.tasks (policy_id);
create index education_user_date_idx on public.education_records (user_id, completed_date);
create index saved_policies_policy_idx on public.saved_policies (policy_id);
create index document_checks_document_idx on public.document_checks (document_id);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- Every private table is independently secured: no client-supplied owner is trusted.
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','tasks','education_records','saved_policies','document_checks','weekly_checkins'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name);
    execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
    execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name);
    if table_name <> 'saved_policies' then
      execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
    end if;
  end loop;
end;
$$;

alter table public.policies enable row level security;
alter table public.policy_rules enable row level security;
alter table public.policy_documents enable row level security;
revoke all on public.policies, public.policy_rules, public.policy_documents from anon, authenticated;
grant select on public.policies, public.policy_rules, public.policy_documents to anon, authenticated;
create policy published_policies on public.policies for select to anon, authenticated using (is_published = true);
create policy published_rules on public.policy_rules for select to anon, authenticated using (
  exists (select 1 from public.policies p where p.id = policy_id and p.is_published)
);
create policy published_documents on public.policy_documents for select to anon, authenticated using (
  exists (select 1 from public.policies p where p.id = policy_id and p.is_published)
);
create trigger set_updated_at before update on public.policies for each row execute function public.set_updated_at();

-- Restrictive policies combine with owner policies to prevent linking private/unpublished catalog rows.
create policy saved_published_only on public.saved_policies as restrictive for insert to authenticated
with check (exists (select 1 from public.policies p where p.id = policy_id and p.is_published));
create policy saved_published_update on public.saved_policies as restrictive for update to authenticated
with check (exists (select 1 from public.policies p where p.id = policy_id and p.is_published));
create policy document_published_only on public.document_checks as restrictive for insert to authenticated
with check (exists (select 1 from public.policy_documents d where d.id = document_id));
create policy document_published_update on public.document_checks as restrictive for update to authenticated
with check (exists (select 1 from public.policy_documents d where d.id = document_id));
create policy task_published_insert on public.tasks as restrictive for insert to authenticated
with check (policy_id is null or exists (select 1 from public.policies p where p.id = policy_id and p.is_published));
create policy task_published_update on public.tasks as restrictive for update to authenticated
with check (policy_id is null or exists (select 1 from public.policies p where p.id = policy_id and p.is_published));

commit;
