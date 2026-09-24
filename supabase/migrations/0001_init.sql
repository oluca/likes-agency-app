-- Multi-tenant schema: profiles, workspaces, members, invites, jobs (ownership map).
-- The render service stays the source of truth for job status, logs and files.

create extension if not exists pgcrypto;

create type public.workspace_role as enum ('member', 'admin', 'owner');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on public.workspace_members (user_id);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member' check (role <> 'owner'),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references auth.users (id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.workspace_invites (workspace_id);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  upstream_job_id text not null unique,
  filename text,
  params jsonb,
  created_at timestamptz not null default now()
);
create index on public.jobs (workspace_id, created_at desc);

-- Role check helper (security definer so RLS policies on members don't recurse).
create or replace function public.has_workspace_role(ws uuid, min_role public.workspace_role default 'member')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and m.role >= min_role
  );
$$;

-- New user -> profile + personal workspace + owner membership.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws_id uuid;
  label text := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, email, display_name) values (new.id, new.email, label);
  insert into public.workspaces (name, created_by) values (label || ' – Workspace', new.id) returning id into ws_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create an additional workspace for the calling user.
create or replace function public.create_workspace(workspace_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare ws_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.workspaces (name, created_by) values (workspace_name, auth.uid()) returning id into ws_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws_id, auth.uid(), 'owner');
  return ws_id;
end;
$$;

-- Accept an invite; the invite email must match the caller's email.
create or replace function public.accept_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare inv public.workspace_invites;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into inv from public.workspace_invites
    where token = invite_token and accepted_at is null and expires_at > now();
  if not found then raise exception 'invalid or expired invite'; end if;
  if lower(inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'invite was issued for a different email';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, auth.uid(), inv.role)
    on conflict (workspace_id, user_id) do nothing;
  update public.workspace_invites set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end;
$$;

-- Row level security
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.jobs enable row level security;

create policy "profiles: self or co-member read" on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.workspace_members a
      join public.workspace_members b on a.workspace_id = b.workspace_id
      where a.user_id = auth.uid() and b.user_id = profiles.id
    )
  );
create policy "profiles: self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "workspaces: member read" on public.workspaces for select to authenticated
  using (public.has_workspace_role(id));
create policy "workspaces: admin update" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, 'admin')) with check (public.has_workspace_role(id, 'admin'));

create policy "members: member read" on public.workspace_members for select to authenticated
  using (public.has_workspace_role(workspace_id));
create policy "members: admin remove or self leave" on public.workspace_members for delete to authenticated
  using ((public.has_workspace_role(workspace_id, 'admin') and role <> 'owner') or (user_id = auth.uid() and role <> 'owner'));
create policy "members: admin change role" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin') and role <> 'owner')
  with check (public.has_workspace_role(workspace_id, 'admin') and role <> 'owner');

create policy "invites: admin read" on public.workspace_invites for select to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));
create policy "invites: admin create" on public.workspace_invites for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin') and invited_by = auth.uid());
create policy "invites: admin delete" on public.workspace_invites for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

create policy "jobs: member read" on public.jobs for select to authenticated
  using (public.has_workspace_role(workspace_id));
create policy "jobs: member insert" on public.jobs for insert to authenticated
  with check (public.has_workspace_role(workspace_id) and created_by = auth.uid());

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
