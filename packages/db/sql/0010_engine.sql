-- 0010_engine.sql
-- Sayabot Engine v2: Durable runs, run steps, run transcripts, skills, and usage caching

-- 1. Enum update
do $$ begin
  alter type public.agent_run_status add value if not exists 'waiting';
exception when duplicate_object then null; end $$;

-- 2. agent_runs columns
alter table public.agent_runs
  add column if not exists finish_reason text,
  add column if not exists steps integer,
  add column if not exists engine text not null default 'v1',
  add column if not exists heartbeat_at timestamptz,
  add column if not exists parent_run_id uuid references public.agent_runs(id) on delete set null,
  add column if not exists waiting_reason text;

create index if not exists agent_runs_heartbeat_idx on public.agent_runs (status, heartbeat_at)
  where status = 'running';

-- 3. usage_events columns
alter table public.usage_events
  add column if not exists cached_input_tokens integer not null default 0,
  add column if not exists kind text not null default 'llm';

-- 4. run_steps table
create table if not exists public.run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  idx integer not null,
  kind text not null,
  input_ref text,
  output jsonb,
  usage jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create unique index if not exists run_steps_run_idx on public.run_steps (run_id, idx);
create index if not exists run_steps_run_id_idx on public.run_steps (run_id);

alter table public.run_steps enable row level security;

drop policy if exists "run_steps_select_policy" on public.run_steps;
create policy "run_steps_select_policy"
  on public.run_steps for select
  using (
    exists (
      select 1 from public.agent_runs ar
      join public.rooms r on r.id = ar.room_id
      where ar.id = run_steps.run_id
      and (
        r.kind = 'public' and exists (
          select 1 from public.org_members om where om.org_id = r.org_id and om.user_id = auth.uid()
        )
        or exists (
          select 1 from public.room_members rm where rm.room_id = r.id and rm.user_id = auth.uid()
        )
      )
    )
  );

-- 5. run_transcripts table
create table if not exists public.run_transcripts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.agent_runs(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  compacted_through_idx integer not null default 0,
  plan jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists run_transcripts_run_id_idx on public.run_transcripts (run_id);

alter table public.run_transcripts enable row level security;

drop policy if exists "run_transcripts_select_policy" on public.run_transcripts;
create policy "run_transcripts_select_policy"
  on public.run_transcripts for select
  using (
    exists (
      select 1 from public.agent_runs ar
      join public.rooms r on r.id = ar.room_id
      where ar.id = run_transcripts.run_id
      and (
        r.kind = 'public' and exists (
          select 1 from public.org_members om where om.org_id = r.org_id and om.user_id = auth.uid()
        )
        or exists (
          select 1 from public.room_members rm where rm.room_id = r.id and rm.user_id = auth.uid()
        )
      )
    )
  );

-- 6. skills table
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null,
  body text not null,
  files jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  visibility text not null default 'org',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists skills_org_slug_idx on public.skills (org_id, slug);
create index if not exists skills_org_idx on public.skills (org_id);

alter table public.skills enable row level security;

drop policy if exists "skills_select_policy" on public.skills;
create policy "skills_select_policy"
  on public.skills for select
  using (
    exists (
      select 1 from public.org_members om
      where om.org_id = skills.org_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "skills_admin_policy" on public.skills;
create policy "skills_admin_policy"
  on public.skills for all
  using (
    exists (
      select 1 from public.org_members om
      where om.org_id = skills.org_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
  );
