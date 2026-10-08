export type JobStatus = "queued" | "running" | "done" | "failed" | "canceled" | "expired";

export type JobStage = "trimming" | "silence" | "transcribing" | "subtitles" | "zoom" | "rendering" | "done";
export type WhisperModel = "tiny" | "base" | "small" | "medium";

/** Only fields of the API contract; unknown fields must never be sent (the API answers 422). */
export interface RenderParams {
  style?: string;
  emphasis?: string;
  emphasis_strong?: string;
  auto_emphasis?: boolean;
  cut_silence?: boolean;
  zoom?: boolean;
  sfx?: boolean;
  start?: number;
  end?: number;
  sticker?: string;
  sticker_duration?: number;
  language?: string;
  whisper_model?: WhisperModel;
  prompt?: string;
  fix?: string;
}

export interface PresetSupports {
  emphasis: boolean;
  auto_emphasis: boolean;
  zoom: boolean;
  sfx: boolean;
  sticker: boolean;
  cut_silence: boolean;
}

export interface Preset {
  name: string;
  label: string;
  description: string;
  layout_mode: string;
  supports: PresetSupports;
  notes: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  stage: JobStage | null;
  /** 0-100, null while queued. Intentionally coarse. */
  progress: number | null;
  /** Only on GET /jobs/{id}, only while queued (1 = next). */
  queue_position?: number | null;
  params: RenderParams;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  /** Added by our API from the jobs table; absent only if the row could not be read. */
  meta?: JobMeta;
}

/** Per-video metadata stored in our database (jobs table), merged into the render service's job. */
export interface JobMeta {
  title: string | null;
  filename: string | null;
  tags: string[];
  starred: boolean;
  archived_at: string | null;
  source_duration_s: number | null;
  source_size_bytes: number | null;
  source_width: number | null;
  source_height: number | null;
  output_duration_s: number | null;
  output_size_bytes: number | null;
  render_seconds: number | null;
  credits_charged: number;
  detected_language: string | null;
  thumbnail_path: string | null;
  expires_at: string | null;
  parent_job_id: string | null;
  is_public: boolean;
  share_token: string | null;
}

/** Client-measured facts about the source file, sent with job creation (display only, never used for billing). */
export interface SourceInfo {
  filename: string;
  size_bytes: number;
  duration_s?: number;
  width?: number;
  height?: number;
}

export const isFinalStatus = (status: JobStatus) =>
  status === "done" || status === "failed" || status === "canceled" || status === "expired";

export const isActiveJob = (job: Job) => job.status === "queued" || job.status === "running";

export interface CreateJobResponse {
  job_id: string;
  status: "queued";
}

export const WHISPER_MODELS: { value: WhisperModel; label: string }[] = [
  { value: "tiny", label: "Tiny (am schnellsten)" },
  { value: "base", label: "Base" },
  { value: "small", label: "Small (Standard)" },
  { value: "medium", label: "Medium (am genauesten, langsam)" },
];

/** Results are deleted about 72 h after the job finished. */
export const RESULT_TTL_HOURS = 72;
