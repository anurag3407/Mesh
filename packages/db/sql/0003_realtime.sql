-- Realtime: postgres_changes for feed rows, plus authorization for private
-- broadcast/presence channels named room:<uuid>.

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['messages', 'tool_calls', 'canvases']
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

alter table public.messages replica identity full;

do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'grant select, insert on realtime.messages to authenticated';
    execute 'drop policy if exists mesh_room_read on realtime.messages';
    execute $p$
      create policy mesh_room_read on realtime.messages
        for select to authenticated
        using (
          realtime.topic() like 'room:%'
          and exists (
            select 1 from public.rooms r
            where 'room:' || r.id::text = realtime.topic()
              and public.can_read_room(r.id)
          )
        )
    $p$;
    execute 'drop policy if exists mesh_room_write on realtime.messages';
    execute $p$
      create policy mesh_room_write on realtime.messages
        for insert to authenticated
        with check (
          realtime.topic() like 'room:%'
          and exists (
            select 1 from public.rooms r
            where 'room:' || r.id::text = realtime.topic()
              and public.can_read_room(r.id)
          )
        )
    $p$;
  end if;
end;
$$;
