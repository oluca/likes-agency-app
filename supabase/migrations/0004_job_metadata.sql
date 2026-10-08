-- Per-video metadata on jobs, heavy artifacts (transcript) in a side table, and a usage ledger.
--
-- Trust model:
--   * user-editable columns (title, tags, starred, archived_at, deleted_at, share) -> authenticated, column-level grants
--   * system columns (status, durations, sizes, billing, ...) -> written only by the server with the service role
-- Everything the render service owns (logs, files) stays there; these are cached/derived copies.

create type public.job_status as enum ('queued', 'running', 'done', 'failed', 'canceled');
create type public.usage_kind as enum ('render', 'refund', 'adjustment');

alter table public.jobs
  -- status cache (synced from the render service)
  add column status public.job_status not null default 'queued',
  add column error text,
  add column error_code text,
  add column started_at timestamptz,
  add column finished_at timestamptz,
  add column attempt int not null default 1 check (attempt >= 1),
  add column parent_job_id uuid references public.jobs (id) on delete set null,
  -- identity / organisation
  add column title text check (title is null or char_length(title) between 1 and 200),
  add column tags text[] not null default '{}',
  add column starred boolean not null default false,
  add column archived_at timestamptz,
  add column deleted_at timestamptz,
  -- source video
  add column source_duration_s numeric(10, 3) check (source_duration_s >= 0),
  add column source_size_bytes bigint check (source_size_bytes >= 0),
  add column source_width int,
  add column source_height int,
  add column source_fps numeric(6, 3),
  add column source_codec text,
  -- output video
  add column output_duration_s numeric(10, 3) check (output_duration_s >= 0),
  add column output_size_bytes bigint check (output_size_bytes >= 0),
  add column output_width int,
  add column output_height int,
  add column output_fps numeric(6, 3),
  add column output_codec text,
  add column output_path text,
  add column expires_at timestamptz,
  add column thumbnail_path text,
  -- request, promoted from params for filtering/grouping
  add column whisper_model text,
  add column engine text,
  add column style text,
  add column gpu_requested text,
  add column language text,
  -- execution / billing
  add column gpu_used text,
  add column render_seconds numeric(10, 3) check (render_seconds >= 0),
  add column credits_charged int not null default 0 check (credits_charged >= 0),
  add column render_service_version text,
  add column app_version text,
  -- speech
  add column detected_language text,
  -- sharing
  add column is_public boolean not null default false,
  add column share_token text unique;

create index on public.jobs (workspace_id, status);
create index on public.jobs (workspace_id, starred) where starred;
create index on public.jobs (workspace_id, archived_at);
create index on public.jobs (parent_job_id);
create index on public.jobs using gin (tags);
create index on public.jobs (error_code) where error_code is not null;

-- Heavy / optional data kept out of list queries (word-level transcript, render metrics, ...).
create table public.job_artifacts (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  transcript jsonb,
  transcript_text text,
  metrics jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.job_artifacts (workspace_id);
create index on public.job_artifacts using gin (to_tsvector('simple', coalesce(transcript_text, '')));

-- Usage ledger: one 'render' row per job at most, refunds/adjustments append.
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  kind public.usage_kind not null,
  credits int not null,
  seconds numeric(10, 3),
  note text,
  created_at timestamptz not null default now()
);
create index on public.usage_events (workspace_id, created_at desc);
create unique index usage_events_one_per_job_kind on public.usage_events (job_id, kind) where job_id is not null;

-- Row level security
alter table public.job_artifacts enable row level security;
alter table public.usage_events enable row level security;

create policy "artifacts: member read" on public.job_artifacts for select to authenticated
  using (public.has_workspace_role(workspace_id));
create policy "usage: member read" on public.usage_events for select to authenticated
  using (public.has_workspace_role(workspace_id));

-- Members may edit organisational columns of their workspace's jobs (everything else is service-role only).
create policy "jobs: member update" on public.jobs for update to authenticated
  using (public.has_workspace_role(workspace_id))
  with check (public.has_workspace_role(workspace_id));

-- The insert grant from 0003 covered every column; narrow it so clients cannot forge system columns.
revoke insert on public.jobs from authenticated;
grant insert (workspace_id, created_by, upstream_job_id, filename, params, title, parent_job_id)
  on public.jobs to authenticated;
grant update (title, tags, starred, archived_at, deleted_at, thumbnail_path)
  on public.jobs to authenticated;

grant select on public.job_artifacts to authenticated;
grant select on public.usage_events to authenticated;

-- Share links: members enable/disable sharing; the token is generated server side.
create or replace function public.set_job_sharing(job uuid, enabled boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  tok text;
begin
  select workspace_id, share_token into ws, tok from public.jobs where id = job;
  if ws is null or not public.has_workspace_role(ws) then raise exception 'job not found'; end if;
  if enabled and tok is null then tok := encode(gen_random_bytes(18), 'hex'); end if;
  update public.jobs set is_public = enabled, share_token = tok where id = job;
  return case when enabled then tok else null end;
end;
$$;
revoke execute on function public.set_job_sharing(uuid, boolean) from public, anon;
grant execute on function public.set_job_sharing(uuid, boolean) to authenticated;

-- Thumbnails: private bucket, objects stored under "<workspace_id>/<job_uuid>.jpg".
insert into storage.buckets (id, name, public) values ('thumbnails', 'thumbnails', false)
  on conflict (id) do nothing;

create policy "thumbnails: member read" on storage.objects for select to authenticated
  using (bucket_id = 'thumbnails' and public.has_workspace_role(((storage.foldername(name))[1])::uuid));
create policy "thumbnails: member write" on storage.objects for insert to authenticated
  with check (bucket_id = 'thumbnails' and public.has_workspace_role(((storage.foldername(name))[1])::uuid));
create policy "thumbnails: member update" on storage.objects for update to authenticated
  using (bucket_id = 'thumbnails' and public.has_workspace_role(((storage.foldername(name))[1])::uuid));
