-- 0011_memory.sql
-- WS2: Sayabot Multi-Tier Team & Agent Memory (Personal, Room, Org)
-- NOTE: pgvector extension must be enabled on Supabase dashboard (human step).

-- 1. Create Memory Enums
do $$ begin
  create type public.memory_scope as enum ('agent', 'room', 'org');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.memory_kind as enum ('fact', 'preference', 'decision', 'procedure', 'episode');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.memory_source as enum ('agent', 'human', 'compaction', 'consolidation', 'import');
exception when duplicate_object then null; end $$;

-- 2. Create Memories Table
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  scope public.memory_scope not null default 'agent',
  agent_id uuid references public.agents(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  kind public.memory_kind not null default 'fact',
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  source public.memory_source not null default 'agent',
  source_ref text,
  confidence numeric(4,3) not null default 1.0,
  pinned boolean not null default false,
  expires_at timestamptz,
  superseded_by uuid references public.memories(id) on delete set null,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_by_agent_id uuid references public.agents(id) on delete set null,
  last_used_at timestamptz,
  use_count integer not null default 0,
  tsv tsvector generated always as (to_tsvector('english', title || ' ' || body)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Indexes
create index if not exists memories_tsv_idx on public.memories using gin (tsv);
create index if not exists memories_scope_idx on public.memories (org_id, scope, agent_id, room_id);
create index if not exists memories_pinned_idx on public.memories (org_id, pinned);
create index if not exists memories_last_used_idx on public.memories (org_id, last_used_at);

-- 4. Row Level Security
alter table public.memories enable row level security;

drop policy if exists "memories_select_policy" on public.memories;
create policy "memories_select_policy"
  on public.memories for select
  using (
    public.is_org_member(org_id)
    and (room_id is null or public.can_read_room(room_id))
  );

drop policy if exists "memories_insert_policy" on public.memories;
create policy "memories_insert_policy"
  on public.memories for insert
  with check (
    public.is_org_member(org_id)
    and (room_id is null or public.can_read_room(room_id))
  );

drop policy if exists "memories_update_policy" on public.memories;
create policy "memories_update_policy"
  on public.memories for update
  using (
    public.is_org_member(org_id)
    and (room_id is null or public.can_read_room(room_id))
  );

drop policy if exists "memories_delete_policy" on public.memories;
create policy "memories_delete_policy"
  on public.memories for delete
  using (
    public.is_org_member(org_id)
    and (room_id is null or public.can_read_room(room_id))
  );

-- 5. Grants
grant select, insert, update, delete on public.memories to authenticated;
grant all on public.memories to service_role;
