import type { CreateJobResponse, Job, JobStatus, Preset, RenderParams, SourceInfo } from "@/lib/types";
import { detailText, messageForStatus, NETWORK_ERROR_MESSAGE } from "@/lib/api-messages";

export class ApiError extends Error {
  /** HTTP status; 0 means the server could not be reached. */
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function errorFor(status: number, body: string): ApiError {
  let detail: string | undefined;
  try {
    detail = detailText(JSON.parse(body)?.detail);
  } catch {
    // not JSON
  }
  return new ApiError(status, messageForStatus(status, status === 422 ? detail : undefined));
}

async function request(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) throw errorFor(response.status, await response.text().catch(() => ""));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface CreateJobExtras {
  source?: Pick<SourceInfo, "duration_s" | "width" | "height">;
  title?: string;
  tags?: string[];
  parentJobId?: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** Uploads with XHR (fetch has no upload progress). The proxy streams the multipart body unchanged. */
export function createJob(file: File, params: RenderParams, extras: CreateJobExtras = {}): Promise<CreateJobResponse> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("params", JSON.stringify(params));

  // Metadata for our own database travels in a header so the multipart body can stay streamed untouched.
  const meta = {
    filename: file.name,
    size_bytes: file.size,
    ...extras.source,
    title: extras.title,
    tags: extras.tags,
    parent_job_id: extras.parentJobId,
    // free text (emphasis, prompt, fix, sticker) could exceed header limits and is not needed there
    params: { style: params.style, whisper_model: params.whisper_model, language: params.language },
  };

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/jobs");
    xhr.setRequestHeader("x-job-meta", encodeURIComponent(JSON.stringify(meta)));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) extras.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as CreateJobResponse);
        } catch {
          reject(new ApiError(502, messageForStatus(502)));
        }
      } else {
        reject(errorFor(xhr.status, xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, NETWORK_ERROR_MESSAGE));
    xhr.ontimeout = xhr.onerror;
    xhr.onabort = () => reject(new DOMException("Upload abgebrochen", "AbortError"));
    extras.signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(formData);
  });
}

export interface JobPatch {
  title?: string;
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
  deleted?: boolean;
  shared?: boolean;
}

export async function patchJob(id: string, patch: JobPatch): Promise<{ ok: true; share_token?: string | null }> {
  const response = await request(`/api/jobs/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  return handle(response);
}

export async function uploadThumbnail(id: string, blob: Blob): Promise<void> {
  const response = await request(`/api/jobs/${id}/thumbnail`, {
    method: "POST",
    headers: { "content-type": "image/jpeg" },
    body: blob,
  });
  await handle<unknown>(response);
}

export function thumbnailUrl(id: string): string {
  return `/api/jobs/${id}/thumbnail`;
}

export async function getPresets(): Promise<Preset[]> {
  const response = await request("/api/presets");
  return handle<Preset[]>(response);
}

export async function getJob(id: string): Promise<Job> {
  const response = await request(`/api/jobs/${id}`, { cache: "no-store" });
  return handle<Job>(response);
}

export async function getJobLog(id: string): Promise<{ log: string }> {
  const response = await request(`/api/jobs/${id}/log`, { cache: "no-store" });
  return handle<{ log: string }>(response);
}

export async function listJobs(status?: JobStatus): Promise<Job[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await request(`/api/jobs${query}`, { cache: "no-store" });
  return handle<Job[]>(response);
}

export async function cancelJob(id: string): Promise<{ canceled: boolean }> {
  const response = await request(`/api/jobs/${id}/cancel`, { method: "POST" });
  return handle<{ canceled: boolean }>(response);
}

export function downloadJobUrl(id: string): string {
  return `/api/jobs/${id}/download`;
}
