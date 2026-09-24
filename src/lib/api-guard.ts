import "server-only";
import { NextResponse } from "next/server";
import { getActiveWorkspace, getUser, type Membership } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export function deny(status: number, detail: string) {
  return NextResponse.json({ detail }, { status });
}

export type ApiAuth =
  | { ok: true; userId: string; workspace: Membership }
  | { ok: false; status: 401 | 403; detail: string };

/** Authorization for route handlers (returns a result instead of redirecting). */
export async function authorizeApi(): Promise<ApiAuth> {
  const user = await getUser();
  if (!user) return { ok: false, status: 401, detail: "Nicht angemeldet" };
  const workspace = await getActiveWorkspace();
  if (!workspace) return { ok: false, status: 403, detail: "Kein Workspace verfügbar" };
  return { ok: true, userId: user.id, workspace };
}

/** Job ids are opaque tokens from the render service; reject anything that could alter the upstream path. */
const SAFE_JOB_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** Returns an error response unless the job belongs to the caller's active workspace, otherwise null. */
export async function guardJob(id: string): Promise<NextResponse | null> {
  const auth = await authorizeApi();
  if (!auth.ok) return deny(auth.status, auth.detail);
  if (!SAFE_JOB_ID.test(id)) return deny(404, "Job nicht gefunden");

  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id")
    .eq("upstream_job_id", id)
    .eq("workspace_id", auth.workspace.workspaceId)
    .maybeSingle();
  return data ? null : deny(404, "Job nicht gefunden");
}
