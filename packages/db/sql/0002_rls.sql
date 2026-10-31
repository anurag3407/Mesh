-- Row level security for the hosted Supabase project.
-- Helpers are SECURITY DEFINER so policy checks do not recurse through RLS.

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_org_owner(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

create or replace function public.org_has_members(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m where m.org_id = p_org);
$$;

create or replace function public.shares_org_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.org_members mine
    join public.org_members theirs on theirs.org_id = mine.org_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user
  );
$$;

create or replace function public.is_room_member(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_read_room(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_room_member(p_room) or exists (
    select 1 from public.rooms r
    join public.org_members m on m.org_id = r.org_id
    where r.id = p_room and r.kind = 'public' and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_room_admin(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room and m.user_id = auth.uid() and m.role = 'admin'
  ) or exists (
    select 1 from public.rooms r
    join public.org_members m on m.org_id = r.org_id
    where r.id = p_room and m.user_id = auth.uid() and m.role in ('owner', 'admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.provider_keys enable row level security;
alter table public.agents enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_agents enable row level security;
alter table public.agent_api_keys enable row level security;
alter table public.org_tool_configs enable row level security;
alter table public.messages enable row level security;
alter table public.turn_sessions enable row level security;
alter table public.agent_runs enable row level security;
alter table public.canvases enable row level security;
alter table public.canvas_versions enable row level security;
alter table public.mcp_servers enable row level security;
alter table public.tool_calls enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.usage_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.model_pricing enable row level security;

-- Profiles -------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_org_with(id));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Identity / tenancy ---------------------------------------------------------
drop policy if exists orgs_select on public.orgs;
create policy orgs_select on public.orgs
  for select to authenticated
  using (public.is_org_member(id));

drop policy if exists org_members_select on public.org_members;
create policy org_members_select on public.org_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));

-- Agents ---------------------------------------------------------------------
drop policy if exists agents_select on public.agents;
create policy agents_select on public.agents
  for select to authenticated
  using (public.is_org_member(org_id));

-- Rooms ----------------------------------------------------------------------
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
  for select to authenticated
  using (public.can_read_room(id));

drop policy if exists room_members_select on public.room_members;
create policy room_members_select on public.room_members
  for select to authenticated
  using (public.can_read_room(room_id));

drop policy if exists room_agents_select on public.room_agents;
create policy room_agents_select on public.room_agents
  for select to authenticated
  using (public.can_read_room(room_id));

-- Messaging / orchestration --------------------------------------------------
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using (public.can_read_room(room_id));

drop policy if exists messages_insert_human on public.messages;
create policy messages_insert_human on public.messages
  for insert to authenticated
  with check (
    public.can_read_room(room_id)
    and sender_type = 'human'
    and sender_id = auth.uid()
    and status = 'complete'
  );

drop policy if exists turn_sessions_select on public.turn_sessions;
create policy turn_sessions_select on public.turn_sessions
  for select to authenticated
  using (public.can_read_room(room_id));

drop policy if exists agent_runs_select on public.agent_runs;
create policy agent_runs_select on public.agent_runs
  for select to authenticated
  using (public.can_read_room(room_id));

-- Canvas ---------------------------------------------------------------------
drop policy if exists canvases_select on public.canvases;
create policy canvases_select on public.canvases
  for select to authenticated
  using (public.can_read_room(room_id));

drop policy if exists canvas_versions_select on public.canvas_versions;
create policy canvas_versions_select on public.canvas_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.canvases c
      where c.id = canvas_id and public.can_read_room(c.room_id)
    )
  );

-- Tools ----------------------------------------------------------------------
drop policy if exists mcp_servers_select on public.mcp_servers;
create policy mcp_servers_select on public.mcp_servers
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists tool_calls_select on public.tool_calls;
create policy tool_calls_select on public.tool_calls
  for select to authenticated
  using (public.can_read_room(room_id));

-- Ops ------------------------------------------------------------------------
drop policy if exists webhook_deliveries_select on public.webhook_deliveries;
create policy webhook_deliveries_select on public.webhook_deliveries
  for select to authenticated
  using (public.is_org_admin(org_id));

drop policy if exists usage_events_select on public.usage_events;
create policy usage_events_select on public.usage_events
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (public.is_org_admin(org_id));

drop policy if exists model_pricing_select on public.model_pricing;
create policy model_pricing_select on public.model_pricing
  for select to authenticated
  using (true);

-- provider_keys, agent_api_keys and org_tool_configs intentionally have no
-- policies: ciphertext is only reachable through the service role.

-- Safe views -----------------------------------------------------------------
create or replace view public.provider_keys_public as
select id, org_id, owner_user_id, provider, base_url, label, last4, created_at
from public.provider_keys
where public.is_org_member(org_id);

create or replace view public.org_tool_configs_public as
select id, org_id, tool, enabled, updated_at
from public.org_tool_configs
where public.is_org_admin(org_id);

-- Grants ---------------------------------------------------------------------
grant select on public.profiles, public.orgs, public.org_members, public.agents,
  public.rooms, public.room_members, public.room_agents, public.messages,
  public.turn_sessions, public.agent_runs, public.canvases, public.canvas_versions,
  public.mcp_servers, public.tool_calls, public.webhook_deliveries, public.usage_events,
  public.audit_logs, public.model_pricing to authenticated;
grant insert on public.messages to authenticated;
grant select on public.provider_keys_public, public.org_tool_configs_public to authenticated;
revoke all on public.provider_keys, public.agent_api_keys, public.org_tool_configs
  from anon, authenticated;
revoke all on public.provider_keys, public.agent_api_keys, public.org_tool_configs
  from public;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
