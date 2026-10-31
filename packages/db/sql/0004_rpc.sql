-- Called by the web approval action. Only the service role may execute it.
create or replace function public.notify_tool_resolution(p_tool_call uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid tool status %', p_status;
  end if;
  perform pg_notify(
    'tool_call_resolved',
    json_build_object('toolCallId', p_tool_call, 'status', p_status)::text
  );
end;
$$;

revoke all on function public.notify_tool_resolution(uuid, text) from public, anon, authenticated;
grant execute on function public.notify_tool_resolution(uuid, text) to service_role;
