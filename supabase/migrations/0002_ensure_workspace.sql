-- Self-heal for users created before 0001 (or whose signup trigger failed):
-- create the missing profile and a personal workspace on first visit.
create or replace function public.ensure_personal_workspace()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ws_id uuid;
  label text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select coalesce(nullif(raw_user_meta_data ->> 'display_name', ''), split_part(email, '@', 1))
    into label from auth.users where id = uid;

  insert into public.profiles (id, email, display_name)
    select id, email, label from auth.users where id = uid
    on conflict (id) do nothing;

  select workspace_id into ws_id from public.workspace_members where user_id = uid limit 1;
  if ws_id is not null then return ws_id; end if;

  insert into public.workspaces (name, created_by) values (label || ' – Workspace', uid) returning id into ws_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws_id, uid, 'owner');
  return ws_id;
end;
$$;

revoke execute on function public.ensure_personal_workspace() from public, anon;
grant execute on function public.ensure_personal_workspace() to authenticated;
