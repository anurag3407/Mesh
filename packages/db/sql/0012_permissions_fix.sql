-- 0012_permissions_fix.sql
-- Fix missing table grants and enforce room boundary on memories RLS

-- 1. Grant table permissions to authenticated and service_role
grant select, insert, update, delete on
  public.agent_templates,
  public.org_quotas,
  public.agent_computers,
  public.room_invites,
  public.run_steps,
  public.run_transcripts,
  public.skills,
  public.memories
to authenticated;

grant all on
  public.agent_templates,
  public.org_quotas,
  public.agent_computers,
  public.room_invites,
  public.run_steps,
  public.run_transcripts,
  public.skills,
  public.memories
to service_role;

-- 2. Memories RLS room access check
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
