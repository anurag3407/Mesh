-- Board of Record: Task integrity, check-in discipline, and ask queue deduplication

-- 1. Extend tasks table
alter table public.tasks
  add column if not exists due_at timestamptz,
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists unblock_needs text check (unblock_needs is null or unblock_needs in ('human_answer', 'another_agent', 'credential', 'external_access', 'time', 'other')),
  add column if not exists unblock_detail text,
  add column if not exists blocked_by uuid[],
  add column if not exists outcome_kind text check (outcome_kind is null or outcome_kind in ('artifact', 'submission', 'external_change', 'decision', 'none', 'legacy')),
  add column if not exists outcome_ref text,
  add column if not exists fold_key text,
  add column if not exists asked_count integer not null default 1,
  add column if not exists expires_at timestamptz default (now() + interval '72 hours');

-- 2. Extend room_schedules
alter table public.room_schedules
  add column if not exists checkin_mode text not null default 'stream' check (checkin_mode in ('stream', 'digest')),
  add column if not exists digest_at integer;

-- 3. Extend agent_runs for cost attribution
alter table public.agent_runs
  add column if not exists task_id uuid references public.tasks(id) on delete set null;

create index if not exists agent_runs_task_idx on public.agent_runs (task_id);

-- 4. Extend agent_reads with last_reported_at for check-in classification
alter table public.agent_reads
  add column if not exists last_reported_at timestamptz;

-- 5. Create task_events table
create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_type text not null check (actor_type in ('human', 'agent', 'system')),
  actor_id uuid,
  from_status text,
  to_status text not null,
  reason text,
  outcome_kind text check (outcome_kind is null or outcome_kind in ('artifact', 'submission', 'external_change', 'decision', 'none', 'legacy')),
  outcome_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists task_events_task_idx on public.task_events (task_id, created_at);
create index if not exists task_events_to_status_idx on public.task_events (to_status, created_at);

-- 6. Trigger: tasks_enforce_integrity
create or replace function public.tasks_enforce_integrity()
returns trigger as $$
begin
  -- Title is immutable after creation
  if new.title <> old.title then
    raise exception 'title is immutable after creation';
  end if;

  -- Done requires completed_at and outcome_kind
  if new.status = 'done' and (new.completed_at is null or new.outcome_kind is null) then
    raise exception 'done tasks require completed_at and outcome_kind';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_enforce_integrity_trigger on public.tasks;
create trigger tasks_enforce_integrity_trigger
  before update on public.tasks
  for each row execute function public.tasks_enforce_integrity();

-- 7. RLS for task_events
alter table public.task_events enable row level security;

drop policy if exists task_events_select on public.task_events;
create policy task_events_select on public.task_events
  for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.can_read_room(t.room_id)
    )
  );

revoke insert, update, delete on public.task_events from anon, authenticated;
grant select on public.task_events to authenticated;

-- 8. Add task_events to realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_events'
    ) then
      alter publication supabase_realtime add table public.task_events;
    end if;
  end if;
end;
$$;

-- 9. Backfill legacy rows
update public.tasks
set status_changed_at = coalesce(status_changed_at, updated_at, now());

update public.tasks
set outcome_kind = 'legacy',
    completed_at = coalesce(completed_at, updated_at, now())
where status = 'done' and outcome_kind is null;
