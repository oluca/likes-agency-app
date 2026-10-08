import { RESULT_TTL_HOURS, type Job, type JobStage } from "@/lib/types";

export const STAGE_LABEL: Record<JobStage, string> = {
  trimming: "Zuschneiden",
  silence: "Stille schneiden",
  transcribing: "Sprache erkennen",
  subtitles: "Untertitel bauen",
  zoom: "Zoom planen",
  rendering: "Video rendern",
  done: "Fertig",
};

/** `running` with no stage or 0 % can show up briefly before the first stage reports. */
export function runningLabel(job: Pick<Job, "stage" | "progress">): string {
  if (job.stage && job.stage !== "done") return STAGE_LABEL[job.stage];
  return "Wird gestartet";
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")} min` : `${s} s`;
}

const DATE_TIME = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** "Verfügbar bis ca. …" (finished_at + 72 h). */
export function availableUntil(finishedAt: string | null): string | null {
  if (!finishedAt) return null;
  const t = Date.parse(finishedAt);
  return Number.isNaN(t) ? null : DATE_TIME.format(new Date(t + RESULT_TTL_HOURS * 3600_000));
}

export function downloadFilename(job: Job): string {
  const base = (job.meta?.title || job.meta?.filename || "video").replace(/\.[^.]+$/, "");
  const safe = base.replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "video";
  return `${safe}_shortform.mp4`;
}

export function formatSize(bytes: number): string {
  return bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`;
}
