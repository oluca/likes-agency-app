import { NextResponse } from "next/server";
import { authorizeApi, deny, guardJob } from "@/lib/api-guard";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 512 * 1024;

/** POST stores the client-captured frame; GET returns a short-lived signed URL for it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardJob(id);
  if (denied) return denied;
  const auth = await authorizeApi();
  if (!auth.ok) return deny(auth.status, auth.detail);

  if (request.headers.get("content-type") !== "image/jpeg") return deny(415, "Nur JPEG erlaubt");
  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return deny(413, "Vorschaubild zu groß");

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("jobs")
    .select("id")
    .eq("upstream_job_id", id)
    .eq("workspace_id", auth.workspace.workspaceId)
    .single();
  if (!row) return deny(404, "Job nicht gefunden");

  const path = `${auth.workspace.workspaceId}/${row.id}.jpg`;
  const { error } = await supabase.storage.from("thumbnails").upload(path, body, { contentType: "image/jpeg", upsert: true });
  if (error) return deny(500, "Vorschaubild konnte nicht gespeichert werden");
  await supabase.from("jobs").update({ thumbnail_path: path }).eq("id", row.id);
  return NextResponse.json({ ok: true });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardJob(id);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: row } = await supabase.from("jobs").select("thumbnail_path").eq("upstream_job_id", id).single();
  if (!row?.thumbnail_path) return deny(404, "Kein Vorschaubild");
  const { data } = await supabase.storage.from("thumbnails").createSignedUrl(row.thumbnail_path, 300);
  if (!data) return deny(404, "Kein Vorschaubild");
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "cache-control": "private, max-age=240" } });
}
