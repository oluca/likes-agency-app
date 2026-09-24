-- Table privileges for the Data API role. RLS policies (0001) still decide which rows are visible;
-- without these grants every query fails with "permission denied for table ...".
grant usage on schema public to authenticated;

grant select, update on public.profiles to authenticated;
grant select, update on public.workspaces to authenticated;
grant select, update, delete on public.workspace_members to authenticated;
grant select, insert, delete on public.workspace_invites to authenticated;
grant select, insert on public.jobs to authenticated;

grant execute on function public.has_workspace_role(uuid, public.workspace_role) to authenticated;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.ensure_personal_workspace() to authenticated;
