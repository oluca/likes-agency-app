import { NextRequest, NextResponse } from "next/server";
import { renderApiHeaders, renderApiUrl } from "@/lib/render-api";
import { forwardJson } from "@/lib/forward";
import { authorizeApi, deny } from "@/lib/api-guard";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return deny(auth.status, auth.detail);

  const supabase = await createClient();
  const [owned, upstream] = await Promise.all([
    supabase.from("jobs").select("upstream_job_id").eq("workspace_id", auth.workspace.workspaceId),
    fetch(renderApiUrl(`/jobs${request.nextUrl.search}`), { headers: renderApiHeaders(), cache: "no-store" }),
  ]);
  if (owned.error) return deny(500, "Jobs konnten nicht geladen werden");
  if (!upstream.ok) return forwardJson(upstream);

  const ownedIds = new Set((owned.data ?? []).map((j) => j.upstream_job_id));
  const jobs = await upstream.json();
  const scoped = Array.isArray(jobs) ? jobs.filter((j: { id?: string }) => j.id && ownedIds.has(j.id)) : [];
  return NextResponse.json(scoped);
}

export async function POST(request: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return deny(auth.status, auth.detail);

  const contentType = request.headers.get("content-type");

  // The multipart body is streamed through untouched (no formData() parsing).
  const upstream = await fetch(renderApiUrl("/jobs"), {
    method: "POST",
    headers: renderApiHeaders(contentType ? { "content-type": contentType } : undefined),
    body: request.body,
    duplex: "half",
  } as RequestInit);
  if (!upstream.ok) return forwardJson(upstream);

  const created = await upstream.clone().json().catch(() => null);
  const jobId: unknown = created?.job_id;
  if (typeof jobId !== "string" || !(await trackJob(jobId, auth.workspace.workspaceId, auth.userId))) {
    if (typeof jobId === "string") await cancelUpstream(jobId);
    return deny(500, "Job konnte nicht gespeichert werden");
  }

  return forwardJson(upstream);
}

async function trackJob(jobId: string, workspaceId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .insert({ workspace_id: workspaceId, created_by: userId, upstream_job_id: jobId });
  return !error;
}

/** Don't leave an untracked (ownerless) job running upstream. */
async function cancelUpstream(jobId: string) {
  try {
    await fetch(renderApiUrl(`/jobs/${encodeURIComponent(jobId)}/cancel`), {
      method: "POST",
      headers: renderApiHeaders(),
    });
  } catch (err) {
    console.error(`Failed to cancel untracked upstream job ${jobId}:`, err);
  }
}
