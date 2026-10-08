import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { JobMeta, JobStatus } from "@/lib/types";

/** Columns exposed to the client as `Job.meta` (never includes system-internal fields like app_version). */
export const META_SELECT =
  "upstream_job_id, status, title, filename, tags, starred, archived_at, source_duration_s, source_size_bytes, source_width, source_height, output_duration_s, output_size_bytes, render_seconds, credits_charged, detected_language, thumbnail_path, expires_at, is_public, share_token, parent_job:parent_job_id(upstream_job_id)";

export interface MetaRow extends Omit<JobMeta, "parent_job_id"> {
  upstream_job_id: string;
  status: JobStatus;
  parent_job: { upstream_job_id: string } | null;
}
// toMeta passes upstream_job_id/status through harmlessly; the list/detail routes only read `meta` fields they need.

export function toMeta(row: MetaRow): JobMeta {
  const { parent_job, ...rest } = row;
  return { ...rest, parent_job_id: parent_job?.upstream_job_id ?? null };
}

/** Sent as the `x-job-meta` header (URI-encoded JSON) next to the streamed multipart upload. */
const createMetaSchema = z.object({
  filename: z.string().max(255),
  title: z.string().trim().min(1).max(200).optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  duration_s: z.number().nonnegative().max(86400).optional(),
  width: z.number().int().positive().max(16384).optional(),
  height: z.number().int().positive().max(16384).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  parent_job_id: z.string().max(128).optional(),
  params: z
    .object({
      whisper_model: z.string().max(40).optional(),
      engine: z.string().max(40).optional(),
      style: z.string().max(80).nullish(),
      gpu: z.string().max(40).optional(),
      language: z.string().max(20).optional(),
    })
    .passthrough()
    .optional(),
});

export type CreateMeta = z.infer<typeof createMetaSchema>;

export function parseCreateMeta(header: string | null): CreateMeta | null {
  if (!header) return null;
  try {
    const parsed = createMetaSchema.safeParse(JSON.parse(decodeURIComponent(header)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Columns for the insert; every field here is also covered by the column-level INSERT grant. */
export function insertColumns(meta: CreateMeta | null) {
  if (!meta) return {};
  return {
    filename: meta.filename,
    title: meta.title ?? (meta.filename.replace(/\.[^.]+$/, "").slice(0, 200) || null),
    params: meta.params ?? null,
  };
}

/** System columns written with the service role right after creation (client-measured, display only). */
export function systemColumnsAtCreate(meta: CreateMeta | null) {
  const p = meta?.params;
  return {
    source_duration_s: meta?.duration_s ?? null,
    source_size_bytes: meta?.size_bytes ?? null,
    source_width: meta?.width ?? null,
    source_height: meta?.height ?? null,
    whisper_model: p?.whisper_model ?? null,
    engine: p?.engine ?? null,
    style: p?.style ?? null,
    gpu_requested: p?.gpu ?? null,
    language: p?.language ?? null,
    tags: meta?.tags ?? [],
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };
}

/** Placeholder pricing: 1 credit per started minute of output (falls back to source), at least 1. Adjust to your plans. */
export function creditsFor(durationS: number | null | undefined) {
  return Math.max(1, Math.ceil((durationS ?? 0) / 60));
}

type Upstream = Record<string, unknown>;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/**
 * Mirrors the render service's job state into our table. Optional fields (durations, sizes, transcript, ...)
 * are only stored when the service reports them under these names; missing ones stay null.
 * Writes only when the status changed, so polling does not cause a write per request.
 */
export async function syncJob(upstream: Upstream, cachedStatus: JobStatus | undefined) {
  const id = str(upstream.id);
  const status = upstream.status as JobStatus | undefined;
  if (!id || !status || status === cachedStatus) return;
  const admin = createAdminClient();
  if (!admin) return;

  const startedAt = str(upstream.started_at);
  const finishedAt = str(upstream.finished_at);
  const outputDuration = num(upstream.output_duration_s);
  const renderSeconds =
    num(upstream.render_seconds) ??
    (startedAt && finishedAt ? Math.max(0, (Date.parse(finishedAt) - Date.parse(startedAt)) / 1000) : null);

  const { data: row, error } = await admin
    .from("jobs")
    .update({
      status,
      error: str(upstream.error),
      error_code: str(upstream.error_code),
      started_at: startedAt,
      finished_at: finishedAt,
      render_seconds: renderSeconds,
      output_duration_s: outputDuration,
      output_size_bytes: num(upstream.output_size_bytes),
      output_width: num(upstream.output_width),
      output_height: num(upstream.output_height),
      output_fps: num(upstream.output_fps),
      output_codec: str(upstream.output_codec),
      source_fps: num(upstream.source_fps),
      source_codec: str(upstream.source_codec),
      gpu_used: str(upstream.gpu_used),
      detected_language: str(upstream.detected_language),
      render_service_version: str(upstream.version),
      expires_at: str(upstream.expires_at),
    })
    .eq("upstream_job_id", id)
    .select("id, workspace_id, credits_charged, source_duration_s")
    .maybeSingle();
  if (error || !row) return;

  const transcript = upstream.transcript;
  if (transcript && typeof transcript === "object") {
    const text = str((transcript as { text?: unknown }).text);
    await admin.from("job_artifacts").upsert(
      { job_id: row.id, workspace_id: row.workspace_id, transcript, transcript_text: text, updated_at: new Date().toISOString() },
      { onConflict: "job_id" }
    );
  }

  if (status === "done" && row.credits_charged === 0) {
    const credits = creditsFor(outputDuration ?? row.source_duration_s);
    // The unique (job_id, kind) index makes this idempotent under concurrent polls.
    const { error: usageError } = await admin
      .from("usage_events")
      .insert({ workspace_id: row.workspace_id, job_id: row.id, kind: "render", credits, seconds: renderSeconds });
    if (!usageError) await admin.from("jobs").update({ credits_charged: credits }).eq("id", row.id);
  }
}
