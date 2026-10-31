-- App IA: meetings, schedules, tasks, comments and per-user room state.

do $$
declare
  t text;
begin
  foreach t in array array['meetings', 'room_schedules', 'tasks', 'room_reads']
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

alter table public.meetings enable row level security;
alter table public.room_schedules enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.room_reads enable row level security;

drop policy if exists meetings_select on public.meetings;
create policy meetings_select on public.meetings
  for select to authenticated
  using (public.can_read_room(room_id));

drop policy if exists room_schedules_select on public.room_schedules;
create policy room_schedules_select on public.room_schedules
  for select to authenticated
  using (public.can_read_room(room_id));

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (public.can_read_room(room_id));

drop policy if exists task_comments_select on public.task_comments;
create policy task_comments_select on public.task_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.can_read_room(t.room_id)
    )
  );

drop policy if exists room_reads_select on public.room_reads;
create policy room_reads_select on public.room_reads
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists room_reads_insert on public.room_reads;
create policy room_reads_insert on public.room_reads
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_read_room(room_id));

drop policy if exists room_reads_update on public.room_reads;
create policy room_reads_update on public.room_reads
  for update to authenticated
  using (user_id = auth.uid() and public.can_read_room(room_id))
  with check (user_id = auth.uid() and public.can_read_room(room_id));

drop policy if exists room_reads_delete on public.room_reads;
create policy room_reads_delete on public.room_reads
  for delete to authenticated
  using (user_id = auth.uid());

grant select on public.meetings, public.room_schedules, public.tasks, public.task_comments
  to authenticated;
grant select, insert, update, delete on public.room_reads to authenticated;

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['meetings', 'tasks', 'task_comments']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;
