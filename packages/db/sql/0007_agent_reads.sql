-- Agent read cursors are written only by the orchestrator (service role).
-- RLS with no policies keeps them invisible to the authenticated role.
alter table public.agent_reads enable row level security;
revoke all on public.agent_reads from anon, authenticated;
