import { NextRequest, NextResponse } from "next/server";
import { callUpstream, maxUploadBytes } from "@/lib/render-api";
import { forwardJson } from "@/lib/forward";
import { authorizeApi, deny } from "@/lib/api-guard";
import { allow } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  META_SELECT,
  insertColumns,
  parseCreateMeta,
  syncJob,
  systemColumnsAtCreate,
  toMeta,
  type CreateMeta,
  type MetaRow,
} from "@/lib/job-meta";

const UPLOADS_PER_HOUR = Number(process.env.UPLOADS_PER_HOUR) || 10;

export async function GET(request: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return deny(auth.status, auth.detail);

  const supabase = await createClient();
  const [owned, upstream] = await Promise.all([
    supabase
      .from("jobs")
      .select(META_SELECT)
      .eq("workspace_id", auth.workspace.workspaceId)
      .is("deleted_at", null)
      .returns<MetaRow[]>(),
    callUpstream(`/jobs${request.nextUrl.search}`),
  ]);
  if (owned.error) return deny(500, "Jobs konnten nicht geladen werden");
  if (!upstream.ok) return forwardJson(upstream);

  const rows = new Map((owned.data ?? []).map((r) => [r.upstream_job_id, r]));
  const jobs = await upstream.json();
  const scoped = (Array.isArray(jobs) ? jobs : []).filter((j: { id?: string }) => j.id && rows.has(j.id));

  await Promise.all(scoped.map((j: { id: string; status: never }) => syncJob(j, rows.get(j.id)!.status)));

  return NextResponse.json(scoped.map((j: { id: string }) => ({ ...j, meta: toMeta(rows.get(j.id)!) })));
}

export async function POST(request: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return deny(auth.status, auth.detail);

  const declared = Number(request.headers.get("content-length"));
  // Small allowance for multipart framing and the params field.
  if (Number.isFinite(declared) && declared > maxUploadBytes() + 1024 * 1024) {
    return deny(413, "Datei zu groß");
  }
  if (!allow(`upload:${auth.userId}`, UPLOADS_PER_HOUR, 60 * 60 * 1000)) {
    return deny(429, "Zu viele Uploads in der letzten Stunde");
  }

  const contentType = request.headers.get("content-type");
  const meta = parseCreateMeta(request.headers.get("x-job-meta"));

  // The multipart body is streamed through untouched (no formData() parsing).
  const upstream = await callUpstream("/jobs", {
    method: "POST",
    headers: contentType ? { "content-type": contentType } : undefined,
    body: request.body,
    duplex: "half",
  });
  if (!upstream.ok) return forwardJson(upstream);

  const created = await upstream.clone().json().catch(() => null);
  const jobId: unknown = created?.job_id;
  if (typeof jobId !== "string" || !(await trackJob(jobId, auth.workspace.workspaceId, auth.userId, meta))) {
    if (typeof jobId === "string") await cancelUpstream(jobId);
    return deny(500, "Job konnte nicht gespeichert werden");
  }

  return forwardJson(upstream);
}

async function trackJob(jobId: string, workspaceId: string, userId: string, meta: CreateMeta | null) {
  const supabase = await createClient();

  let parentId: string | null = null;
  if (meta?.parent_job_id) {
    const { data } = await supabase
      .from("jobs")
      .select("id")
      .eq("upstream_job_id", meta.parent_job_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    parentId = data?.id ?? null;
  }

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      upstream_job_id: jobId,
      parent_job_id: parentId,
      ...insertColumns(meta),
    })
    .select("id")
    .single();
  if (error) return false;

  // System-owned columns; failure here must not fail the render, the row is already tracked.
  const admin = createAdminClient();
  if (admin) {
    let attempt = 1;
    if (parentId) {
      const { data: parent } = await admin.from("jobs").select("attempt").eq("id", parentId).maybeSingle();
      attempt = (parent?.attempt ?? 0) + 1;
    }
    const { error: sysError } = await admin
      .from("jobs")
      .update({ ...systemColumnsAtCreate(meta), attempt })
      .eq("id", data.id);
    if (sysError) console.error(`Failed to store metadata for job ${jobId}:`, sysError.message);
  }
  return true;
}

/** Don't leave an untracked (ownerless) job running upstream. */
async function cancelUpstream(jobId: string) {
  try {
    await callUpstream(`/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST" });
  } catch (err) {
    console.error(`Failed to cancel untracked upstream job ${jobId}:`, err);
  }
}
