import { NextResponse } from "next/server";
import { z } from "zod";
import { callUpstream } from "@/lib/render-api";
import { forwardJson } from "@/lib/forward";
import { authorizeApi, deny, guardJob } from "@/lib/api-guard";
import { createClient } from "@/lib/supabase/server";
import { META_SELECT, syncJob, toMeta, type MetaRow } from "@/lib/job-meta";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const denied = await guardJob(id);
  if (denied) return denied;
  const upstream = await callUpstream(`/jobs/${id}`);
  if (!upstream.ok) return forwardJson(upstream);

  const job = await upstream.json();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("jobs")
    .select(META_SELECT)
    .eq("upstream_job_id", id)
    .maybeSingle<MetaRow>();
  if (!row) return NextResponse.json(job);

  await syncJob(job, row.status);
  return NextResponse.json({ ...job, meta: toMeta(row) });
}

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    starred: z.boolean(),
    archived: z.boolean(),
    deleted: z.boolean(),
    shared: z.boolean(),
  })
  .partial()
  .strict();

/** Organisational edits (title, tags, star, archive, soft delete, sharing). RLS + column grants enforce access. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const denied = await guardJob(id);
  if (denied) return denied;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) return deny(422, "Ungültige Eingabe");
  const { title, tags, starred, archived, deleted, shared } = parsed.data;

  const auth = await authorizeApi();
  if (!auth.ok) return deny(auth.status, auth.detail);
  const supabase = await createClient();

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (tags !== undefined) update.tags = [...new Set(tags)];
  if (starred !== undefined) update.starred = starred;
  if (archived !== undefined) update.archived_at = archived ? now : null;
  if (deleted !== undefined) update.deleted_at = deleted ? now : null;

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from("jobs")
      .update(update)
      .eq("upstream_job_id", id)
      .eq("workspace_id", auth.workspace.workspaceId);
    if (error) return deny(500, "Änderung konnte nicht gespeichert werden");
  }

  let shareToken: string | null | undefined;
  if (shared !== undefined) {
    const { data: row } = await supabase.from("jobs").select("id").eq("upstream_job_id", id).single();
    if (!row) return deny(404, "Job nicht gefunden");
    const { data, error } = await supabase.rpc("set_job_sharing", { job: row.id, enabled: shared });
    if (error) return deny(500, "Freigabe konnte nicht geändert werden");
    shareToken = data as string | null;
  }

  return NextResponse.json({ ok: true, ...(shareToken !== undefined && { share_token: shareToken }) });
}
