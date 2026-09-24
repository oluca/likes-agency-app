export type JobStatus = "queued" | "running" | "done" | "failed" | "canceled";

export type GpuMode = "auto" | "off" | "nvenc" | "qsv" | "amf" | "mf" | "videotoolbox";
export type WhisperModel = "tiny" | "base" | "small" | "medium" | "large";
export type Engine = "openai-whisper" | "faster-whisper";

export interface RenderParams {
  start?: number;
  end?: number;
  cut_silence?: boolean;
  silence_min_dur?: number;
  silence_keep?: number;
  zoom?: boolean;
  sfx?: boolean;
  auto_emphasis?: boolean;
  emphasis?: string;
  emphasis_strong?: string;
  whisper_model?: WhisperModel;
  language?: string;
  style?: string | null;
  gpu?: GpuMode;
  engine?: Engine;
}

export interface Job {
  id: string;
  status: JobStatus;
  params: RenderParams;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export const isActiveJob = (job: Job) => job.status === "queued" || job.status === "running";

export interface CreateJobResponse {
  job_id: string;
  status: "queued";
}

export const STYLE_PRESETS: { label: string; value: string }[] = [
  { label: "Standard-Look", value: "" },
  { label: "Maus Stack", value: "maus_stack" },
  { label: "Max Makros Mint", value: "max_makros_mint" },
];

export const WHISPER_MODELS: WhisperModel[] = ["tiny", "base", "small", "medium", "large"];

export const ENGINES: Engine[] = ["openai-whisper", "faster-whisper"];

export const GPU_MODES: GpuMode[] = ["auto", "off", "nvenc", "qsv", "amf", "mf", "videotoolbox"];
